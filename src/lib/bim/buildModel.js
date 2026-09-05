import * as THREE from 'three'

/**
 * BimPlan JSON → a Three.js scene graph, with one selectable element per row of
 * the plan.
 *
 * NO IFC IN THE WAY. An IFC file is an interchange format — it matters for
 * exporting to Revit, Archicad or a checker. Nothing about drawing the model in
 * a browser needs one, and routing through IFC would mean the viewer could not
 * exist until the IFC writer did. The plan JSON is the source of truth
 * (backend/bim/schema.py); this reads it directly, and an IFC export can be
 * added later as an export.
 *
 * COORDINATES
 * -----------
 * Plan is 2D, origin bottom-left, +x right, +y up, meters. Three.js is Y-up.
 * The mapping is applied in exactly one place, `toWorld` below:
 *
 *     plan (x, y) at height h  →  world (x, h, -y)
 *
 * so a wall's plan angle becomes a rotation of `atan2(uy, ux)` about Y, and the
 * top view reads the same way round as the drawing.
 *
 * OPENINGS ARE CUT BY SPLITTING, NOT BY BOOLEAN SUBTRACTION
 * ---------------------------------------------------------
 * A wall with a door in it is built as several boxes — the solid run before the
 * opening, the run after it, the piece under a window sill and the piece over a
 * lintel — rather than as one box with a hole subtracted from it. Boolean CSG in
 * the browser is slow, fragile on coplanar faces, and needs a library; box
 * splitting is exact for rectangular openings, which is every opening this
 * schema can express. See `wallSegments`.
 *
 * EVERY MESH CARRIES ITS ELEMENT
 * ------------------------------
 * `mesh.userData.element` holds `{ id, kind, name, ifcClass, levelId }`, which
 * is what the element tree lists, what a click resolves to, and what isolate
 * and hide filter on. One wall can be several meshes; they share one element,
 * so selecting any of them selects the wall.
 */

// Materials are shared across every mesh of a kind — a few hundred meshes with
// one material each would be a few hundred shader programs.
const MATERIALS = {
  exterior: new THREE.MeshLambertMaterial({ color: 0xd6d3cd }),
  interior: new THREE.MeshLambertMaterial({ color: 0xe4e2dd }),
  slab: new THREE.MeshLambertMaterial({ color: 0xb9b5ad }),
  room: new THREE.MeshLambertMaterial({
    color: 0xc9d4e3,
    transparent: true,
    opacity: 0.55,
  }),
  door: new THREE.MeshLambertMaterial({ color: 0x9a6b43 }),
  glass: new THREE.MeshLambertMaterial({
    color: 0x9ec7e8,
    transparent: true,
    opacity: 0.4,
  }),
  fixture: new THREE.MeshLambertMaterial({ color: 0xa8b0b8 }),
}

export const HIGHLIGHT_COLOR = 0x1677ff
export const FLAGGED_COLOR = 0xdc2626

/** The one place the plan's 2D frame becomes Three.js's 3D one. */
function toWorld(x, y, height = 0) {
  return new THREE.Vector3(x, height, -y)
}

function wallDirection(wall) {
  const dx = wall.end[0] - wall.start[0]
  const dy = wall.end[1] - wall.start[1]
  const length = Math.hypot(dx, dy)
  if (length < 1e-9) return null
  return { ux: dx / length, uy: dy / length, length }
}

/**
 * Split one wall into the solid boxes that remain once its openings are cut.
 *
 * Returns `{ from, to, base, top }` runs in wall-local coordinates: `from`/`to`
 * measured along the wall from its start, `base`/`top` above the floor. The
 * caller turns each into a box.
 *
 * Overlapping or out-of-range openings cannot reach here — the backend grader
 * repairs both before the plan is stored — but the clamping below is kept
 * because this also runs on a plan a user has edited in the browser, which the
 * grader has not seen yet.
 */
