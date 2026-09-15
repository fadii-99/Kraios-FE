import * as THREE from 'three'

import {
  CATEGORIES,
  ELEMENT_BUCKETS,
  ELEMENT_KINDS,
  bearingAtDistanceAlong,
  cumulativeLengths,
  distance,
  elementLabel,
  flaggedElementIds,
  levels,
  openingsOnWall,
  pointAtDistanceAlong,
  wallSolidRuns,
} from '@/lib/floorplan3d/semanticModel'
import { buildFurnitureGroup } from '@/lib/floorplan3d/furniture'
import { attachOutline } from '@/lib/floorplan3d/outlines'

/**
 * FloorPlan3D document → a Three.js scene graph, one selectable element per row.
 *
 * BUILT FROM THE SEMANTIC JSON, NOT FROM THE GLB. The GLB is a derived artifact
 * that a Blender worker produces minutes later; the editor has to open as soon
 * as validation succeeds, and it has to rebuild instantly when the user drags a
 * wall. Both of those need the document, not a mesh.
 *
 * COORDINATES
 * -----------
 * The document is millimetres, floor plane XY, +Z up. Three.js is metres and
 * Y-up. The mapping is applied in exactly one function, `toWorld`:
 *
 *     plan (x, y) at height z  ->  world (x * MM_TO_M, z * MM_TO_M, -y * MM_TO_M)
 *
 * so a wall's plan bearing becomes a rotation of `-bearing` about Y, and the top
 * view reads the same way round as the drawing. Every other function in this
 * file works in plan millimetres and hands them to `toWorld` or to a helper
 * that does.
 *
 * ONE GROUP PER ELEMENT
 * ---------------------
 * Every element becomes a `THREE.Group` carrying `userData.element`, with its
 * meshes inside. A wall split around three openings is four boxes in one group,
 * so one click selects one wall and one visibility toggle hides one wall.
 *
 * MATERIALS ARE SHARED
 * --------------------
 * A few hundred meshes with a material each is a few hundred shader programs.
 * `MaterialCache` keys them by the document's own material ids plus the ad-hoc
 * colours the furniture catalogue asks for, so a hundred blue chairs are one
 * material. The cache is disposed with the model.
 */

/** The only millimetre-to-metre conversion in the browser engine. */
export const MM_TO_M = 0.001

export const SELECTION_COLOR = 0x1677ff
export const FLAGGED_COLOR = 0xdc2626
export const HOVER_COLOR = 0x64a8ff

// The presentation's sky blue, matching `blender/scene/lighting.py:SKY_BLUE` so
// a thumbnail and the live viewer look like the same product.
export const BACKGROUND_COLOR = 0xb8d9f0

// Where a room's floor finish sits above its slab. Matches
// `blender/geometry/slabs.py:FINISH_LIFT_MM`: a real screed thickness, and
// enough to stop it z-fighting with the slab.
const FINISH_LIFT_MM = 8
const FINISH_THICKNESS_MM = 6

// Opening trim, matching `blender/geometry/openings.py`.
const FRAME_SECTION_MM = 60
const GLASS_THICKNESS_MM = 12
const LEAF_THICKNESS_MM = 45
const LEAF_AJAR_DEGREES = 20

const TREAD_THICKNESS_MM = 50
const NOSING_MM = 25
const RAMP_STEPS = 12

const FALLBACK_COLOR = '#C9CCCF'

/**
 * Room types that are a HOLE through the level, not a room.
 *
 * "OPEN TO SKY", an atrium and a courtyard are drawn on a plan exactly the way
 * a room is - a labelled closed area - and are the opposite of one: there is no
 * floor. Giving them a finish turns a light well into a windowless internal
 * office, which is how they read before this. Mirrors `VOID_ROOM_TYPES` in
 * `schema/defaults.py`; the two engines must agree.
 */
const VOID_ROOM_TYPES = new Set([
  'light_well',
  'lightwell',
  'void',
  'open_to_sky',
  'atrium',
  'courtyard',
])

// Mirrors `build_lift_cars` in `blender/geometry/structure.py`.
const LIFT_ROOM_TYPES = new Set(['lift', 'elevator'])
const LIFT_CAR_PLAN_FRACTION = 0.78
const LIFT_CAR_HEIGHT_FRACTION = 0.62

