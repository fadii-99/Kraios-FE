import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

import {
  buildScene,
  disposeScene,
  EDGE_COLOUR,
  GROUND_COLOUR,
  REVIEW_COLOUR,
  SELECTION_COLOUR,
  toPlan,
} from '@/lib/experiments/floorplan3d/buildScene'

/**
 * The Three.js half of the workspace, as a plain class with no React in it.
 *
 * WHY IT IS NOT A COMPONENT. A scene, a renderer, two cameras, a gizmo and an
 * animation loop are long-lived mutable objects; React's job is to say WHAT
 * should be shown, not to own them. Keeping them here means the component is a
 * dozen lines of lifecycle instead of two hundred lines of imperative code
 * fighting the rules of hooks — and it is what lets the component satisfy
 * `react-hooks/immutability`, which correctly objects to a component reaching
 * into a ref and mutating a scene graph it captured in an earlier effect.
 *
 * The component calls methods. This file does the mutating.
 *
 * A GIZMO DRAG IS NOT AN ARCHITECTURAL EDIT
 * -----------------------------------------
 * `TransformControls` moves a Three.js object, and a moved object is not a
 * changed building — the model is. So the gizmo is allowed on furniture and
 * fixtures ONLY, its drag is constrained to the ground plane, and what it
 * emits on release is a SEMANTIC position in model coordinates, which the
 * workspace turns into a `move_furniture` command. Nothing here writes to the
 * document, and a drag that is never released changes nothing.
 *
 * Walls, openings and structure are deliberately NOT draggable in 3D: moving a
 * wall means moving the corners it shares, the rooms that use them and the
 * openings it hosts, and a gizmo cannot express that. The 2D plan does it,
 * where a corner is a corner.
 */

// Where each preset puts the camera, as a direction from the model's centre.
// Scaled by the model's own size at apply time, so a 6 m house and a 60 m
// warehouse both fill the frame.
const VIEW_DIRECTIONS = {
  iso: new THREE.Vector3(1, 0.8, 1),
  // Never exactly vertical: a straight-down direction is parallel to the
  // camera's up vector, which gimbal-locks OrbitControls and leaves the user
  // unable to orbit back out of the top view.
  top: new THREE.Vector3(0, 1, 0.0001),
  front: new THREE.Vector3(0, 0.12, 1),
  back: new THREE.Vector3(0, 0.12, -1),
  left: new THREE.Vector3(-1, 0.12, 0),
  right: new THREE.Vector3(1, 0.12, 0),
}

export const VIEW_PRESETS = ['iso', 'top', 'front', 'back', 'left', 'right', 'fit']

// Breathing room once the model is exactly framed. The framing itself is
// computed, not guessed — see `applyView` — so this only has to be above 1.
const FIT_MARGIN = 1.1

const BACKGROUND = 0xf4f6f8

export class Scene3D {
  constructor(mount, { onSelect, onHover, onTransformEnd } = {}) {
    this.mount = mount
    this.onSelect = onSelect
    this.onHover = onHover
    this.onTransformEnd = onTransformEnd

    this.model = null
    this.objectsByElement = new Map()
    this.labelSprites = []
    this.disposed = false
    this.lastPreset = 'iso'
    this.selectedId = null
    this.showLabels = true

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUND)