export function wallSegments(wall, openings, wallHeight) {
  const direction = wallDirection(wall)
  if (!direction) return []

  const { length } = direction
  const sorted = [...openings]
    .map((opening) => ({
      from: Math.max(0, Math.min(opening.offset, length)),
      to: Math.max(0, Math.min(opening.offset + opening.width, length)),
      sill: Math.max(0, opening.sill ?? 0),
      head: Math.min(wallHeight, (opening.sill ?? 0) + opening.height),
    }))
    .filter((opening) => opening.to - opening.from > 1e-6)
    .sort((a, b) => a.from - b.from)

  const runs = []
  let cursor = 0

  for (const opening of sorted) {
    // The solid wall before this opening.
    if (opening.from - cursor > 1e-6) {
      runs.push({ from: cursor, to: opening.from, base: 0, top: wallHeight })
    }
    // Under a window sill.
    if (opening.sill > 1e-6) {
      runs.push({ from: opening.from, to: opening.to, base: 0, top: opening.sill })
    }
    // Over the head — the lintel run.
    if (wallHeight - opening.head > 1e-6) {
      runs.push({ from: opening.from, to: opening.to, base: opening.head, top: wallHeight })
    }
    cursor = Math.max(cursor, opening.to)
  }

  if (length - cursor > 1e-6) {
    runs.push({ from: cursor, to: length, base: 0, top: wallHeight })
  }

  return runs
}

function boxAlongWall(wall, run, material, element) {
  const direction = wallDirection(wall)
  const spanLength = run.to - run.from
  const spanHeight = run.top - run.base
  if (spanLength <= 1e-6 || spanHeight <= 1e-6) return null

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(spanLength, spanHeight, wall.thickness),
    material,
  )

  const midpoint = run.from + spanLength / 2
  const cx = wall.start[0] + direction.ux * midpoint
  const cy = wall.start[1] + direction.uy * midpoint
  mesh.position.copy(toWorld(cx, cy, run.base + spanHeight / 2))
  // A BoxGeometry's local X runs along its width; rotating by the wall's plan
  // angle about Y is what lays that width along the wall.
  mesh.rotation.y = Math.atan2(direction.uy, direction.ux)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.element = element
  return mesh
}

function polygonShape(polygon) {
  const shape = new THREE.Shape()
  polygon.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return shape
}

/**
 * A horizontal slab from a plan polygon.
 *
 * `ExtrudeGeometry` builds in the XY plane and extrudes along +Z; rotating
 * -90° about X maps that to the plan's frame — shape (x, y, d) becomes world
 * (x, d, -y) — which is the same mapping `toWorld` applies to everything else.
 */
