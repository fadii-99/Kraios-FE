import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

import {
  BACKGROUND_COLOR,
  FLAGGED_COLOR,
  HOVER_COLOR,
  MM_TO_M,
  PROPOSED_COLOR,
  PROPOSED_REMOVAL_COLOR,
  SELECTION_COLOR,
  buildModel,
  disposeModel,
} from '@/lib/floorplan3d/buildScene'
import { buildEnvironment } from '@/lib/floorplan3d/environment'
import { setOutlinesVisible } from '@/lib/floorplan3d/outlines'

/**
 * The Three.js half of the editor, as a plain class with no React in it.
 *
 * WHY IT IS NOT A COMPONENT. A scene, a renderer, a camera and an animation
 * loop are long-lived mutable objects; React's job is to say WHAT should be
 * shown, not to own them. Keeping them here means the component is a dozen
 * lines of lifecycle instead of three hundred lines of imperative code fighting
 * the rules of hooks — and it is also what lets the component satisfy
 * `react-hooks/immutability`, which correctly objects to a component reaching
 * into a ref and mutating a scene graph it captured in an earlier effect.
 *
 * The same shape `bim/lib/ModelScene.js` arrived at, for the same reasons. This
 * one does more: two projections, six view presets, transform gizmos, a section
 * plane, a measurement tool and floor isolation.
 *
 * THE COMPONENT CALLS METHODS. THIS FILE DOES THE MUTATING.
 *
 * REACT IS NOT TOLD ABOUT POINTER MOVEMENT. Hover highlighting, orbiting and
 * gizmo dragging all happen entirely inside this class; only a COMPLETED
 * interaction (a click that selected something, a drag that finished) reaches
 * React through a callback. A `setState` per mousemove is a re-render per
 * mousemove, and at that point the editor stops being usable on a laptop.
 */

// Camera presets, as (azimuth, elevation) in degrees. Azimuth is measured
// counter-clockwise from +X in the PLAN's frame; `directionFor` converts.
//
// `high` and `low` match `blender/scene/cameras.py:PRESETS` exactly, so the
// viewer opens on the same view the thumbnail shows.
const VIEW_PRESETS = {
  iso: { azimuth: 45, elevation: 52, label: 'High isometric' },
  isoLow: { azimuth: 225, elevation: 18, label: 'Low isometric' },
  // Never exactly vertical: a straight-down direction is parallel to the
  // camera's up vector, which gimbal-locks OrbitControls and leaves the user
  // unable to orbit back out of the top view.
  top: { azimuth: 90, elevation: 89.9, label: 'Top' },
  front: { azimuth: 270, elevation: 4, label: 'Front' },
  left: { azimuth: 180, elevation: 4, label: 'Left' },
  right: { azimuth: 0, elevation: 4, label: 'Right' },
}

export const VIEW_PRESET_LIST = Object.entries(VIEW_PRESETS).map(([id, preset]) => ({
  id,
  label: preset.label,
}))

// Breathing room once the model is exactly framed. The framing itself is
// computed, so this only has to be above 1.
const FIT_MARGIN = 1.08

// Quality presets. `low` is what a machine with integrated graphics gets, and
// it is a real difference: no shadow map, no outlines, no antialiasing.
export const QUALITY_PRESETS = {
  high: {
    pixelRatio: 2,
    shadows: true,
    outlines: true,
    antialias: true,
    // Physically-based materials plus an environment map. This is the pair
    // that makes the difference between "a diagram" and "a render"; neither
    // half is worth much alone, because a PBR material with nothing to reflect
    // is just a slower Lambert.
    pbr: true,
  },
  medium: { pixelRatio: 1.5, shadows: false, outlines: true, antialias: true, pbr: true },
  low: { pixelRatio: 1, shadows: false, outlines: false, antialias: false, pbr: false },
}

// The sun's direction, as a unit vector in the VIEWER's frame, converted once
// from `blender/scene/lighting.py`'s 52 degrees elevation / 135 degrees azimuth.
// The plan's +y runs into the screen as -z, which is where the second sign flip
// comes from. Shared so the thumbnail and the live viewer are lit identically -
// a model whose shadows fall left in one image and right in the other reads as
// two different buildings.
const SUN_DIRECTION = new THREE.Vector3(-0.436, 0.788, -0.436).normalize()

// Base size of the shadow catcher, in metres; scaled to the model in
// `frameShadows`.
const GROUND_SIZE = 100

const GRID_COLOR = 0x9fb4c7
const GRID_COLOR_CENTRE = 0x6d8ba6