function isVoidRoom(room) {
  return VOID_ROOM_TYPES.has(String(room?.room_type ?? '').trim().toLowerCase())
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
class MaterialCache {
  /**
   * `physicallyBased` is the quality trade, and it is a real one.
   *
   * A `MeshStandardMaterial` samples the environment map per fragment and runs
   * a full GGX specular term; a `MeshLambertMaterial` does one dot product. On
   * the low preset - which exists for the machines that were struggling before
   * any of this was added - the second is the honest choice, and the model is
   * still correct, just flatter.
   */
  constructor(document, { physicallyBased = true } = {}) {
    this.byId = new Map()
    this.byColor = new Map()
    this.all = []
    this.physicallyBased = physicallyBased

    for (const material of document?.materials ?? []) {
      this.byId.set(material.id, this.create(material))
    }
    this.fallback = this.create({ id: '', color: FALLBACK_COLOR, roughness: 0.7 })
  }

  create(spec) {
    const opacity = spec.opacity ?? 1
    const glazing = opacity < 1
    const shared = {
      color: new THREE.Color(spec.color || FALLBACK_COLOR),
      transparent: glazing,
      opacity,
      // Glazing seen from inside a roofless building has to be visible from
      // both sides; a single-sided pane disappears from the plan view.
      side: glazing ? THREE.DoubleSide : THREE.FrontSide,
      // Glass that writes depth hides everything behind it in the plan view.
      depthWrite: !glazing,
    }

    if (!this.physicallyBased) {
      const material = new THREE.MeshLambertMaterial(shared)
      this.all.push(material)
      return material
    }

    // Glazing is a mirror with a bit of tint, not a rough surface. Whatever
    // roughness the document carries for it is a guess by an extractor that
    // has never seen the glass, and a rough transparent material reads as
    // frosted perspex rather than a window.
    const roughness = glazing
      ? Math.min(0.08, spec.roughness ?? 0.08)
      : clamp01(spec.roughness ?? 0.7)

    const material = new THREE.MeshStandardMaterial({
      ...shared,
      roughness,
      metalness: clamp01(spec.metallic ?? 0),
      // Well under 1 for opaque surfaces. The environment is the FILL here -
      // the sun is the key - and letting it contribute at full strength is what
      // washes a palette of warm greys into pastels. Glass is the exception:
      // almost all of what a window shows IS the environment, and its diffuse
      // colour is nearly none of the story.
      envMapIntensity: glazing ? 1.5 : 0.8,
    })
    this.all.push(material)
    return material
  }

  resolve(materialId) {
    return this.byId.get(materialId) ?? this.fallback
  }

  /** A material for a colour the document's palette does not carry.
   *
   * Furniture parts bring their own colours from the catalogue, which is
   * deliberate: a sofa is not a wall finish and does not belong in the
   * document's material list. One shared material per distinct colour.
   */
  color(hex) {
    const key = String(hex || FALLBACK_COLOR).toUpperCase()
    const existing = this.byColor.get(key)
    if (existing) return existing
    const material = this.create({ color: key, roughness: 0.65 })
    this.byColor.set(key, material)
    return material
  }

  dispose() {
    for (const material of this.all) material.dispose()
    this.all = []
    this.byId.clear()
    this.byColor.clear()
  }
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
/** The one place plan coordinates become Three.js ones. */
function toWorld(x, y, z = 0) {
  return new THREE.Vector3(x * MM_TO_M, z * MM_TO_M, -y * MM_TO_M)
}

/**
 * A box positioned in PLAN MILLIMETRES.
 *
 * `sizeMm` is (width, depth, height) with width along the item's local +X
 * before rotation; `centreMm` is the footprint centre; `baseMm` is the
 * underside's height above the level datum. `rotationDegrees` is a plan bearing
 * (counter-clockwise from +X), which becomes `-radians` about Y because the Y
 * flip in `toWorld` reverses the sense of rotation.
 */
function box(sizeMm, centreMm, baseMm, rotationDegrees, material) {
  const [width, depth, height] = sizeMm
  if (!(width > 0) || !(depth > 0) || !(height > 0)) return null
  const geometry = new THREE.BoxGeometry(
    width * MM_TO_M,
    height * MM_TO_M,
    depth * MM_TO_M,
  )
  const mesh = new THREE.Mesh(geometry, material)
  // The box is centred on its own origin, so it is lifted by half its height to
  // sit ON `baseMm` rather than straddling it.
  mesh.position.copy(toWorld(centreMm[0], centreMm[1], baseMm + height / 2))
  mesh.rotation.y = (-rotationDegrees * Math.PI) / 180
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function cylinder(diameterMm, heightMm, centreMm, baseMm, material) {
  if (!(diameterMm > 0) || !(heightMm > 0)) return null
  const geometry = new THREE.CylinderGeometry(
    (diameterMm / 2) * MM_TO_M,
    (diameterMm / 2) * MM_TO_M,
    heightMm * MM_TO_M,
    16,
  )
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(toWorld(centreMm[0], centreMm[1], baseMm + heightMm / 2))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/**
 * A polygon extruded DOWNWARDS by `thicknessMm`, in PLAN MILLIMETRES.
 *
 * Downwards because a slab's polygon is its FINISHED FLOOR level and the
 * structure hangs below it - extruding up would put every storey's floor at its
 * own ceiling height, and would leave the ground floor standing `thicknessMm`
 * proud of the walls that sit on it. This matches `blender/common.py`'s
 * `polygon_mesh`, which is what the .blend and the GLB are built with; the two
 * have to agree or the same document renders as two different buildings.
 *
 * Built with `THREE.Shape` + `ExtrudeGeometry`, which triangulates concave
 * rings correctly (an L-shaped plan is the common case) in a way a fan from
 * vertex zero does not.
 *
 * THE AXIS MAPPING IS THE EASY THING TO GET WRONG HERE, AND IT WAS WRONG.
 * `toWorld` sends plan (x, y) to world (x, -y) in the ground plane. A Shape is
 * built in its own XY plane and then stood up, and `rotateX(-90 degrees)` sends
 * a shape point (x, y) to world (x, 0, -y) - it ALREADY applies that flip. The
 * outline is therefore passed through UNCHANGED. Negating y here as well
 * applied the flip twice, which mirrored every slab and room floor about the
 * plan's x axis: for a building 12.6 m deep the floor landed 12.6 m away from
 * the walls, as a grey plane lying beside the model instead of under it.
 */
function slabFromPolygon(polygonMm, elevationMm, thicknessMm, material, holesMm = []) {
  if (!polygonMm || polygonMm.length < 3) return null

  const shape = new THREE.Shape()
  shape.moveTo(polygonMm[0][0] * MM_TO_M, polygonMm[0][1] * MM_TO_M)
  for (const [x, y] of polygonMm.slice(1)) {
    shape.lineTo(x * MM_TO_M, y * MM_TO_M)
  }
  shape.closePath()

  // `ExtrudeGeometry` cuts a Shape's `holes` out of the face and walls them,
  // which is exactly a light well through a floor slab. Blender gets the same
  // result from a boolean difference; see `blender/geometry/slabs.py`.
  for (const hole of holesMm) {
    if (!hole || hole.length < 3) continue
    const path = new THREE.Path()
    path.moveTo(hole[0][0] * MM_TO_M, hole[0][1] * MM_TO_M)
    for (const [x, y] of hole.slice(1)) {
      path.lineTo(x * MM_TO_M, y * MM_TO_M)
    }
    path.closePath()
    shape.holes.push(path)
  }

  const thickness = thicknessMm * MM_TO_M
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 1,
  })
  // Stands the shape up as a horizontal surface. The extrusion, which ran along
  // the shape's own +Z, now runs along world +Y - upwards - so the whole
  // geometry is dropped by its own thickness to put the TOP face on the datum
  // and hang the structure below it.
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -thickness, 0)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = elevationMm * MM_TO_M
  mesh.receiveShadow = true
  return mesh
}

function place(anchorMm, bearingDegrees, along, across) {
  const radians = (bearingDegrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    anchorMm[0] + cos * along - sin * across,
    anchorMm[1] + sin * along + cos * across,
  ]
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
function buildWall(wall, level, openings, materials) {
  const group = new THREE.Group()
  const points = wall.polyline ?? []
  if (points.length < 2) return group

  const height = wall.height ?? 2700
  const thickness = wall.thickness ?? 150
  const base = wall.base_elevation ?? level.elevation ?? 0
  const material = materials.resolve(wall.material_id)
  const marks = cumulativeLengths(points)

  for (const run of wallSolidRuns(wall, openings, height)) {
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = Math.max(run.from, marks[index])
      const end = Math.min(run.to, marks[index + 1])
      if (end - start <= 1e-6) continue

      const centre = pointAtDistanceAlong(points, (start + end) / 2)
      const bearing =
        (Math.atan2(
          points[index + 1][1] - points[index][1],
          points[index + 1][0] - points[index][0],
        ) *
          180) /
        Math.PI
      const mesh = box(
        [end - start, thickness, run.top - run.base],
        centre,
        base + run.base,
        bearing,
        material,
      )
      if (mesh) group.add(mesh)
    }
  }
  return group
}

function buildOpening(opening, wall, level, materials) {
  const group = new THREE.Group()
  const points = wall?.polyline ?? []
  if (points.length < 2) return group

  const position = opening.position ?? 0
  const width = opening.width ?? 900
  const height = opening.height ?? 2100
  const sill = opening.sill_height ?? 0
  const thickness = (wall.thickness ?? 150) + 20
  const base = wall.base_elevation ?? level.elevation ?? 0
  const anchor = pointAtDistanceAlong(points, position)
  const bearing = bearingAtDistanceAlong(points, position)

  const frame = materials.resolve('mat-frame')
  const glass = materials.resolve('mat-glass')
  const metal = materials.resolve('mat-metal')

  const isWindow = ['window', 'fixed_window', 'bay_window'].includes(opening.kind)

  // Jambs, head, and a sill for a window that has one.
  for (const side of [-1, 1]) {
    const mesh = box(
      [FRAME_SECTION_MM, thickness, height],
      place(anchor, bearing, side * (width / 2 - FRAME_SECTION_MM / 2), 0),
      base + sill,
      bearing,
      frame,
    )
    if (mesh) group.add(mesh)
  }
  const head = box(
    [width, thickness, FRAME_SECTION_MM],
    anchor,
    base + sill + height - FRAME_SECTION_MM,
    bearing,
    frame,
  )
  if (head) group.add(head)

  if (isWindow) {
    if (sill > 0) {
      const sillMesh = box(
        [width + 60, thickness + 60, 40],
        anchor,
        base + sill - 40,
        bearing,
        frame,
      )
      if (sillMesh) group.add(sillMesh)
    }
    const pane = box(
      [
        Math.max(50, width - 2 * FRAME_SECTION_MM),
        GLASS_THICKNESS_MM,
        Math.max(50, height - 2 * FRAME_SECTION_MM),
      ],
      anchor,
      base + sill + FRAME_SECTION_MM,
      bearing,
      glass,
    )
    if (pane) group.add(pane)
    return group
  }

  if (opening.kind === 'passage') return group

  const clearWidth = width - 2 * FRAME_SECTION_MM
  const clearHeight = height - FRAME_SECTION_MM
  if (clearWidth <= 0 || clearHeight <= 0) return group
  const leafMaterial = materials.resolve(opening.material_id || 'mat-door-leaf')

  if (opening.kind === 'double_door') {
    const half = clearWidth / 2
    for (const side of [-1, 1]) {
      const leaf = box(
        [half, LEAF_THICKNESS_MM, clearHeight],
        place(anchor, bearing, (side * half) / 2, 0),
        base,
        bearing,
        leafMaterial,
      )
      if (leaf) group.add(leaf)
    }
    const handle = box(
      [120, 60, 30],
      place(anchor, bearing, 0, 40),
      base + 1050,
      bearing,
      metal,
    )
    if (handle) group.add(handle)
    return group
  }

  if (opening.kind === 'sliding_door') {
    for (const [side, offset] of [
      [-1, -30],
      [1, 30],
    ]) {
      const panel = box(
        [clearWidth * 0.55, LEAF_THICKNESS_MM * 0.7, clearHeight],
        place(anchor, bearing, side * clearWidth * 0.22, offset),
        base,
        bearing,
        leafMaterial,
      )
      if (panel) group.add(panel)
    }
    return group
  }

  if (opening.kind === 'garage_door') {
    const band = clearHeight / 4
    for (let index = 0; index < 4; index += 1) {
      const panel = box(
        [clearWidth, LEAF_THICKNESS_MM, band * 0.9],
        anchor,
        base + index * band,
        bearing,
        leafMaterial,
      )
      if (panel) group.add(panel)
    }
    return group
  }

  // A single leaf. Hinged at the side the swing names, and ajar ONLY when the
  // swing is actually known — a leaf drawn wide open on an unknown swing is how
  // a door ends up opening into a shower.
  const swing = opening.swing || 'unknown'
  const hingeSide = swing.startsWith('left') ? -1 : 1
  const outward = swing.endsWith('_out') ? 1 : -1
  const known = ['left_in', 'left_out', 'right_in', 'right_out'].includes(swing)
  const ajar = known ? LEAF_AJAR_DEGREES : 0

  const hinge = place(anchor, bearing, (hingeSide * clearWidth) / 2, 0)
  const leafBearing = bearing + -hingeSide * outward * ajar
  const centre = place(hinge, leafBearing, (-hingeSide * clearWidth) / 2, 0)

  const leaf = box(
    [clearWidth, LEAF_THICKNESS_MM, clearHeight],
    centre,
    base,
    leafBearing,
    leafMaterial,
  )
  if (leaf) group.add(leaf)
  const handle = box(
    [120, 55, 28],
    place(centre, leafBearing, -hingeSide * (clearWidth / 2 - 90), 45),
    base + 1050,
    leafBearing,
    metal,
  )
  if (handle) group.add(handle)
  return group
}

// A spiral's tread angle, and the newel it winds round. Mirrors
// `blender/geometry/stairs.py`; see the note there on why this is fixed at 30
// degrees rather than derived from the step count.
const SPIRAL_DEGREES_PER_STEP = 30
const SPIRAL_NEWEL_DIAMETER_MM = 150
const SPIRAL_INNER_CLEARANCE_MM = 40

/** The smallest room whose bounding box contains `point`, or null. */
function roomAround(level, point) {
  let best = null
  let bestArea = null
  for (const room of level.rooms ?? []) {
    const polygon = room.polygon ?? []
    if (polygon.length < 3) continue
    const xs = polygon.map((p) => p[0])
    const ys = polygon.map((p) => p[1])
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
    if (point[0] < x0 || point[0] > x1 || point[1] < y0 || point[1] > y1) continue
    const area = (x1 - x0) * (y1 - y0)
    if (bestArea === null || area < bestArea) {
      best = { x0, x1, y0, y1 }
      bestArea = area
    }
  }
  return best
}

/**
 * Which side the second flight of a turning stair goes: +1 or -1.
 *
 * Both are geometrically valid and the document says nothing, so the stair's
 * own room decides - whichever side keeps the return flight nearer the middle
 * of it. Mirrors `_turn_sign` in `blender/geometry/stairs.py`; the two engines
 * must agree or the same stair turns opposite ways in the viewer and the
 * thumbnail.
 */
function turnSign(level, start, bearing, offset) {
  const room = roomAround(level, start)
  if (!room) return 1
  const centre = [(room.x0 + room.x1) / 2, (room.y0 + room.y1) / 2]
  const distanceFor = (sign) => {
    const [x, y] = place(start, bearing, 0, sign * offset)
    return (x - centre[0]) ** 2 + (y - centre[1]) ** 2
  }
  return distanceFor(1) <= distanceFor(-1) ? 1 : -1
}

/** How many steps come before the landing. */
function turnIndex(stair, steps, tread) {
  for (const landing of stair.landings ?? []) {
    const along = Number(landing?.along)
    if (Number.isFinite(along) && along > 0 && tread > 0) {
      const index = Math.round(along / tread)
      if (index >= 1 && index < steps) return index
    }
  }
  return Math.max(1, Math.floor(steps / 2))
}

/**
 * One straight run of `count` steps, appended to `group`.
 *
 * `firstIndex` is how many steps were climbed before this flight, so the second
 * flight of a turning stair continues the rise rather than restarting it.
 */
function addFlight(
  group,
  { anchor, bearing, runWidth, tread, riser, count, firstIndex, elevation, direction, material },
) {
  for (let index = 0; index < count; index += 1) {
    const along = index * tread + tread / 2
    const stepBase = elevation + direction * (firstIndex + index + 1) * riser

    const riserMesh = box(
      [runWidth, TREAD_THICKNESS_MM, riser],
      place(anchor, bearing, along + tread / 2, 0),
      stepBase - riser,
      bearing + 90,
      material,
    )
    if (riserMesh) group.add(riserMesh)

    const treadMesh = box(
      [runWidth, tread + NOSING_MM, TREAD_THICKNESS_MM],
      place(anchor, bearing, along, 0),
      stepBase - TREAD_THICKNESS_MM,
      bearing + 90,
      material,
    )
    if (treadMesh) group.add(treadMesh)
  }
}

/**
 * A stair, as the shape its `kind` names.
 *
 * THIS FILE AND `blender/geometry/stairs.py` MUST AGREE. Both build stairs from
 * the same parameters and the user sees both - the viewer while editing, the
 * thumbnail and the GLB afterwards. Both previously ignored `kind` and built one
 * straight flight for everything, which sent a U-shaped stair straight out of
 * its own stair hall and left a spiral emergency stair with no curve in it.
 */
function buildStair(stair, level, materials) {
  const group = new THREE.Group()
  const start = stair.start ?? [0, 0]
  const bearing = stair.direction ?? 0
  const runWidth = stair.run_width ?? 1000
  const tread = stair.tread_depth ?? 280
  const riser = stair.riser_height ?? 175
  const steps = stair.step_count ?? 0
  const elevation = level.elevation ?? 0
  const direction = stair.goes_up === false ? -1 : 1
  const kind = String(stair.kind ?? 'straight').toLowerCase()
  const material = materials.resolve(stair.material_id || 'mat-stair')

  if (steps < 1 || tread <= 0 || riser <= 0) return group

  if (kind === 'spiral') {
    const inner = SPIRAL_NEWEL_DIAMETER_MM / 2 + SPIRAL_INNER_CLEARANCE_MM
    // `run_width` is the DIAMETER of a circular stair, not its radius - see the
    // Blender module. Halving it is what keeps a spiral inside its own well.
    const outer = Math.max(inner + 200, runWidth / 2)
    const treadLength = outer - inner
    const midRadius = (inner + outer) / 2
    const treadWidth =
      2 * midRadius * Math.sin((SPIRAL_DEGREES_PER_STEP * Math.PI) / 180 / 2)

    for (let index = 0; index < steps; index += 1) {
      const angle = bearing + direction * SPIRAL_DEGREES_PER_STEP * index
      const stepTop = elevation + direction * (index + 1) * riser
      const mesh = box(
        [treadLength, treadWidth, TREAD_THICKNESS_MM],
        place(start, angle, midRadius, 0),
        stepTop - TREAD_THICKNESS_MM,
        angle,
        material,
      )
      if (mesh) group.add(mesh)
    }

    const totalRise = Math.abs(steps * riser)
    const newel = cylinder(
      SPIRAL_NEWEL_DIAMETER_MM,
      Math.max(totalRise, riser),
      start,
      Math.min(elevation, elevation + direction * totalRise),
      material,
    )
    if (newel) group.add(newel)
    return group
  }

  if (kind === 'l_shape' || kind === 'u_shape') {
    const turn = kind === 'u_shape' ? 180 : 90
    const sign = turnSign(level, start, bearing, runWidth)
    const firstCount = turnIndex(stair, steps, tread)
    const secondCount = steps - firstCount
    const flightLength = firstCount * tread
    const landingTop = elevation + direction * firstCount * riser

    addFlight(group, {
      anchor: start,
      bearing,
      runWidth,
      tread,
      riser,
      count: firstCount,
      firstIndex: 0,
      elevation,
      direction,
      material,
    })

    let secondAnchor
    if (turn >= 180) {
      // A U turns back on itself: the landing spans both flights and the second
      // is offset sideways by one flight's width.
      const landing = box(
        [runWidth * 2, runWidth, TREAD_THICKNESS_MM],
        place(start, bearing, flightLength + runWidth / 2, (sign * runWidth) / 2),
        landingTop - TREAD_THICKNESS_MM,
        bearing + 90,
        material,
      )
      if (landing) group.add(landing)
      secondAnchor = place(start, bearing, flightLength + runWidth, sign * runWidth)
    } else {
      const landingCentre = place(start, bearing, flightLength + runWidth / 2, 0)
      const landing = box(
        [runWidth, runWidth, TREAD_THICKNESS_MM],
        landingCentre,
        landingTop - TREAD_THICKNESS_MM,
        bearing + 90,
        material,
      )
      if (landing) group.add(landing)
      secondAnchor = place(landingCentre, bearing + sign * turn, runWidth / 2, 0)
    }

    addFlight(group, {
      anchor: secondAnchor,
      bearing: bearing + sign * turn,
      runWidth,
      tread,
      riser,
      count: secondCount,
      firstIndex: firstCount,
      elevation,
      direction,
      material,
    })
    return group
  }

  // `straight`, `unknown`, or anything the schema gains later.
  addFlight(group, {
    anchor: start,
    bearing,
    runWidth,
    tread,
    riser,
    count: steps,
    firstIndex: 0,
    elevation,
    direction,
    material,
  })

  for (const landing of stair.landings ?? []) {
    const mesh = box(
      [landing.width ?? runWidth, landing.depth ?? runWidth, TREAD_THICKNESS_MM],
      place(start, bearing, landing.along ?? 0, 0),
      elevation + direction * (landing.rise ?? 0) - TREAD_THICKNESS_MM,
      bearing + 90,
      material,
    )
    if (mesh) group.add(mesh)
  }
  return group
}

function buildColumn(column, level, materials) {
  const group = new THREE.Group()
  const size = column.size ?? [300, 300]
  const height = column.height ?? 2700
  const base = column.base_elevation ?? level.elevation ?? 0
  const material = materials.resolve(column.material_id || 'mat-concrete')

  const mesh =
    column.shape === 'circular'
      ? cylinder(size[0], height, column.position ?? [0, 0], base, material)
      : box(
          [size[0], size[1], height],
          column.position ?? [0, 0],
          base,
          column.rotation ?? 0,
          material,
        )
  if (mesh) group.add(mesh)
  return group
}

function buildBeam(beam, level, materials) {
  const group = new THREE.Group()
  const start = beam.start ?? [0, 0]
  const end = beam.end ?? [0, 0]
  const length = distance(start, end)
  if (length <= 1e-6) return group

  const bearing = (Math.atan2(end[1] - start[1], end[0] - start[0]) * 180) / Math.PI
  const mesh = box(
    [length, beam.width ?? 250, beam.depth ?? 400],
    [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
    (level.elevation ?? 0) + (beam.soffit_elevation ?? 2700),
    bearing,
    materials.resolve(beam.material_id || 'mat-concrete'),
  )
  if (mesh) group.add(mesh)
  return group
}

function buildRamp(ramp, level, materials) {
  const group = new THREE.Group()
  const start = ramp.start ?? [0, 0]
  const end = ramp.end ?? [0, 0]
  const length = distance(start, end)
  if (length <= 1e-6) return group

  const bearing = (Math.atan2(end[1] - start[1], end[0] - start[0]) * 180) / Math.PI
  const width = ramp.width ?? 1200
  const rise = ramp.rise ?? 150
  const material = materials.resolve(ramp.material_id || 'mat-concrete')
  const stepLength = length / RAMP_STEPS

  // A ramp is a sloping plane and a box is not, so it is approximated by a
  // short flight of very shallow steps — the same approach the Blender half
  // takes, and for the same reason: one mesh-construction path, not two.
  for (let index = 0; index < RAMP_STEPS; index += 1) {
    const fraction = (index + 0.5) / RAMP_STEPS
    const mesh = box(
      [stepLength * 1.02, width, 60 + rise * fraction],
      [
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction,
      ],
      (level.elevation ?? 0) - 60,
      bearing,
      material,
    )
    if (mesh) group.add(mesh)
  }
  return group
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
/**
 * Build the whole model.
 *
 * Returns `{ root, materials, index, categories, levelIds, bounds }`:
 *
 *   - `root` — the group to add to a scene.
 *   - `materials` — the cache, so `disposeModel` can free it.
 *   - `index` — `Map<elementId, THREE.Group>`, which is what selection,
 *     visibility and isolation work through rather than walking the graph.
 *   - `categories` — `Map<categoryId, THREE.Group[]>` for the category toggles.
 *   - `levelIds` — in document order, for the floor-isolation control.
 */
export function buildModel(
  document,
  { catalog = null, outlines = true, physicallyBased = true } = {},
) {
  const root = new THREE.Group()
  root.name = 'floorplan3d-model'

  const materials = new MaterialCache(document, { physicallyBased })
  const index = new Map()
  const categories = new Map(CATEGORIES.map((category) => [category.id, []]))
  const flagged = flaggedElementIds(document)
  const levelIds = []

  const register = (group, entry) => {
    if (!group || group.children.length === 0) return
    group.userData.element = entry
    group.name = `${entry.kind}:${entry.id}`
    index.set(entry.id, group)
    categories.get(entry.category)?.push(group)
    if (outlines) attachOutline(group)
    root.add(group)
  }

  for (const level of levels(document)) {
    levelIds.push(level.id)
    const elevation = level.elevation ?? 0

    // Slab.
    const voids = (level.rooms ?? [])
      .filter((room) => isVoidRoom(room) && (room.polygon ?? []).length >= 3)
      .map((room) => room.polygon)
    const slab = slabFromPolygon(
      level.slab_polygon,
      elevation,
      level.slab_thickness ?? 150,
      materials.resolve(level.slab_material_id),
      voids,
    )
    if (slab) {
      const group = new THREE.Group()
      group.add(slab)
      register(group, {
        id: level.id,
        kind: 'slab',
        category: 'slab',
        levelId: level.id,
        label: `Slab · ${level.name || 'Level'}`,
        bucket: null,
      })
    }

    // Room floor finishes. What makes a room clickable at all — without them a
    // room exists in the tree and has no geometry to select.
    for (const room of level.rooms ?? []) {
      // A void has no floor to finish; it was cut out of the slab above.
      if (isVoidRoom(room)) continue
      const finish = slabFromPolygon(
        room.polygon,
        elevation + FINISH_LIFT_MM,
        FINISH_THICKNESS_MM,
        materials.resolve(room.floor_material_id),
      )
      if (!finish) continue
      const group = new THREE.Group()
      group.add(finish)

      // A LIFT NEEDS A CAR TO READ AS A LIFT. Otherwise the most recognisable
      // object in a building's core renders as a 1.5 m square of floor,
      // indistinguishable from a cupboard. Built from the room's own polygon,
      // so it is where the drawing put it and the size the drawing made it, and
      // added to the ROOM's group so selecting it selects the lift - the car is
      // a depiction of that room, not an element of its own. Mirrors
      // `build_lift_cars` in `blender/geometry/structure.py`.
      if (LIFT_ROOM_TYPES.has(String(room.room_type ?? '').trim().toLowerCase())) {
        const xs = room.polygon.map((point) => point[0])
        const ys = room.polygon.map((point) => point[1])
        const car = box(
          [
            (Math.max(...xs) - Math.min(...xs)) * LIFT_CAR_PLAN_FRACTION,
            (Math.max(...ys) - Math.min(...ys)) * LIFT_CAR_PLAN_FRACTION,
            (level.floor_to_floor ?? 3000) * LIFT_CAR_HEIGHT_FRACTION,
          ],
          [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2],
          elevation,
          0,
          materials.resolve('mat-metal'),
        )
        if (car) group.add(car)
      }

      register(group, {
        id: room.id,
        kind: 'room',
        category: 'room',
        levelId: level.id,
        label: room.name || 'Room',
        bucket: 'rooms',
        flagged: flagged.has(room.id),
      })
    }

    for (const wall of level.walls ?? []) {
      register(buildWall(wall, level, openingsOnWall(level, wall.id), materials), {
        id: wall.id,
        kind: 'wall',
        category: 'wall',
        levelId: level.id,
        label: elementLabel({ element: wall, kind: 'wall' }),
        bucket: 'walls',
        flagged: flagged.has(wall.id),
      })
    }

    const wallsById = new Map((level.walls ?? []).map((wall) => [wall.id, wall]))
    for (const bucket of ['doors', 'windows', 'openings']) {
      for (const opening of level[bucket] ?? []) {
        const host = wallsById.get(opening.host_wall_id)
        if (!host) continue
        register(buildOpening(opening, host, level, materials), {
          id: opening.id,
          kind: ELEMENT_KINDS[bucket],
          category: bucket === 'windows' ? 'window' : 'door',
          levelId: level.id,
          label: elementLabel({ element: opening, kind: ELEMENT_KINDS[bucket] }),
          bucket,
          flagged: flagged.has(opening.id),
        })
      }
    }

    for (const stair of level.stairs ?? []) {
      register(buildStair(stair, level, materials), {
        id: stair.id,
        kind: 'stair',
        category: 'stair',
        levelId: level.id,
        label: elementLabel({ element: stair, kind: 'stair' }),
        bucket: 'stairs',
        flagged: flagged.has(stair.id),
      })
    }
    for (const ramp of level.ramps ?? []) {
      register(buildRamp(ramp, level, materials), {
        id: ramp.id,
        kind: 'ramp',
        category: 'stair',
        levelId: level.id,
        label: 'Ramp',
        bucket: 'ramps',
        flagged: flagged.has(ramp.id),
      })
    }
    for (const column of level.columns ?? []) {
      register(buildColumn(column, level, materials), {
        id: column.id,
        kind: 'column',
        category: 'structure',
        levelId: level.id,
        label: 'Column',
        bucket: 'columns',
        flagged: flagged.has(column.id),
      })
    }
    for (const beam of level.beams ?? []) {
      register(buildBeam(beam, level, materials), {
        id: beam.id,
        kind: 'beam',
        category: 'structure',
        levelId: level.id,
        label: 'Beam',
        bucket: 'beams',
        flagged: flagged.has(beam.id),
      })
    }

    for (const bucket of ['furniture', 'fixtures']) {
      for (const item of level[bucket] ?? []) {
        register(
          buildFurnitureGroup(item, level, {
            catalog,
            materials,
            box,
            cylinder,
          }),
          {
            id: item.id,
            kind: ELEMENT_KINDS[bucket],
            category: bucket === 'fixtures' ? 'fixture' : 'furniture',
            levelId: level.id,
            label: elementLabel({ element: item, kind: ELEMENT_KINDS[bucket] }),
            bucket,
            flagged: flagged.has(item.id),
          },
        )
      }
    }
  }

  return {
    root,
    materials,
    index,
    categories,
    levelIds,
    bounds: new THREE.Box3().setFromObject(root),
  }
}

/**
 * Free everything a model allocated.
 *
 * Geometries and materials are not garbage-collected: they live on the GPU
 * until `dispose()` is called. A viewer that rebuilds on every edit and does
 * not do this leaks a scene per keystroke and eventually loses its WebGL
 * context.
 */
export function disposeModel(model) {
  if (!model) return
  model.root?.traverse((child) => {
    if (child.isMesh || child.isLineSegments) {
      child.geometry?.dispose()
      // Outline materials are per-object and are not in the cache.
      if (child.isLineSegments) child.material?.dispose()
    }
  })
  model.materials?.dispose()
  model.index?.clear()
  model.categories?.clear()
}

export { toWorld }