function slabFromPolygon(polygon, { thickness, top, material, element }) {
  if (!Array.isArray(polygon) || polygon.length < 3) return null

  const geometry = new THREE.ExtrudeGeometry(polygonShape(polygon), {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, top - thickness, 0)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.userData.element = element
  return mesh
}

const OPENING_IFC_CLASS = {
  door: 'IFCDOOR',
  double_door: 'IFCDOOR',
  sliding_door: 'IFCDOOR',
  window: 'IFCWINDOW',
  opening: 'IFCOPENINGELEMENT',
}

const OPENING_KIND_LABEL = {
  door: 'Door',
  double_door: 'Double door',
  sliding_door: 'Sliding door',
  window: 'Window',
  opening: 'Opening',
}


// --------------------------------------------------------------------------
// Furniture
// --------------------------------------------------------------------------
// Colours by material family rather than by category, so a new category picks
// up a sensible look without a new entry here.
const FURNITURE_MATERIALS = {
  wood: new THREE.MeshLambertMaterial({ color: 0xb08968 }),
  fabric: new THREE.MeshLambertMaterial({ color: 0x76818e }),
  ceramic: new THREE.MeshLambertMaterial({ color: 0xf1f4f7 }),
  metal: new THREE.MeshLambertMaterial({ color: 0x99a2ac }),
  foliage: new THREE.MeshLambertMaterial({ color: 0x5c8f63 }),
  generic: new THREE.MeshLambertMaterial({ color: 0xa8b0b8 }),
}

/**
 * A fixture's shape, as a few boxes.
 *
 * Local frame: x runs along `width` and z along `depth`, both centred on the
 * fixture's position; y is up from the floor. Local -z is the BACK of anything
 * that has one, so a chair's back and a sofa's back agree.
 *
 * WHY SHAPES AT ALL. Every fixture used to be one box, which is fine for a
 * cabinet and useless for everything else: a chair read as a solid cube, and a
 * WC as a lump. These are still only boxes — three or four of them — but three
 * boxes is the difference between "there is furniture here" and "there is a
 * desk with a chair at it".
 *
 * WHY SO FEW BOXES EACH. An open-plan floor can carry a hundred workstations.
 * At four boxes per item that is 800 extra meshes, which the viewer handles;
 * at twelve it would not. Chairs get a pedestal rather than four legs, desks
 * get two side panels rather than four legs, for exactly that reason.
 *
 * `category` is free text from the extractor, so matching is by substring and
 * anything unrecognised falls back to a single box — never to nothing.
 */
export function fixtureParts(category, width, depth, height) {
  const name = String(category || '').toLowerCase()
  const has = (...keys) => keys.some((key) => name.includes(key))

  // Order matters: the most specific category that matches wins, so
  // "reception_desk" is a desk and "shower_tray" is a shower.
  if (has('wc', 'toilet', 'water_closet')) {
    const bowlDepth = Math.max(depth * 0.62, 0.05)
    return [
      { w: width * 0.72, h: height * 0.5, d: bowlDepth, z: depth / 2 - bowlDepth / 2, tone: 'ceramic' },
      { w: width, h: height, d: depth * 0.3, y: height / 2, z: -depth / 2 + depth * 0.15, tone: 'ceramic' },
    ]
  }

  if (has('urinal')) {
    // Wall-hung: the box hangs from `height` down, it does not stand on the floor.
    const tall = Math.min(height * 0.55, 0.7)
    return [{ w: width, h: tall, d: depth, y: height - tall / 2, tone: 'ceramic' }]
  }

  if (has('basin', 'washbasin', 'lavatory', 'sink')) {
    const bowl = Math.min(0.18, height * 0.3)
    return [
      { w: width, h: bowl, d: depth, y: height - bowl / 2, tone: 'ceramic' },
      { w: width * 0.25, h: height - bowl, d: depth * 0.25, y: (height - bowl) / 2, tone: 'ceramic' },
    ]
  }

  if (has('shower')) {
    return [
      { w: width, h: 0.06, d: depth, y: 0.03, tone: 'ceramic' },
      { w: 0.04, h: height, d: depth, x: -width / 2 + 0.02, y: height / 2, tone: 'metal' },
    ]
  }

  if (has('bath', 'tub')) {
    return [
      { w: width, h: height, d: depth, y: height / 2, tone: 'ceramic' },
      { w: width - 0.16, h: 0.06, d: depth - 0.16, y: height - 0.02, tone: 'metal' },
    ]
  }

  if (has('bed')) {
    const base = Math.min(0.3, height * 0.6)
    return [
      { w: width, h: base, d: depth, y: base / 2, tone: 'wood' },
      { w: width - 0.06, h: height - base, d: depth - 0.06, y: base + (height - base) / 2, tone: 'fabric' },
      { w: width * 0.7, h: 0.1, d: depth * 0.16, y: height + 0.05, z: -depth / 2 + depth * 0.1, tone: 'ceramic' },
    ]
  }

  if (has('sofa', 'couch', 'settee')) {
    const seat = Math.min(0.4, height * 0.55)
    const backHeight = Math.max(height - seat, 0.1)
    return [
      { w: width, h: seat, d: depth, y: seat / 2, tone: 'fabric' },
      { w: width, h: backHeight, d: depth * 0.22, y: seat + backHeight / 2, z: -depth / 2 + depth * 0.11, tone: 'fabric' },
      { w: width * 0.12, h: backHeight * 0.7, d: depth, y: seat + backHeight * 0.35, x: -width / 2 + width * 0.06, tone: 'fabric' },
      { w: width * 0.12, h: backHeight * 0.7, d: depth, y: seat + backHeight * 0.35, x: width / 2 - width * 0.06, tone: 'fabric' },
    ]
  }

  if (has('chair', 'seat', 'stool')) {
    const seat = Math.min(0.45, height * 0.5)
    const backHeight = Math.max(height - seat, 0.05)
    const parts = [
      { w: width, h: 0.07, d: depth, y: seat, tone: 'fabric' },
      { w: width * 0.22, h: seat, d: depth * 0.22, y: seat / 2, tone: 'metal' },
    ]
    // A stool has no back; everything else does.
    if (!has('stool')) {
      parts.push({
        w: width, h: backHeight, d: 0.07,
        y: seat + backHeight / 2, z: -depth / 2 + 0.035, tone: 'fabric',
      })
    }
    return parts
  }

  if (has('desk', 'workstation', 'table', 'bench')) {
    const top = 0.05
    const legHeight = Math.max(height - top, 0.05)
    return [
      { w: width, h: top, d: depth, y: height - top / 2, tone: 'wood' },
      { w: 0.06, h: legHeight, d: depth * 0.85, x: -width / 2 + 0.06, y: legHeight / 2, tone: 'metal' },
      { w: 0.06, h: legHeight, d: depth * 0.85, x: width / 2 - 0.06, y: legHeight / 2, tone: 'metal' },
    ]
  }

  if (has('partition', 'screen', 'divider')) {
    const thickness = Math.min(depth, 0.08)
    return [{ w: width, h: height, d: thickness, y: height / 2, tone: 'fabric' }]
  }

  if (has('plant', 'tree')) {
    const pot = Math.min(0.35, height * 0.3)
    return [
      { w: width * 0.6, h: pot, d: depth * 0.6, y: pot / 2, tone: 'wood' },
      { w: width, h: height - pot, d: depth, y: pot + (height - pot) / 2, tone: 'foliage' },
    ]
  }

  if (has('counter', 'reception', 'cabinet', 'wardrobe', 'cupboard', 'shelf', 'storage')) {
    return [{ w: width, h: height, d: depth, y: height / 2, tone: 'wood' }]
  }

  if (has('fridge', 'stove', 'oven', 'washer', 'equipment')) {
    return [{ w: width, h: height, d: depth, y: height / 2, tone: 'metal' }]
  }

  return [{ w: width, h: height, d: depth, y: height / 2, tone: 'generic' }]
}

function fixtureGroup(fixture, base, element, flagged) {
  const group = new THREE.Group()
  const [width, depth] = fixture.size
  const parts = fixtureParts(fixture.category, width, depth, fixture.height)

  for (const part of parts) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(part.w, 0.01),
        Math.max(part.h, 0.01),
        Math.max(part.d, 0.01),
      ),
      flagged
        ? FURNITURE_MATERIALS.generic.clone()
        : (FURNITURE_MATERIALS[part.tone] ?? FURNITURE_MATERIALS.generic).clone(),
    )
    if (flagged) mesh.material.color.setHex(FLAGGED_COLOR)
    mesh.position.set(part.x ?? 0, part.y ?? part.h / 2, part.z ?? 0)
    mesh.castShadow = true
    // Every sub-mesh carries the SAME element, so clicking a chair's back and
    // clicking its seat both select the chair.
    mesh.userData.element = element
    group.add(mesh)
  }

  group.position.copy(toWorld(fixture.position[0], fixture.position[1], base))
  group.rotation.y = ((fixture.rotation ?? 0) * Math.PI) / 180
  return group
}