export class SemanticScene {
  constructor(mount, { quality = 'high', onSelect, onHover, onMeasure, onContextLost } = {}) {
    this.mount = mount
    this.onSelect = onSelect
    this.onHover = onHover
    this.onMeasure = onMeasure
    this.onContextLost = onContextLost
    this.disposed = false

    this.model = null
    this.selectedId = null
    this.hoveredId = null
    this.hiddenIds = new Set()
    this.hiddenCategories = new Set()
    // Elements a proposed edit would change, and ones it would remove. Empty
    // whenever no proposal is on screen, which is almost always.
    this.proposedIds = new Set()
    this.proposedRemovalIds = new Set()
    this.isolatedLevelId = null
    this.lastPreset = 'iso'
    this.framedAtRealSize = false
    this.measurePoints = []
    this.quality = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.high

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUND_COLOR)

    this.perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000)
    // Orthographic is the DEFAULT, not an option. The reference look is a
    // SketchUp-style architectural presentation, and that look is orthographic:
    // parallel edges stay parallel, so two rooms the same size look the same
    // size and a plan view stays readable at its far end.
    this.orthographicCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 5000)
    this.camera = this.orthographicCamera
    this.projection = 'orthographic'

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality.antialias,
      // Needed for the screenshot control: without it the drawing buffer is
      // cleared before `toDataURL` can read it.
      preserveDrawingBuffer: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatio))
    this.renderer.shadowMap.enabled = this.quality.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // NEUTRAL, not ACES. Both map the high dynamic range of a lit scene into
    // what a monitor can show; ACES is a film transform and does it by
    // desaturating and warming the bright end, which turns an orange meeting
    // table into a pale beige one and a sky-blue backdrop into grey-blue. The
    // Khronos PBR Neutral transform exists specifically for product and
    // architectural viewers: it compresses the highlights and leaves hue and
    // saturation alone, which is what a client comparing the render to their
    // own drawing expects. Leaving tone mapping OFF is not the safe option -
    // an environment map pushes plenty of values above 1.0, and those clip to
    // flat white without a transform.
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.0
    // The local clipping plane is what the section/cutaway control uses. It has
    // to be enabled before any material is compiled.
    this.renderer.localClippingEnabled = true
    mount.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = true
    // Stops the camera dropping below the slab, where the model is a dark
    // underside and there is no way to tell which way is up.
    this.controls.maxPolarAngle = Math.PI * 0.495

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
    this.transformControls.setSize(0.8)
    this.transformControls.addEventListener('dragging-changed', (event) => {
      // Orbit and the gizmo both claim the pointer; whichever is dragging wins.
      this.controls.enabled = !event.value
      if (!event.value) this.commitTransform()
    })
    this.transformControls.visible = false
    this.transformControls.enabled = false
    // Three r16x+ exposes the gizmo as a helper object; older builds ARE the
    // object. Supporting both means this file does not pin a Three version.
    this.transformHelper =
      typeof this.transformControls.getHelper === 'function'
        ? this.transformControls.getHelper()
        : this.transformControls
    this.scene.add(this.transformHelper)

    this.buildLighting()
    this.buildHelpers()

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6)
    this.sectionEnabled = false

    this.bindEvents()
    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(mount)
    this.startLoop()
  }

  // -- setup -----------------------------------------------------------
  buildLighting() {
    if (this.quality.pbr) {
      // The environment does most of the work now: it is what fills the north
      // face of every wall and the underside of every desk. The direct lights
      // below are therefore MUCH weaker than they were when they were the only
      // source - keeping the old intensities on top of an environment map
      // blows the whole model out to white.
      this.environment = buildEnvironment(this.renderer)
      this.scene.environment = this.environment
    } else {
      // No environment on the low preset, so the hemisphere has to be the
      // ambient term instead. This is the old behaviour, kept deliberately.
      this.ambient = new THREE.HemisphereLight(0xffffff, 0x9fb0bf, 2.0)
      this.scene.add(this.ambient)
    }

    const sun = new THREE.DirectionalLight(0xffffff, this.quality.pbr ? 2.1 : 1.4)
    // Matching lighting.py's 52 degrees elevation / 135 degrees azimuth, so the
    // shadows fall the same way in the viewer as in the thumbnail. A model whose
    // light comes from the left in one image and the right in the other reads as
    // two different buildings.
    sun.position.copy(SUN_DIRECTION)
    sun.castShadow = this.quality.shadows
    sun.shadow.mapSize.set(2048, 2048)
    // Bias fights shadow acne - the moire of self-shadowing stripes across
    // large flat surfaces, which on a floor slab is the most visible artefact
    // in the whole scene. normalBias is the one that works on thin geometry
    // like a door leaf; a plain constant bias thick enough to fix a slab
    // detaches every shadow from the object casting it.
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.02
    // Shadow camera bounds are set from the model in `frameShadows`; a default
    // 5-unit box shadows nothing on a 24 m office floor.
    this.scene.add(sun)
    this.sun = sun

    const fill = new THREE.DirectionalLight(0xffffff, this.quality.pbr ? 0.22 : 0.45)
    fill.position.set(1.4, 1.2, -1)
    this.scene.add(fill)
  }

  buildHelpers() {
    // A SHADOW CATCHER, NOT A FLOOR. `ShadowMaterial` renders nothing at all
    // except where a shadow falls on it, so this adds the contact shadow that
    // tells the eye the building is standing on something - without adding a
    // visible grey plane sticking out from under the plan, which is precisely
    // the artefact that made the first renders look wrong.
    //
    // It is added to the SCENE and not to the model, which is what keeps it out
    // of `intersectObject(this.model.root)` picking, out of `modelBounds()`, and
    // out of the GLB.
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      new THREE.ShadowMaterial({ color: 0x1d2733, opacity: 0.28 }),
    )
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.ground.renderOrder = -1
    this.scene.add(this.ground)

    this.grid = new THREE.GridHelper(40, 40, GRID_COLOR_CENTRE, GRID_COLOR)
    this.grid.material.transparent = true
    this.grid.material.opacity = 0.35
    this.grid.visible = false
    this.scene.add(this.grid)

    this.axes = new THREE.AxesHelper(2)
    this.axes.visible = false
    this.scene.add(this.axes)

    this.measureGroup = new THREE.Group()
    this.scene.add(this.measureGroup)
  }

  startLoop() {
    const tick = () => {
      if (this.disposed) return
      this.frame = requestAnimationFrame(tick)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  bindEvents() {
    const canvas = this.renderer.domElement

    this.handlePointerMove = (event) => {
      if (this.disposed || this.transformControls.dragging) return
      const entry = this.elementAt(event.clientX, event.clientY)
      const id = entry?.id ?? null
      if (id === this.hoveredId) return
      this.hoveredId = id
      this.applyHighlights()
      // React is told only when the hovered element CHANGES, never per pixel.
      this.onHover?.(entry)
    }

    this.handlePointerDown = (event) => {
      this.pointerDownAt = { x: event.clientX, y: event.clientY }
    }

    this.handlePointerUp = (event) => {
      if (this.disposed || this.transformControls.dragging) return
      const start = this.pointerDownAt
      this.pointerDownAt = null
      // A click, not the end of an orbit. Without this test every orbit that
      // happens to finish over a wall selects that wall.
      if (!start) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return

      if (this.measuring) {
        this.addMeasurePoint(event.clientX, event.clientY)
        return
      }
      const entry = this.elementAt(event.clientX, event.clientY)
      this.select(entry?.id ?? null)
      this.onSelect?.(entry ?? null)
    }

    this.handleContextLost = (event) => {
      // Without `preventDefault` the context is gone for good; with it the
      // browser will restore it. Either way the user is told, because a silently
      // blank canvas is the worst possible outcome.
      event.preventDefault()
      this.onContextLost?.()
    }

    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
  }

  resize() {
    const { clientWidth, clientHeight } = this.mount
    if (!clientWidth || !clientHeight) return

    this.perspectiveCamera.aspect = clientWidth / clientHeight
    this.perspectiveCamera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.updateOrthographicFrustum()

    // Re-frame ONCE, if the model was framed before the canvas had a size.
    // Doing it on every resize would throw away the user's zoom and orbit every
    // time the window changed width or a panel collapsed.
    if (this.model && !this.framedAtRealSize) this.applyView(this.lastPreset)
  }

  /**
   * Keep the orthographic frustum's aspect ratio matching the canvas.
   *
   * An orthographic camera has no `aspect`; its frustum is four explicit edges.
   * Leaving them alone on resize stretches the model, which on a wide canvas is
   * immediately obvious and on a narrow one silently clips it.
   */
  updateOrthographicFrustum() {
    const { clientWidth, clientHeight } = this.mount
    if (!clientWidth || !clientHeight) return
    const aspect = clientWidth / clientHeight
    const halfHeight = this.orthographicHalfHeight ?? 10
    this.orthographicCamera.left = -halfHeight * aspect
    this.orthographicCamera.right = halfHeight * aspect
    this.orthographicCamera.top = halfHeight
    this.orthographicCamera.bottom = -halfHeight
    this.orthographicCamera.updateProjectionMatrix()
  }

  // -- the model -------------------------------------------------------
  /**
   * Replace the model.
   *
   * `preserveView` is what makes editing bearable: after a wall is dragged the
   * model is rebuilt, and re-framing the camera every time would throw the user
   * out of whatever they were looking at. It is off for a genuinely new
   * building and on for an edit.
   */
  setDocument(document, { catalog = null, preserveView = false } = {}) {
    const previousTarget = this.controls.target.clone()
    const previousPosition = this.camera.position.clone()
    const previousHalfHeight = this.orthographicHalfHeight

    if (this.model) {
      this.scene.remove(this.model.root)
      disposeModel(this.model)
      this.model = null
    }
    this.detachTransform()

    if (!document) return

    this.model = buildModel(document, {
      catalog,
      outlines: this.quality.outlines,
      physicallyBased: this.quality.pbr,
    })
    this.scene.add(this.model.root)
    this.applyVisibility()
    this.applyHighlights()
    this.frameShadows()
    this.fitGrid()

    if (preserveView && previousHalfHeight) {
      this.controls.target.copy(previousTarget)
      this.camera.position.copy(previousPosition)
      this.orthographicHalfHeight = previousHalfHeight
      this.updateOrthographicFrustum()
      this.controls.update()
      this.framedAtRealSize = true
    } else {
      this.framedAtRealSize = false
      this.applyView('iso')
    }
  }

  modelBounds() {
    if (!this.model) return null
    // Recomputed rather than cached: isolation and visibility change what is
    // visible, and "fit" must fit what the user can actually see.
    const box = new THREE.Box3()
    let found = false
    for (const [, group] of this.model.index) {
      if (!group.visible) continue
      box.expandByObject(group)
      found = true
    }
    if (!found) box.setFromObject(this.model.root)
    return box.isEmpty() ? null : box
  }

  frameShadows() {
    const bounds = this.modelBounds()
    if (!bounds || !this.sun.shadow) return
    const size = bounds.getSize(new THREE.Vector3())
    const radius = Math.max(size.length() / 2, 2)
    const camera = this.sun.shadow.camera
    camera.left = -radius
    camera.right = radius
    camera.top = radius
    camera.bottom = -radius
    camera.near = 0.1
    camera.far = radius * 6
    camera.updateProjectionMatrix()

    const centre = bounds.getCenter(new THREE.Vector3())
    this.sun.position
      .copy(SUN_DIRECTION)
      .multiplyScalar(radius * 2.2)
      .add(centre)
    this.sun.target.position.copy(centre)
    this.sun.target.updateMatrixWorld()
    this.scene.add(this.sun.target)

    // Park the shadow catcher on the underside of the model, and make it big
    // enough that a low sun's shadow still lands on it.
    if (this.ground) {
      this.ground.position.set(centre.x, bounds.min.y - 0.002, centre.z)
      this.ground.scale.setScalar(Math.max(1, (radius * 6) / GROUND_SIZE))
    }
  }

  fitGrid() {
    const bounds = this.modelBounds()
    if (!bounds) return
    const size = bounds.getSize(new THREE.Vector3())
    // A grid at 1 m divisions, sized to the building and rounded up to whole
    // metres so the lines land on round numbers.
    const span = Math.max(Math.ceil(Math.max(size.x, size.z)) + 4, 8)
    this.scene.remove(this.grid)
    this.grid.geometry.dispose()
    this.grid.material.dispose()
    const visible = this.grid.visible
    this.grid = new THREE.GridHelper(span, span, GRID_COLOR_CENTRE, GRID_COLOR)
    this.grid.material.transparent = true
    this.grid.material.opacity = 0.35
    this.grid.visible = visible
    const centre = bounds.getCenter(new THREE.Vector3())
    this.grid.position.set(centre.x, bounds.min.y - 0.01, centre.z)
    this.scene.add(this.grid)

    this.axes.position.set(bounds.min.x, bounds.min.y + 0.01, bounds.max.z)
  }

  // -- cameras ---------------------------------------------------------
  directionFor(preset) {
    const { azimuth, elevation } = VIEW_PRESETS[preset] ?? VIEW_PRESETS.iso
    const azimuthRadians = (azimuth * Math.PI) / 180
    const elevationRadians = (elevation * Math.PI) / 180
    // Plan azimuth is measured about +Z; the world's floor plane is XZ with the
    // plan's +Y running along -Z, which is where the negation comes from.
    return new THREE.Vector3(
      Math.cos(azimuthRadians) * Math.cos(elevationRadians),
      Math.sin(elevationRadians),
      -Math.sin(azimuthRadians) * Math.cos(elevationRadians),
    ).normalize()
  }

  /**
   * How far back the camera must sit, and how tall the ortho frustum must be,
   * for the whole model to fit the frame.
   *
   * Every corner of the bounding box is projected onto the camera's own right
   * and up axes and asked how much room it needs; the answer is the largest.
   * Fitting the bounding SPHERE instead is a line shorter and always too far
   * back — a 20 x 20 m plan has a 28 m diagonal, so a sphere-framed top view
   * shows 8 m of empty ground around the building.
   */
  framingFor(bounds, centre, direction) {
    const right = new THREE.Vector3().crossVectors(direction, this.camera.up).normalize()
    if (right.lengthSq() < 1e-9) right.set(1, 0, 0)
    const up = new THREE.Vector3().crossVectors(right, direction).normalize()

    const { clientWidth, clientHeight } = this.mount
    const aspect = Math.max((clientWidth || 1) / (clientHeight || 1), 0.01)

    const halfFovV = THREE.MathUtils.degToRad(this.perspectiveCamera.fov) / 2
    const halfFovH = Math.atan(Math.tan(halfFovV) * aspect)

    const corner = new THREE.Vector3()
    let distance = 0
    let halfWidth = 0
    let halfHeight = 0

    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corner.set(x, y, z).sub(centre)
          const depth = corner.dot(direction)
          const lateral = Math.abs(corner.dot(right))
          const vertical = Math.abs(corner.dot(up))
          halfWidth = Math.max(halfWidth, lateral)
          halfHeight = Math.max(halfHeight, vertical)
          distance = Math.max(
            distance,
            vertical / Math.tan(halfFovV) + depth,
            lateral / Math.tan(halfFovH) + depth,
          )
        }
      }
    }

    return {
      distance: Math.max(distance * FIT_MARGIN, 1),
      // The ortho frustum's HALF-HEIGHT: whichever of the model's own width and
      // height needs more room once the canvas aspect is applied.
      halfHeight: Math.max(halfHeight, halfWidth / aspect) * FIT_MARGIN,
    }
  }

  /**
   * Move the camera. `fit` re-frames from wherever the user has orbited to;
   * every other preset is a viewpoint and moves there.
   */
  applyView(preset) {
    if (!this.model) return
    const bounds = this.modelBounds()
    if (!bounds) return

    const centre = bounds.getCenter(new THREE.Vector3())
    const direction =
      preset === 'fit'
        ? this.camera.position.clone().sub(this.controls.target)
        : this.directionFor(preset)
    if (direction.lengthSq() < 1e-9) direction.copy(this.directionFor('iso'))
    direction.normalize()

    const { distance, halfHeight } = this.framingFor(bounds, centre, direction)

    this.camera.position.copy(centre).addScaledVector(direction, distance)
    this.controls.target.copy(centre)

    this.orthographicHalfHeight = halfHeight
    this.updateOrthographicFrustum()

    // Near and far are re-derived from the model's size: fixed planes clip a
    // 60 m warehouse and z-fight on a 6 m room.
    for (const camera of [this.perspectiveCamera, this.orthographicCamera]) {
      camera.near = Math.max(distance / 500, 0.02)
      camera.far = distance * 20
      camera.updateProjectionMatrix()
    }
    this.controls.update()

    if (preset !== 'fit') this.lastPreset = preset
    // Framing depends on the canvas aspect, which is only right once the canvas
    // has a real size. React mounts the element before layout, so the first
    // framing can happen against a 1:1 placeholder; `resize` re-frames once
    // when that was the case.
    this.framedAtRealSize = this.mount.clientWidth > 0 && this.mount.clientHeight > 0
  }

  setProjection(projection) {
    if (projection === this.projection) return
    const target = this.controls.target.clone()
    const position = this.camera.position.clone()

    this.projection = projection
    this.camera =
      projection === 'perspective' ? this.perspectiveCamera : this.orthographicCamera
    this.camera.position.copy(position)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(target)

    // OrbitControls and TransformControls each hold a camera reference; both
    // have to be repointed or the gizmo scales against the old projection.
    this.controls.object = this.camera
    this.controls.target.copy(target)
    this.controls.update()
    this.transformControls.camera = this.camera

    this.applyView('fit')
  }

  // -- selection and highlighting --------------------------------------
  /**
   * The element under a pointer position, or null.
   *
   * Resolved by walking UP from the hit mesh to the group that carries
   * `userData.element`, because a wall is several meshes in one group and a
   * click on any of them means the wall. Invisible groups are not picked.
   */
  elementAt(clientX, clientY) {
    if (!this.model) return null
    const rect = this.mount.getBoundingClientRect()
    if (!rect.width || !rect.height) return null

    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const hits = this.raycaster.intersectObject(this.model.root, true)
    for (const hit of hits) {
      let node = hit.object
      if (node.userData?.isOutline) continue
      while (node && !node.userData?.element) node = node.parent
      if (node?.userData?.element && node.visible) return node.userData.element
    }
    return null
  }

  select(elementId) {
    this.selectedId = elementId ?? null
    this.applyHighlights()
    this.attachTransformTo(this.selectedId)
  }

  /**
   * Paint selection, hover and the uncertainty flag.
   *
   * EMISSIVE, not a colour swap: the element keeps whatever colour its material
   * gave it and the highlight lifts off it, so a selected wall still looks like
   * a wall. A colour swap would also mean storing and restoring the original,
   * which is a source of stale state every time the model rebuilds.
   *
   * Materials are SHARED between elements, so the emissive value is set on a
   * per-object clone the first time an element needs one. Setting it on the
   * shared material would highlight every wall at once — which it did, once.
   */
  applyHighlights() {
    if (!this.model) return
    for (const [id, group] of this.model.index) {
      const element = group.userData.element
      const selected = id === this.selectedId
      const hovered = id === this.hoveredId && !selected
      const flagged = Boolean(element?.flagged)
      const proposed = this.proposedIds.has(id)
      const proposedRemoval = this.proposedRemovalIds.has(id)

      // THE ORDER IS A PRIORITY, AND A PROPOSAL OUTRANKS A FLAG. While a
      // proposal is on screen it is the thing the user is deciding about, and
      // an element that is both uncertain and about to change has to read as
      // about to change - otherwise the one wall they need to look at is the
      // one painted like the other eleven. Selection and hover still win,
      // because those track the pointer and going dead under it reads as a
      // broken control.
      let color = 0x000000
      let intensity = 0
      if (selected) {
        color = SELECTION_COLOR
        intensity = 0.55
      } else if (hovered) {
        color = HOVER_COLOR
        intensity = 0.3
      } else if (proposedRemoval) {
        color = PROPOSED_REMOVAL_COLOR
        intensity = 0.5
      } else if (proposed) {
        color = PROPOSED_COLOR
        intensity = 0.45
      } else if (flagged) {
        color = FLAGGED_COLOR
        intensity = 0.22
      }

      group.traverse((child) => {
        if (!child.isMesh) return
        if (intensity > 0 && !child.userData.ownMaterial) {
          child.material = child.material.clone()
          child.userData.ownMaterial = true
        }
        if (!child.userData.ownMaterial) return
        child.material.emissive?.setHex(color)
        if (child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = intensity
        }
      })
    }
  }

  /**
   * Paint the elements a proposed edit would touch.
   *
   * Two sets, because they mean different things to the person looking at them:
   * `ids` would CHANGE and `removalIds` would be GONE. Called with empty sets
   * the moment a proposal is applied or discarded - a highlight left behind
   * after the decision is a highlight that lies about the current document.
   *
   * Note that this paints elements in the CURRENT document. A proposal that
   * adds something has nothing to paint until the draft is on screen, which is
   * why the editor renders the draft document rather than the saved one while
   * a proposal is open.
   */
  setProposedElements(ids, removalIds) {
    this.proposedIds = new Set(ids ?? [])
    this.proposedRemovalIds = new Set(removalIds ?? [])
    this.applyHighlights()
  }

  // -- visibility ------------------------------------------------------
  setHiddenElements(ids) {
    this.hiddenIds = new Set(ids ?? [])
    this.applyVisibility()
  }

  setHiddenCategories(categories) {
    this.hiddenCategories = new Set(categories ?? [])
    this.applyVisibility()
  }

  /** Show one level only, or all of them when `levelId` is null. */
  isolateLevel(levelId) {
    this.isolatedLevelId = levelId ?? null
    this.applyVisibility()
  }

  /**
   * Apply hiding, category filters and floor isolation together.
   *
   * ISOLATION WINS over the category filters, and both win over nothing: an
   * isolation is an explicit "show me only this floor", and honouring a stale
   * hide inside it would show less than the user just asked for.
   */
  applyVisibility() {
    if (!this.model) return
    for (const [id, group] of this.model.index) {
      const element = group.userData.element
      let visible = true
      if (this.isolatedLevelId && element.levelId !== this.isolatedLevelId) visible = false
      if (visible && this.hiddenCategories.has(element.category)) visible = false
      if (visible && this.hiddenIds.has(id)) visible = false
      group.visible = visible
    }
    // A hidden element must not keep the gizmo attached to it.
    if (this.selectedId && this.model.index.get(this.selectedId)?.visible === false) {
      this.detachTransform()
    }
    this.frameShadows()
  }

  setGridVisible(visible) {
    this.grid.visible = Boolean(visible)
  }

  setAxesVisible(visible) {
    this.axes.visible = Boolean(visible)
  }

  /**
   * The cutaway. A horizontal clipping plane at `heightMm` above the datum.
   *
   * A local clipping plane on the renderer rather than per-material, so it
   * applies to everything including geometry added later, and costs one uniform
   * rather than a material recompile. Off by default: a cutaway is a mode, and
   * a viewer that opens in one is a viewer that looks broken.
   */
  setSection(enabled, heightMm = 1200) {
    this.sectionEnabled = Boolean(enabled)
    if (!this.sectionEnabled) {
      this.renderer.clippingPlanes = []
      return
    }
    this.clippingPlane.set(new THREE.Vector3(0, -1, 0), heightMm * MM_TO_M)
    this.renderer.clippingPlanes = [this.clippingPlane]
  }

  setQuality(name) {
    const preset = QUALITY_PRESETS[name] ?? QUALITY_PRESETS.high
    const wasPhysical = this.quality.pbr
    this.quality = preset
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatio))
    this.renderer.shadowMap.enabled = preset.shadows
    if (this.sun) this.sun.castShadow = preset.shadows
    if (this.model) setOutlinesVisible(this.model.root, preset.outlines)

    // Dropping to or rising from the non-PBR preset changes the MATERIAL CLASS
    // of every mesh, which cannot be toggled on an existing material - a
    // Lambert has no roughness to set. The caller rebuilds the model; this only
    // has to get the scene-level half right, and say so.
    if (preset.pbr === wasPhysical) return
    if (preset.pbr) {
      if (!this.environment) this.environment = buildEnvironment(this.renderer)
      this.scene.environment = this.environment
      if (this.ambient) {
        this.scene.remove(this.ambient)
        this.ambient = null
      }
    } else {
      this.scene.environment = null
      if (!this.ambient) {
        this.ambient = new THREE.HemisphereLight(0xffffff, 0x9fb0bf, 2.0)
        this.scene.add(this.ambient)
      }
    }
    if (this.sun) this.sun.intensity = preset.pbr ? 2.1 : 1.4
    return true
  }

  // -- transform gizmo -------------------------------------------------
  setTransformMode(mode) {
    this.transformMode = mode ?? null
    if (!mode) {
      this.detachTransform()
      return
    }
    this.transformControls.setMode(mode)
    this.attachTransformTo(this.selectedId)
  }

  /**
   * Attach the gizmo, but only to something it is safe to drag.
   *
   * Furniture and columns are free-standing objects with a position and a
   * rotation, so a gizmo is the natural control. A wall, an opening or a room is
   * defined by its host geometry — a door's position is a distance along its
   * wall, not a point in space — and dragging one with a translate gizmo would
   * produce a value the semantic model cannot express. Those are edited through
   * the inspector's numeric fields instead.
   */
  attachTransformTo(elementId) {
    const group = elementId ? this.model?.index.get(elementId) : null
    const element = group?.userData?.element
    const draggable =
      element && ['furniture', 'fixture', 'column'].includes(element.kind)

    if (!this.transformMode || !draggable || !group.visible) {
      this.detachTransform()
      return
    }

    this.transformControls.attach(group)
    this.transformControls.visible = true
    this.transformControls.enabled = true
    this.transformOrigin = {
      elementId,
      position: group.position.clone(),
      rotation: group.rotation.clone(),
      scale: group.scale.clone(),
    }
  }

  detachTransform() {
    this.transformControls.detach()
    this.transformControls.visible = false
    this.transformControls.enabled = false
    this.transformOrigin = null
  }

  /**
   * A finished drag, translated back into a semantic change.
   *
   * The gizmo moved a Three.js group; what the document needs is millimetres in
   * the plan frame. This converts once, at the END of the drag, and hands the
   * result to React — a callback per frame would be a re-render per frame.
   *
   * The group's transform is NOT kept. The document is the source of truth, so
   * the scene is rebuilt from it; keeping the visual offset as well would
   * double every move.
   */
  commitTransform() {
    const origin = this.transformOrigin
    const group = this.transformControls.object
    if (!origin || !group) return

    const deltaX = (group.position.x - origin.position.x) / MM_TO_M
    // World -Z is the plan's +Y.
    const deltaY = -(group.position.z - origin.position.z) / MM_TO_M
    const deltaRotation = -((group.rotation.y - origin.rotation.y) * 180) / Math.PI
    const scale = group.scale.x / (origin.scale.x || 1)

    group.position.copy(origin.position)
    group.rotation.copy(origin.rotation)
    group.scale.copy(origin.scale)

    if (
      Math.abs(deltaX) < 0.5 &&
      Math.abs(deltaY) < 0.5 &&
      Math.abs(deltaRotation) < 0.1 &&
      Math.abs(scale - 1) < 0.001
    ) {
      return
    }

    this.onTransform?.({
      elementId: origin.elementId,
      deltaXMm: deltaX,
      deltaYMm: deltaY,
      deltaRotationDegrees: deltaRotation,
      scale,
      mode: this.transformMode,
    })
  }

  // -- measurement -----------------------------------------------------
  setMeasuring(enabled) {
    this.measuring = Boolean(enabled)
    if (!this.measuring) this.clearMeasurement()
  }

  /**
   * Add a measurement point where the pointer hit the model.
   *
   * On the MODEL, not on the ground plane: measuring between two points on a
   * horizontal plane cannot measure a wall's height, and a plan-only measure
   * tool in a 3D editor is a tool that answers the wrong question half the time.
   */
  addMeasurePoint(clientX, clientY) {
    if (!this.model) return
    const rect = this.mount.getBoundingClientRect()
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster
      .intersectObject(this.model.root, true)
      .find((candidate) => !candidate.object.userData?.isOutline)
    if (!hit) return

    this.measurePoints.push(hit.point.clone())
    if (this.measurePoints.length > 2) this.measurePoints = [hit.point.clone()]
    this.drawMeasurement()

    if (this.measurePoints.length === 2) {
      const [first, second] = this.measurePoints
      this.onMeasure?.({
        distanceMm: first.distanceTo(second) / MM_TO_M,
        // Plan distance too: on a plan the horizontal run is usually what is
        // wanted, and computing it in the component would mean re-deriving the
        // world-to-plan mapping there.
        planDistanceMm:
          Math.hypot(second.x - first.x, second.z - first.z) / MM_TO_M,
        heightMm: Math.abs(second.y - first.y) / MM_TO_M,
      })
    }
  }

  drawMeasurement() {
    this.clearMeasurementObjects()
    for (const point of this.measurePoints) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 8),
        new THREE.MeshBasicMaterial({ color: SELECTION_COLOR }),
      )
      marker.position.copy(point)
      this.measureGroup.add(marker)
    }
    if (this.measurePoints.length === 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.measurePoints)
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: SELECTION_COLOR, linewidth: 2 }),
      )
      this.measureGroup.add(line)
    }
  }

  clearMeasurementObjects() {
    for (const child of [...this.measureGroup.children]) {
      child.geometry?.dispose()
      child.material?.dispose()
      this.measureGroup.remove(child)
    }
  }

  clearMeasurement() {
    this.measurePoints = []
    this.clearMeasurementObjects()
    this.onMeasure?.(null)
  }

  // -- output ----------------------------------------------------------
  /**
   * A PNG data URL of the current view.
   *
   * The scene is rendered once immediately before reading the buffer. Even with
   * `preserveDrawingBuffer`, reading between the animation frame and the
   * browser's own composite can return a cleared buffer.
   */
  screenshot() {
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.observer?.disconnect()

    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointermove', this.handlePointerMove)
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointerup', this.handlePointerUp)
    canvas.removeEventListener('webglcontextlost', this.handleContextLost)

    this.clearMeasurementObjects()
    this.transformControls.detach()
    this.transformControls.dispose()
    this.controls.dispose()
    disposeModel(this.model)
    this.ground.geometry.dispose()
    this.ground.material.dispose()
    this.environment?.dispose()
    this.grid.geometry.dispose()
    this.grid.material.dispose()
    this.axes.geometry.dispose()
    this.axes.material.dispose()
    // Last: `dispose()` invalidates the context every other release depends on.
    this.renderer.dispose()
    if (canvas.parentNode === this.mount) this.mount.removeChild(canvas)
  }
}
