import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { buildModel, disposeModel, HIGHLIGHT_COLOR } from '@/lib/bim/buildModel'

/**
 * The Three.js half of the viewer, as a plain class with no React in it.
 *
 * WHY IT IS NOT A COMPONENT. A scene, a renderer, a camera and an animation
 * loop are long-lived mutable objects; React's job is to say WHAT should be
 * shown, not to own them. Keeping them here means the component is a dozen
 * lines of lifecycle instead of two hundred lines of imperative code fighting
 * the rules of hooks — and it is also what lets the component satisfy
 * `react-hooks/immutability`, which correctly objects to a component reaching
 * into a ref and mutating a scene graph it captured in an earlier effect.
 *
 * The component calls methods. This file does the mutating.
 */

// Where each preset puts the camera, as a direction from the model's centre.
// Scaled by the model's own size at apply time, so a 6 m house and a 60 m
// warehouse both fill the frame.
const VIEW_DIRECTIONS = {
  iso: new THREE.Vector3(1, 0.85, 1),
  // Never exactly vertical: a straight-down direction is parallel to the
  // camera's up vector, which gimbal-locks OrbitControls and leaves the user
  // unable to orbit back out of the top view.
  top: new THREE.Vector3(0, 1, 0.0001),
  front: new THREE.Vector3(0, 0.12, 1),
}

// Breathing room once the model is exactly framed. The framing itself is
// computed, not guessed — see `applyView` — so this only has to be above 1.
const FIT_MARGIN = 1.08

const BACKGROUND = 0xf4f6f8