/**
 * Every element in the plan, in one flat list.
 *
 * This is the SINGLE definition of what an element is — its id, its name, its
 * IFC class and the level it belongs to. `buildModel` looks meshes up in it
 * rather than inventing elements as it builds, so the tree can never list an
 * element the model does not contain, or name one differently.
 *
 * Pure: no Three.js, no geometry. The tree can call it without a canvas.
 */
export function listElements(plan) {
  const elements = []

  for (const level of plan?.levels ?? []) {
    if (level.outline?.length >= 3) {
      elements.push({
        id: `${level.id}-SLAB`,
        kind: 'slab',
        name: `${level.name} slab`,
        ifcClass: 'IFCSLAB',
        levelId: level.id,
      })
    }

    for (const room of plan?.rooms ?? []) {
      if (room.level_id !== level.id) continue
      elements.push({
        id: room.id,
        kind: 'room',
        name: room.name,
        ifcClass: 'IFCSPACE',
        levelId: level.id,
      })
    }

    for (const wall of plan?.walls ?? []) {
      if (wall.level_id !== level.id) continue
      elements.push({
        id: wall.id,
        kind: 'wall',
        name: `${wall.type === 'exterior' ? 'Exterior' : 'Interior'} wall ${wall.id}`,
        ifcClass: 'IFCWALLSTANDARDCASE',
        levelId: level.id,
      })
    }

    const wallLevel = new Map(
      (plan?.walls ?? []).map((wall) => [wall.id, wall.level_id]),
    )
    for (const opening of plan?.openings ?? []) {
      if (wallLevel.get(opening.wall_id) !== level.id) continue
      elements.push({
        id: opening.id,
        kind: 'opening',
        name: `${OPENING_KIND_LABEL[opening.type] ?? 'Opening'} ${opening.id}`,
        ifcClass: OPENING_IFC_CLASS[opening.type] ?? 'IFCOPENINGELEMENT',
        levelId: level.id,
      })
    }

    for (const fixture of plan?.fixtures ?? []) {
      if (fixture.level_id !== level.id) continue
      elements.push({
        id: fixture.id,
        kind: 'fixture',
        name: `${fixture.category} ${fixture.id}`,
        ifcClass: 'IFCFURNISHINGELEMENT',
        levelId: level.id,
      })
    }
  }

  return elements
}