    // TWO cameras, kept in step. Perspective is how a building is walked
    // through; orthographic is how it is measured, and a plan or an elevation
    // read in perspective is not a plan or an elevation. Switching swaps which
    // one renders and keeps the target, so the model does not jump.
    this.perspective = new THREE.PerspectiveCamera(45, 1, 0.1, 5000)
    this.orthographic = new THREE.OrthographicCamera(-10, 10, 10, -10, -1000, 5000)
    this.camera = this.perspective

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    // Stops the camera dropping below the slab, where the model is a dark
    // underside and there is no way to tell which way is up.
    this.controls.maxPolarAngle = Math.PI * 0.495

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3ad, 2.0))
    this.sun = new THREE.DirectionalLight(0xffffff, 1.4)
    this.sun.position.set(1, 2, 1.5)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)

    this.helpers = new THREE.Group()
    this.helpers.name = 'helpers'
    this.scene.add(this.helpers)
    this.grid = null
    this.axes = null
    this.ground = null

    this.transform = new TransformControls(this.camera, this.renderer.domElement)
    this.transform.setMode('translate')
    // Ground plane only: a furniture item lifted into the air is not a thing
    // a floor plan can express, and Y in a translate gizmo is exactly that.
    this.transform.showY = false
    this.transform.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value
      if (!event.value) this.commitTransform()
    })
    const gizmo = this.transform.getHelper?.() ?? this.transform
    this.gizmo = gizmo
    this.scene.add(gizmo)
    gizmo.visible = false

    this.raycaster = new THREE.Raycaster()
    this.pointerDown = null

    this.onPointerDown = (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY }
    }
    this.onPointerUp = (event) => {
      // A click, not the end of an orbit. Without this, every drag that
      // finished over an object selected it, so releasing the mouse after
      // spinning the model changed the selection.
      const start = this.pointerDown
      this.pointerDown = null
      if (!start) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return
      if (this.transform.dragging) return
      this.onSelect?.(this.elementAt(event.clientX, event.clientY)?.id ?? null)
    }
    this.onPointerMove = (event) => {
      if (!this.onHover) return
      this.onHover(this.elementAt(event.clientX, event.clientY), {
        x: event.offsetX,
        y: event.offsetY,
      })
    }
    this.onPointerLeave = () => this.onHover?.(null, null)

    const element = this.renderer.domElement
    element.addEventListener('pointerdown', this.onPointerDown)
    element.addEventListener('pointerup', this.onPointerUp)
    element.addEventListener('pointermove', this.onPointerMove)
    element.addEventListener('pointerleave', this.onPointerLeave)

    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(mount)

    const tick = () => {
      if (this.disposed) return
      this.frame = requestAnimationFrame(tick)
      this.controls.update()
      this.faceLabelsAtCamera()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  // -- lifecycle -----------------------------------------------------------

  resize() {
    const { clientWidth, clientHeight } = this.mount
    if (!clientWidth || !clientHeight) return
    const aspect = clientWidth / clientHeight

    this.perspective.aspect = aspect
    this.perspective.updateProjectionMatrix()

    const height = this.orthographic.top - this.orthographic.bottom
    this.orthographic.left = (-height * aspect) / 2
    this.orthographic.right = (height * aspect) / 2
    this.orthographic.updateProjectionMatrix()

    this.renderer.setSize(clientWidth, clientHeight, false)

    // Re-frame ONCE, if the model was framed before the canvas had a size.
    // Doing it on every resize would throw away the user's zoom and orbit
    // every time the window changed width.
    if (this.model && !this.framedAtRealSize) this.applyView(this.lastPreset)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.observer?.disconnect()

    const element = this.renderer.domElement
    element.removeEventListener('pointerdown', this.onPointerDown)
    element.removeEventListener('pointerup', this.onPointerUp)
    element.removeEventListener('pointermove', this.onPointerMove)
    element.removeEventListener('pointerleave', this.onPointerLeave)

    this.transform.detach()
    this.transform.dispose()
    this.controls.dispose()
    disposeScene(this.model)
    this.disposeHelpers()
    this.disposeLabels()
    this.renderer.dispose()
    if (element.parentNode === this.mount) this.mount.removeChild(element)
  }

  disposeHelpers() {
    this.helpers.traverse((child) => {
      child.geometry?.dispose?.()
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
      else child.material?.dispose?.()
    })
    this.helpers.clear()
    this.grid = null
    this.axes = null
    this.ground = null
  }

  disposeLabels() {
    for (const sprite of this.labelSprites) {
      sprite.material?.map?.dispose()
      sprite.material?.dispose()
      sprite.geometry?.dispose()
    }
    this.labelSprites = []
  }

  // -- the model -----------------------------------------------------------

  /**
   * Replace the model.
   *
   * `preserveCamera` is what makes editing bearable: an edit rebuilds the
   * scene, and re-framing after every nudge would throw the user's viewpoint
   * away on each change. A genuinely different building (a new conversion, a
   * restored revision) passes false and is framed from ISO.
   */
  setModel(model, { flagged, wallOpacity = 1, preserveCamera = false } = {}) {
    const position = this.camera.position.clone()
    const target = this.controls.target.clone()

    if (this.model) {
      this.scene.remove(this.model)
      disposeScene(this.model)
      this.model = null
      this.objectsByElement = new Map()
    }
    this.disposeLabels()
    this.transform.detach()
    this.gizmo.visible = false

    if (!model) return

    const { root, labels, bounds } = buildScene(model, {
      flagged: flagged ?? new Set(),
      wallOpacity,
    })
    this.model = root
    this.modelBounds = bounds
    this.scene.add(root)

    // One element owns several objects — a wall split around its openings — so
    // selection and visibility work through this index rather than by walking
    // the scene graph on every change.
    const index = new Map()
    root.traverse((child) => {
      const element = child.userData?.element
      if (!element || !(child.isMesh || child.isLineSegments)) return
      if (!index.has(element.id)) index.set(element.id, [])
      index.get(element.id).push(child)
    })
    this.objectsByElement = index

    this.buildLabels(labels)
    this.buildHelpers(bounds)
    this.aimSun(bounds)

    if (preserveCamera) {
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
      if (this.selectedId) this.setSelection(this.selectedId)
    } else {
      this.framedAtRealSize = false
      this.applyView('iso')
    }
  }

  buildHelpers(bounds) {
    this.disposeHelpers()
    const size = bounds.getSize(new THREE.Vector3())
    const centre = bounds.getCenter(new THREE.Vector3())
    const extent = Math.max(size.x, size.z, 4)
    const span = Math.ceil(extent * 1.6)

    // A ground plane, so the model stands on something and the sun has a
    // surface to cast onto. Without it the shadows fall into nothing and the
    // building floats.
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(span * 2, span * 2),
      new THREE.MeshLambertMaterial({ color: GROUND_COLOUR }),
    )
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.set(centre.x, bounds.min.y - 0.02, centre.z)
    this.ground.receiveShadow = true
    this.helpers.add(this.ground)

    this.grid = new THREE.GridHelper(span * 2, span * 2, 0xb8bfc7, 0xdbe0e5)
    this.grid.position.set(centre.x, bounds.min.y - 0.01, centre.z)
    this.grid.material.transparent = true
    this.grid.material.opacity = 0.7
    this.helpers.add(this.grid)

    this.axes = new THREE.AxesHelper(Math.max(extent * 0.15, 1))
    this.axes.position.set(bounds.min.x, bounds.min.y + 0.005, bounds.max.z)
    this.helpers.add(this.axes)
  }

  aimSun(bounds) {
    const centre = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const reach = Math.max(size.x, size.y, size.z, 6)
    this.sun.position.set(centre.x + reach, centre.y + reach * 1.6, centre.z + reach)
    this.sun.target.position.copy(centre)
    const camera = this.sun.shadow.camera
    camera.left = -reach
    camera.right = reach
    camera.top = reach
    camera.bottom = -reach
    camera.near = 0.5
    camera.far = reach * 6
    camera.updateProjectionMatrix()
  }

  /**
   * Room names, as canvas sprites.
   *
   * Sprites rather than DOM overlays: a DOM label has to be re-projected every
   * frame from React, which is a state update per frame per label. A sprite is
   * in the scene and costs nothing to keep in place.
   */
  buildLabels(labels) {
    for (const label of labels) {
      if (!label.text) continue
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      const font = '600 44px Inter, system-ui, sans-serif'
      context.font = font
      const width = Math.ceil(context.measureText(label.text).width) + 40
      canvas.width = width
      canvas.height = 72
      const painted = canvas.getContext('2d')
      painted.font = font
      painted.fillStyle = 'rgba(255,255,255,0.88)'
      painted.fillRect(0, 0, canvas.width, canvas.height)
      painted.strokeStyle = '#c3c9d0'
      painted.lineWidth = 2
      painted.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
      painted.fillStyle = '#16202b'
      painted.textBaseline = 'middle'
      painted.fillText(label.text, 20, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      texture.minFilter = THREE.LinearFilter
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }),
      )
      sprite.position.copy(label.position)
      sprite.userData.levelId = label.levelId
      sprite.userData.baseScale = canvas.width / 400
      sprite.visible = this.showLabels
      this.labelSprites.push(sprite)
      this.scene.add(sprite)
    }
  }

  faceLabelsAtCamera() {
    if (!this.labelSprites.length) return
    // Sprites already face the camera; what changes with distance is how big
    // they should be. Scaling with the camera distance keeps a room name
    // readable close up and from across a warehouse without it becoming the
    // largest thing on screen.
    const distance = this.camera.position.distanceTo(this.controls.target)
    const scale = Math.max(0.4, Math.min(distance * 0.035, 3))
    for (const sprite of this.labelSprites) {
      sprite.scale.set(sprite.userData.baseScale * scale, 0.18 * scale, 1)
    }
  }

  setLabelsVisible(visible) {
    this.showLabels = visible
    for (const sprite of this.labelSprites) sprite.visible = visible
  }

  setHelpersVisible({ grid, axes, ground }) {
    if (this.grid) this.grid.visible = grid !== false
    if (this.axes) this.axes.visible = axes !== false
    if (this.ground) this.ground.visible = ground !== false
  }

  setShadows(enabled) {
    this.renderer.shadowMap.enabled = Boolean(enabled)
    this.sun.castShadow = Boolean(enabled)
    // Materials already compiled hold the old shadow setting, so they have to
    // be told to recompile or turning shadows back on does nothing.
    this.scene.traverse((child) => {
      if (child.isMesh && child.material) child.material.needsUpdate = true
    })
  }

  // -- selection -----------------------------------------------------------

  setSelection(selectedId, { attachGizmo = false } = {}) {
    this.selectedId = selectedId
    for (const [id, objects] of this.objectsByElement) {
      const isSelected = id === selectedId
      for (const object of objects) {
        if (object.userData.isOutline) {
          object.material.color.setHex(isSelected ? SELECTION_COLOUR : EDGE_COLOUR)
          object.material.linewidth = isSelected ? 2 : 1
          continue
        }
        // Emissive rather than a colour swap: the element keeps whatever
        // colour its material or its review flag gave it, and the highlight
        // lifts off it.
        object.material.emissive?.setHex(isSelected ? SELECTION_COLOUR : 0x000000)
        if (object.material.emissiveIntensity !== undefined) {
          object.material.emissiveIntensity = isSelected ? 0.35 : 0
        }
      }
    }

    if (attachGizmo && selectedId) this.attachGizmo(selectedId)
    else this.detachGizmo()
  }

  setHoverHighlight(hoveredId) {
    for (const [id, objects] of this.objectsByElement) {
      if (id === this.selectedId) continue
      for (const object of objects) {
        if (!object.userData.isOutline) continue
        object.material.color.setHex(
          id === hoveredId ? SELECTION_COLOUR : EDGE_COLOUR,
        )
      }
    }
  }

  /**
   * Show what is hidden and what is isolated.
   *
   * Isolate wins over hide: an isolation is an explicit "show me only these",
   * and honouring a stale hide inside it would show fewer elements than the
   * user just asked for.
   */
  setVisibility({ hidden, isolated, levelIds } = {}) {
    const hiddenSet = hidden ?? new Set()
    for (const [id, objects] of this.objectsByElement) {
      const element = objects[0]?.userData?.element
      let visible = isolated ? isolated.has(id) : !hiddenSet.has(id)
      if (visible && levelIds && element?.levelId) {
        visible = levelIds.has(element.levelId)
      }
      for (const object of objects) object.visible = visible
    }
    for (const sprite of this.labelSprites) {
      sprite.visible = this.showLabels
        && (!levelIds || levelIds.has(sprite.userData.levelId))
    }
  }

  /**
   * Cut the model above a height, so an upper floor can be looked into.
   *
   * A clipping plane rather than hiding geometry: hiding a wall removes it
   * from the model, while a section shows the wall CUT, which is what an
   * architect means by the word. `clipShadows` off, because a shadow cast by
   * the part that was cut away is a shadow from nothing.
   */
  setSection(height) {
    if (height == null) {
      this.renderer.clippingPlanes = []
      return
    }
    this.renderer.clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), height),
    ]
    this.renderer.localClippingEnabled = false
  }

  // -- the gizmo -----------------------------------------------------------

  /**
   * Attach the move gizmo, but ONLY to something a gizmo can honestly move.
   *
   * See the class docstring: a transform is not an architectural edit, and the
   * only elements whose whole semantic state is a position and a rotation are
   * furniture and fixtures.
   */
  attachGizmo(elementId) {
    const objects = this.objectsByElement.get(elementId)
    const element = objects?.[0]?.userData?.element
    if (!element || !['furniture', 'fixture'].includes(element.kind)) {
      this.detachGizmo()
      return false
    }

    // The item's own group, not one of its boxes: dragging a chair's back
    // would otherwise move the back and leave the seat behind.
    let target = objects[0]
    while (target.parent && target.parent !== this.model
      && target.parent.userData?.element?.id === elementId) {
      target = target.parent
    }

    this.transform.attach(target)
    this.transform.setMode(this.transformMode ?? 'translate')
    this.gizmo.visible = true
    this.transformTarget = { object: target, elementId, kind: element.kind }
    this.transformStart = {
      position: target.position.clone(),
      rotation: target.rotation.y,
    }
    return true
  }

  detachGizmo() {
    this.transform.detach()
    this.gizmo.visible = false
    this.transformTarget = null
    this.transformStart = null
  }

  setTransformMode(mode) {
    this.transformMode = mode
    this.transform.setMode(mode)
    // Rotation is about the vertical axis only — a chair tipped onto its back
    // is not something a floor plan can express.
    this.transform.showX = mode !== 'rotate'
    this.transform.showZ = mode !== 'rotate'
    this.transform.showY = mode === 'rotate'
  }

  /**
   * Turn a finished drag into a SEMANTIC change, and report it.
   *
   * The scene object is left where the drag put it only until the workspace
   * comes back with a saved model; the command is what makes the change real.
   * A drag that moved nothing reports nothing, so a stray click on the gizmo
   * does not write a revision.
   */
  commitTransform() {
    const target = this.transformTarget
    const start = this.transformStart
    if (!target || !start || !this.onTransformEnd) return

    const moved = target.object.position.distanceTo(start.position) > 1e-4
    const turned = Math.abs(target.object.rotation.y - start.rotation) > 1e-4
    if (!moved && !turned) return

    const [x, y] = toPlan(target.object.position)
    this.onTransformEnd({
      elementId: target.elementId,
      kind: target.kind,
      position: [x, y],
      rotationDegrees: (target.object.rotation.y * 180) / Math.PI,
      moved,
      turned,
    })
    this.transformStart = {
      position: target.object.position.clone(),
      rotation: target.object.rotation.y,
    }
  }

  // -- cameras -------------------------------------------------------------

  setProjection(kind) {
    const wasOrthographic = this.camera === this.orthographic
    const wantOrthographic = kind === 'orthographic'
    if (wasOrthographic === wantOrthographic) return

    const position = this.camera.position.clone()
    const target = this.controls.target.clone()
    this.camera = wantOrthographic ? this.orthographic : this.perspective
    this.camera.position.copy(position)

    this.controls.object = this.camera
    this.transform.camera = this.camera
    this.controls.target.copy(target)
    this.resize()
    this.applyView(this.lastPreset === 'fit' ? 'fit' : this.lastPreset)
  }

  get projection() {
    return this.camera === this.orthographic ? 'orthographic' : 'perspective'
  }

  /**
   * How far back the camera must sit for the whole model to fit the frame.
   *
   * Every corner of the bounding box is projected onto the camera's own axes
   * and asked how far away it needs the camera to be; the answer is the
   * largest of those. Fitting the bounding SPHERE instead is a line shorter
   * and always too far back — a 20 × 20 m plan has a 28 m diagonal, so a top
   * view framed to the sphere shows 28 m of empty floor around a 20 m
   * building.
   *
   * The tighter of the two half-angles is used per axis, so this is correct on
   * a wide canvas and on a tall one.
   */
  distanceToFrame(bounds, centre, direction) {
    const halfFovV = THREE.MathUtils.degToRad(this.perspective.fov) / 2
    const halfFovH = Math.atan(
      Math.tan(halfFovV) * Math.max(this.perspective.aspect, 0.01),
    )

    const right = new THREE.Vector3().crossVectors(direction, this.camera.up).normalize()
    if (right.lengthSq() < 1e-9) right.set(1, 0, 0)
    const up = new THREE.Vector3().crossVectors(right, direction).normalize()

    const corner = new THREE.Vector3()
    let required = 0
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corner.set(x, y, z).sub(centre)
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

    const direction = preset === 'fit'
      ? this.camera.position.clone().sub(this.controls.target)
      : (VIEW_DIRECTIONS[preset] ?? VIEW_DIRECTIONS.iso).clone()
    if (direction.lengthSq() < 1e-9) direction.copy(VIEW_DIRECTIONS.iso)
    direction.normalize()

    const distance = this.distanceToFrame(bounds, centre, direction)
    this.camera.position.copy(centre).addScaledVector(direction, distance)
    this.controls.target.copy(centre)

    if (this.camera === this.perspective) {
      // Near and far are re-derived from the model's size: fixed planes clip a
      // 60 m warehouse and z-fight on a 6 m room.
      this.camera.near = Math.max(distance / 500, 0.05)
      this.camera.far = distance * 20
    } else {
      const size = bounds.getSize(new THREE.Vector3())
      const height = Math.max(size.x, size.y, size.z) * FIT_MARGIN
      const aspect = Math.max(this.perspective.aspect, 0.01)
      this.orthographic.top = height / 2
      this.orthographic.bottom = -height / 2
      this.orthographic.left = (-height * aspect) / 2
      this.orthographic.right = (height * aspect) / 2
      this.orthographic.near = -distance * 4
      this.orthographic.far = distance * 20
    }
    this.camera.updateProjectionMatrix()
    this.controls.update()

    if (preset !== 'fit') this.lastPreset = preset
    // Framing depends on the aspect ratio, which is only right once the canvas
    // has a real size. React mounts the element before layout, so the first
    // framing can happen against the placeholder 1:1 — `resize` re-frames once
    // when that is the case.
    this.framedAtRealSize = this.mount.clientWidth > 0 && this.mount.clientHeight > 0
  }

  zoom(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target)
    offset.multiplyScalar(factor)
    this.camera.position.copy(this.controls.target).add(offset)
    if (this.camera === this.orthographic) {
      const height = (this.orthographic.top - this.orthographic.bottom) * factor
      const aspect = Math.max(this.perspective.aspect, 0.01)
      this.orthographic.top = height / 2
      this.orthographic.bottom = -height / 2
      this.orthographic.left = (-height * aspect) / 2
      this.orthographic.right = (height * aspect) / 2
      this.orthographic.updateProjectionMatrix()
    }
    this.controls.update()
  }

  /** Frame one element, for "show me the wall this finding is about". */
  focusElement(elementId) {
    const objects = this.objectsByElement.get(elementId)
    if (!objects?.length) return false
    const bounds = new THREE.Box3()
    for (const object of objects) bounds.expandByObject(object)
    if (bounds.isEmpty()) return false

    const centre = bounds.getCenter(new THREE.Vector3())
    const direction = this.camera.position.clone().sub(this.controls.target)
    if (direction.lengthSq() < 1e-9) direction.copy(VIEW_DIRECTIONS.iso)
    direction.normalize()

    const distance = Math.max(
      this.distanceToFrame(bounds, centre, direction) * 1.6,
      2,
    )
    this.camera.position.copy(centre).addScaledVector(direction, distance)
    this.controls.target.copy(centre)
    this.controls.update()
    return true
  }

  /** The element under a pointer, or null. Hidden objects are not picked. */
  elementAt(clientX, clientY) {
    if (!this.model) return null
    const rect = this.mount.getBoundingClientRect()
    if (!rect.width || !rect.height) return null

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObjects(this.model.children, true)
    const hit = hits.find((entry) => entry.object.visible && entry.object.isMesh)
    return hit?.object?.userData?.element ?? null
  }

  /** A screenshot of the current view, for a thumbnail or a report. */
  snapshot() {
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }
}