export class ModelScene {
  constructor(mount) {
    this.mount = mount
    this.model = null
    this.meshesByElement = new Map()
    this.disposed = false

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUND)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    // Stops the camera dropping below the slab, where the model is a dark
    // underside and there is no way to tell which way is up.
    this.controls.maxPolarAngle = Math.PI * 0.495

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3ad, 2.1))
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(1, 2, 1.5)
    this.scene.add(sun)

    this.raycaster = new THREE.Raycaster()

    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(mount)

    const tick = () => {
      if (this.disposed) return
      this.frame = requestAnimationFrame(tick)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  resize() {
    const { clientWidth, clientHeight } = this.mount
    if (!clientWidth || !clientHeight) return
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight, false)

    // Re-frame ONCE, if the model was framed before the canvas had a size.
    // Doing it on every resize would throw away the user's zoom and orbit
    // every time the window changed width.
    if (this.model && !this.framedAtRealSize) this.applyView(this.lastPreset ?? 'iso')
  }

  /** Replace the model. Frames it from ISO, because it is a different building. */
  setPlan(plan, flagged) {
    if (this.model) {
      this.scene.remove(this.model)
      disposeModel(this.model)
      this.model = null
      this.meshesByElement = new Map()
    }
    if (!plan) return

    const { root } = buildModel(plan, { flagged: flagged ?? new Set() })
    this.model = root
    this.scene.add(root)
    this.framedAtRealSize = false

    // One element can own several meshes — a wall split around its openings —
    // so selection and visibility work through this index rather than by
    // walking the scene graph on every change.
    const index = new Map()
    root.traverse((child) => {
      const element = child.userData?.element
      if (!child.isMesh || !element) return
      if (!index.has(element.id)) index.set(element.id, [])
      index.get(element.id).push(child)
    })
    this.meshesByElement = index

    this.applyView('iso')
  }

  setSelection(selectedId) {
    for (const [id, meshes] of this.meshesByElement) {
      const isSelected = id === selectedId
      for (const mesh of meshes) {
        // Emissive rather than a colour swap: the element keeps whatever colour
        // its type or its grader flag gave it, and the highlight lifts off it.
        mesh.material.emissive?.setHex(isSelected ? HIGHLIGHT_COLOR : 0x000000)
        if (mesh.material.emissiveIntensity !== undefined) {
          mesh.material.emissiveIntensity = isSelected ? 0.55 : 0
        }
      }
    }
  }

  /**
   * Apply what is hidden and what is isolated.
   *
   * Isolate wins over hide: an isolation is an explicit "show me only these",
   * and honouring a stale hide inside it would show fewer elements than the
   * user just asked for.
   */
  setVisibility({ hidden, isolated }) {
    const hiddenSet = hidden ?? new Set()
    for (const [id, meshes] of this.meshesByElement) {
      const visible = isolated ? isolated.has(id) : !hiddenSet.has(id)
      for (const mesh of meshes) mesh.visible = visible
    }
  }

  /**
   * How far back the camera must sit for the whole model to fit the frame.
   *
   * Every corner of the bounding box is projected onto the camera's own axes
   * and asked how far away it needs the camera to be; the answer is the largest
   * of those. Fitting the bounding SPHERE instead is a line shorter and always
   * too far back — a 20 x 20 m plan has a 28 m diagonal, so a top view framed
   * to the sphere shows 28 m of empty floor around a 20 m building.
   *
   * The tighter of the two half-angles is used per axis, so this is correct on
   * a wide canvas and on a tall one.
   */
  distanceToFrame(bounds, centre, direction) {
    const halfFovV = THREE.MathUtils.degToRad(this.camera.fov) / 2
    const halfFovH = Math.atan(Math.tan(halfFovV) * Math.max(this.camera.aspect, 0.01))

    // Camera basis for this direction. `direction` points from the model to the
    // camera, so the view runs along its negation.
    const right = new THREE.Vector3()
      .crossVectors(direction, this.camera.up)
      .normalize()
    if (right.lengthSq() < 1e-9) right.set(1, 0, 0)
    const up = new THREE.Vector3().crossVectors(right, direction).normalize()

    const corner = new THREE.Vector3()
    let required = 0
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corner.set(x, y, z).sub(centre)
          // Depth this corner already sits at, plus the distance its lateral
          // offset needs in each axis.
          const depth = corner.dot(direction)
          required = Math.max(
            required,
            Math.abs(corner.dot(up)) / Math.tan(halfFovV) + depth,
            Math.abs(corner.dot(right)) / Math.tan(halfFovH) + depth,
          )
        }
      }
    }
    return Math.max(required * FIT_MARGIN, 1)
  }

  /**
   * Move the camera. `fit` re-frames from wherever the user has orbited to;
   * every other preset is a viewpoint and moves there.
   */
  applyView(preset) {
    if (!this.model) return

    const bounds = new THREE.Box3().setFromObject(this.model)
    if (bounds.isEmpty()) return

    const centre = bounds.getCenter(new THREE.Vector3())

    const direction =
      preset === 'fit'
        ? this.camera.position.clone().sub(this.controls.target)
        : (VIEW_DIRECTIONS[preset] ?? VIEW_DIRECTIONS.iso).clone()
    if (direction.lengthSq() < 1e-9) direction.copy(VIEW_DIRECTIONS.iso)
    direction.normalize()

    const distance = this.distanceToFrame(bounds, centre, direction)

    this.camera.position.copy(centre).addScaledVector(direction, distance)
    // Near and far are re-derived from the model's size: fixed planes clip a
    // 60 m warehouse and z-fight on a 6 m room.
    this.camera.near = Math.max(distance / 500, 0.05)
    this.camera.far = distance * 20
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(centre)
    this.controls.update()

    this.lastPreset = preset
    // Framing depends on `camera.aspect`, which is only right once the canvas
    // has a real size. React mounts the element before layout, so the first
    // framing can happen against the placeholder 1:1 — `resize` re-frames once
    // when that is the case. See the flag's use there.
    this.framedAtRealSize = this.mount.clientWidth > 0 && this.mount.clientHeight > 0
  }

  /** The element under a pointer event, or null. Hidden meshes are not picked. */
  elementAt(clientX, clientY) {
    if (!this.model) return null

    const rect = this.mount.getBoundingClientRect()
    if (!rect.width || !rect.height) return null

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    // Recursive: the model is a flat group today, and nesting it later must not
    // silently stop picking from working.
    const hits = this.raycaster.intersectObjects(this.model.children, true)
    return hits.find((hit) => hit.object.visible)?.object?.userData?.element ?? null
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.observer?.disconnect()
    this.controls.dispose()
    disposeModel(this.model)
    this.renderer.dispose()
    const canvas = this.renderer.domElement
    if (canvas.parentNode === this.mount) this.mount.removeChild(canvas)
  }
}