/**
 * Build the whole model.
 *
 * Returns `{ root, elements, bounds }` — the group to add to a scene, the flat
 * element list the tree renders, and the model's bounding box for framing the
 * camera. `flagged` is the set of element ids the grader could not repair; they
 * are tinted so a problem is visible in the model, not only in a list.
 */
export function buildModel(plan, { flagged = new Set() } = {}) {
  const root = new THREE.Group()
  root.name = 'bim-model'

  const elements = listElements(plan)
  const byId = new Map(elements.map((element) => [element.id, element]))
  // A missing entry would mean the catalogue and the builder had drifted apart;
  // the placeholder keeps the mesh selectable and makes the drift visible in
  // the tooltip instead of throwing halfway through a build.
  const register = (element) =>
    byId.get(element.id) ?? { ifcClass: 'IFCBUILDINGELEMENTPROXY', ...element }

  const levels = plan?.levels ?? []
  const wallsById = new Map((plan?.walls ?? []).map((wall) => [wall.id, wall]))
  const openingsByWall = new Map()
  for (const opening of plan?.openings ?? []) {
    if (!openingsByWall.has(opening.wall_id)) openingsByWall.set(opening.wall_id, [])
    openingsByWall.get(opening.wall_id).push(opening)
  }

  for (const level of levels) {
    const base = level.elevation ?? 0
    const wallHeight = level.wall_height ?? 2.7
    const slabThickness = level.slab_thickness ?? 0.15

    // -- floor slab ----------------------------------------------------
    if (level.outline?.length >= 3) {
      const element = register({
        id: `${level.id}-SLAB`,
        kind: 'slab',
        name: `${level.name} slab`,
        ifcClass: 'IFCSLAB',
        levelId: level.id,
      })
      const slab = slabFromPolygon(level.outline, {
        thickness: slabThickness,
        top: base,
        material: MATERIALS.slab.clone(),
        element,
      })
      if (slab) root.add(slab)
    }

    // -- rooms, as a thin coloured finish just above the slab ----------
    for (const room of plan?.rooms ?? []) {
      if (room.level_id !== level.id) continue
      const element = register({
        id: room.id,
        kind: 'room',
        name: room.name,
        ifcClass: 'IFCSPACE',
        levelId: level.id,
      })
      const finish = slabFromPolygon(room.polygon, {
        thickness: 0.02,
        // 2 cm above the slab top, so it is never coplanar with it — coplanar
        // faces produce the flickering that reads as a broken model.
        top: base + 0.03,
        material: MATERIALS.room.clone(),
        element,
      })
      if (finish) {
        if (flagged.has(room.id)) finish.material.color.setHex(FLAGGED_COLOR)
        root.add(finish)
      }
    }

    // -- walls ---------------------------------------------------------
    for (const wall of plan?.walls ?? []) {
      if (wall.level_id !== level.id) continue

      const element = register({
        id: wall.id,
        kind: 'wall',
        name: `${wall.type === 'exterior' ? 'Exterior' : 'Interior'} wall ${wall.id}`,
        ifcClass: 'IFCWALLSTANDARDCASE',
        levelId: level.id,
      })

      const height = wall.height ?? wallHeight
      const material =
        wall.type === 'exterior' || wall.type === 'retaining'
          ? MATERIALS.exterior.clone()
          : MATERIALS.interior.clone()
      if (flagged.has(wall.id)) material.color.setHex(FLAGGED_COLOR)

      for (const run of wallSegments(wall, openingsByWall.get(wall.id) ?? [], height)) {
        const mesh = boxAlongWall(
          wall,
          { ...run, base: run.base + base, top: run.top + base },
          material,
          element,
        )
        if (mesh) root.add(mesh)
      }
    }

    // -- door leaves and window panes, in the holes just cut -----------
    for (const opening of plan?.openings ?? []) {
      const wall = wallsById.get(opening.wall_id)
      if (!wall || wall.level_id !== level.id) continue
      const direction = wallDirection(wall)
      if (!direction) continue

      const element = register({
        id: opening.id,
        kind: 'opening',
        name: `${OPENING_KIND_LABEL[opening.type] ?? 'Opening'} ${opening.id}`,
        ifcClass: OPENING_IFC_CLASS[opening.type] ?? 'IFCOPENINGELEMENT',
        levelId: level.id,
      })

      // A doorless opening is a hole and nothing more — giving it a panel would
      // draw a door the drawing does not have.
      if (opening.type === 'opening') continue

      const isWindow = opening.type === 'window'
      const material = (isWindow ? MATERIALS.glass : MATERIALS.door).clone()
      if (flagged.has(opening.id)) material.color.setHex(FLAGGED_COLOR)

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          opening.width,
          opening.height,
          // Thinner than the wall so the leaf reads as sitting inside the
          // reveal rather than as part of the wall.
          wall.thickness * (isWindow ? 0.2 : 0.35),
        ),
        material,
      )
      const midpoint = opening.offset + opening.width / 2
      mesh.position.copy(
        toWorld(
          wall.start[0] + direction.ux * midpoint,
          wall.start[1] + direction.uy * midpoint,
          base + (opening.sill ?? 0) + opening.height / 2,
        ),
      )
      mesh.rotation.y = Math.atan2(direction.uy, direction.ux)
      mesh.userData.element = element
      root.add(mesh)
    }

    // -- fixtures ------------------------------------------------------
    for (const fixture of plan?.fixtures ?? []) {
      if (fixture.level_id !== level.id) continue

      const element = register({
        id: fixture.id,
        kind: 'fixture',
        name: `${fixture.category} ${fixture.id}`,
        ifcClass: 'IFCFURNISHINGELEMENT',
        levelId: level.id,
      })

      root.add(fixtureGroup(fixture, base, element, flagged.has(fixture.id)))
    }
  }

  const bounds = new THREE.Box3().setFromObject(root)
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 3, 5))

  return { root, elements, bounds }
}

/** Free every geometry and material in a model. Called when one is replaced. */
export function disposeModel(root) {
  if (!root) return
  root.traverse((child) => {
    if (!child.isMesh) return
    child.geometry?.dispose()
    if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
    else child.material?.dispose()
  })
}
