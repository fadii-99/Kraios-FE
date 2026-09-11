import * as THREE from 'three'

import {
  effectiveWallHeight,
  levels as modelLevels,
  materialById,
  openingsOnWall,
  polygonCentroid,
  wallAngleRadians,
  wallDirection,
  wallRuns,
} from '@/lib/experiments/floorplan3d/model'

/**
 * The architectural model → a Three.js scene graph, one selectable object per
 * row of the document.
 *
 * SKETCHUP-STYLE PRESENTATION, AND WHY
 * ------------------------------------
 * Light neutral faces, strong dark edges, a pale ground. That look is not a
 * style choice borrowed from another product — it is what makes an untextured
 * massing model READABLE. Flat-shaded boxes of similar tone are nearly
 * impossible to tell apart at a distance; the edge outline is what turns them
 * back into a building. Everything visual here follows from that:
 *
 *   - `EdgesGeometry` on every solid, at a threshold that keeps a box's real
 *     corners and drops the triangulation inside its faces;
 *   - flat `MeshLambertMaterial`, because a specular highlight on a wall reads
 *     as a material this model does not claim to have;
 *   - a hemisphere light plus one sun, so faces at different angles separate
 *     without anything going black.
 *
 * OPENINGS ARE CUT BY SPLITTING, NOT BY BOOLEAN SUBTRACTION
 * ---------------------------------------------------------
 * A wall with a door in it is built as several boxes — the run before the
 * opening, the run after it, the piece under a sill, the piece over a lintel —
 * rather than as one box with a hole subtracted. Boolean CSG in the browser is
 * slow, fragile on coplanar faces, and needs a library; box splitting is EXACT
 * for rectangular openings, which is every opening this schema can express.
 * The rule lives in `model.wallRuns` and the backend applies the same one, so
 * what is on screen and what is exported are the same building.
 *
 * COORDINATES
 * -----------
 * The model is plan (x, y) with +z up. Three.js is Y-up. The mapping is
 * applied in exactly one place, `toWorld` below:
 *
 *     model (x, y) at height h  →  world (x, h, -y)
 *
 * so a wall's plan angle becomes a rotation of `atan2(uy, ux)` about Y, and
 * the top view reads the same way round as the drawing.
 *
 * EVERY OBJECT CARRIES ITS ELEMENT
 * --------------------------------
 * `object.userData.element` holds `{ id, kind, name, levelId, layer }`, which
 * is what the tree lists, what a click resolves to, what isolate and hide
 * filter on, and what a transform gizmo writes back through. One wall is
 * several meshes; they share one element, so selecting any of them selects the
 * wall.
 */

// -- palette ---------------------------------------------------------------
// Neutral and light, so the edge lines carry the reading. Materials named in
// the document override the face colour; these are what an element gets when
// the drawing named no finish.
const FACE_COLOURS = {
  exterior: 0xd8d5cf,
  interior: 0xe6e4df,
  partition: 0xeceae6,
  curtain: 0xcfe0ec,
  slab: 0xc4c0b8,
  ceiling: 0xdedbd5,
  room: 0xd3dce8,
  door: 0xa9764c,
  window: 0x9ec7e8,
  column: 0xbdb9b1,
  beam: 0xc8c4bc,
  stair: 0xcdc9c1,
  fixture: 0xe8ecf0,
  furniture: 0xb4bcc4,
}

export const EDGE_COLOUR = 0x2a3138
export const SELECTION_COLOUR = 0x1677ff
export const REVIEW_COLOUR = 0xb54708
export const GROUND_COLOUR = 0xeef1f4

// A box's own corners are 90°; anything softer is triangulation inside a face
// and drawing it would fill the model with noise.
const EDGE_THRESHOLD_DEGREES = 25

// Room finishes sit just above the slab. Coplanar faces produce the flickering
// that reads as a broken model, so this is a real number, not zero.
const ROOM_FINISH_LIFT = 0.013
const ROOM_FINISH_THICKNESS = 0.02

const DOOR_LEAF_FRACTION = 0.35
const GLAZING_FRACTION = 0.18

/** The one place the model's frame becomes Three.js's. */
export function toWorld(x, y, height = 0) {
  return new THREE.Vector3(x, height, -y)
}

/** And back again, for a pointer hit that has to become a model coordinate. */
export function toPlan(vector) {
  return [vector.x, -vector.z]
}

function faceMaterial(colour, { transparent = false, opacity = 1 } = {}) {
  return new THREE.MeshLambertMaterial({
    color: colour,
    transparent: transparent || opacity < 1,
    opacity,
    // Both sides, because a wall seen from inside a cutaway would otherwise
    // vanish — which is the one view a section control exists to give.
    side: THREE.DoubleSide,
  })
}

function colourFor(model, element, fallbackKey) {
  const material = element?.material_id ? materialById(model, element.material_id) : null
  if (material?.colour) return new THREE.Color(material.colour).getHex()
  return FACE_COLOURS[fallbackKey] ?? FACE_COLOURS.furniture
}

function opacityFor(model, element) {
  const material = element?.material_id ? materialById(model, element.material_id) : null
  return material?.opacity ?? 1
}

/**
 * A solid, as a group holding its faces and its outline.
 *
 * Grouped rather than added separately so hiding, isolating and selecting move
 * the outline with the faces. An outline left behind by a hidden wall is a
 * ghost the user cannot click and cannot explain.
 */
function solid(geometry, material, element, { edges = true } = {}) {
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.element = element
  group.add(mesh)

  if (edges) {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, EDGE_THRESHOLD_DEGREES),
      new THREE.LineBasicMaterial({ color: EDGE_COLOUR }),
    )
    outline.userData.element = element
    outline.userData.isOutline = true
    group.add(outline)
  }

  group.userData.element = element
  return group
}

function boxSolid({ width, depth, height }, position, rotationY, material, element) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const group = solid(geometry, material, element)
  group.position.copy(position)
  group.rotation.y = rotationY
  return group
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
 * A horizontal plate from a plan polygon.
 *
 * `ExtrudeGeometry` builds in the XY plane and extrudes along +Z; rotating
 * -90° about X maps that to the plan's frame — shape (x, y, d) becomes world
 * (x, d, -y) — which is the same mapping `toWorld` applies to everything else.
 */
function plateSolid(polygon, { thickness, top, material, element, edges = true }) {
  if (!Array.isArray(polygon) || polygon.length < 3) return null
  const geometry = new THREE.ExtrudeGeometry(polygonShape(polygon), {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, top - thickness, 0)
  return solid(geometry, material, element, { edges })
}

// -- procedural furniture ---------------------------------------------------
// The SAME library the backend exporters use (`floorplan3d/mesh.py`), so what
// is on screen and what is exported are the same objects.
//
// Local x runs along width, z along depth, y up. Local -z is the BACK of
// anything that has one, so a chair's back and a sofa's back agree.
//
// Why shapes at all: one box per item is fine for a cabinet and useless for
// everything else — a chair read as a solid cube. Why so FEW boxes each: an
// open-plan floor carries a hundred workstations, and at four boxes an item
// that is 800 extra objects, which the viewer handles; at twelve it would not.
const TONES = {
  timber: 0xb08968,
  fabric: 0x76818e,
  ceramic: 0xf1f4f7,
  metal: 0x99a2ac,
  foliage: 0x5c8f63,
  generic: 0xb4bcc4,
}

export function itemParts(assetType, width, depth, height) {
  const name = String(assetType || '').toLowerCase()
  const has = (...keys) => keys.some((key) => name.includes(key))

  if (has('wc', 'toilet', 'water_closet')) {
    const bowl = Math.max(depth * 0.62, 0.05)
    return [
      { w: width * 0.72, d: bowl, h: height * 0.5, z: depth / 2 - bowl / 2, tone: 'ceramic' },
      { w: width, d: depth * 0.3, h: height, z: -depth / 2 + depth * 0.15, y: height / 2, tone: 'ceramic' },
    ]
  }
  if (has('urinal')) {
    const tall = Math.min(height * 0.55, 0.7)
    return [{ w: width, d: depth, h: tall, y: height - tall / 2, tone: 'ceramic' }]
  }
  if (has('basin', 'washbasin', 'lavatory', 'sink')) {
    const bowl = Math.min(0.18, height * 0.3)
    return [
      { w: width, d: depth, h: bowl, y: height - bowl / 2, tone: 'ceramic' },
      { w: width * 0.25, d: depth * 0.25, h: height - bowl, y: (height - bowl) / 2, tone: 'ceramic' },
    ]
  }
  if (has('shower')) {
    return [
      { w: width, d: depth, h: 0.06, y: 0.03, tone: 'ceramic' },
      { w: 0.04, d: depth, h: height, x: -width / 2 + 0.02, y: height / 2, tone: 'metal' },
    ]
  }
  if (has('bath', 'tub')) {
    return [
      { w: width, d: depth, h: height, y: height / 2, tone: 'ceramic' },
      { w: width - 0.16, d: depth - 0.16, h: 0.06, y: height - 0.02, tone: 'metal' },
    ]
  }
  if (has('bed')) {
    const base = Math.min(0.3, height * 0.6)
    return [
      { w: width, d: depth, h: base, y: base / 2, tone: 'timber' },
      { w: width - 0.06, d: depth - 0.06, h: height - base, y: base + (height - base) / 2, tone: 'fabric' },
      { w: width * 0.7, d: depth * 0.16, h: 0.1, z: -depth / 2 + depth * 0.1, y: height + 0.05, tone: 'ceramic' },
    ]
  }
  if (has('sofa', 'couch', 'settee')) {
    const seat = Math.min(0.4, height * 0.55)
    const back = Math.max(height - seat, 0.1)
    return [
      { w: width, d: depth, h: seat, y: seat / 2, tone: 'fabric' },
      { w: width, d: depth * 0.22, h: back, z: -depth / 2 + depth * 0.11, y: seat + back / 2, tone: 'fabric' },
      { w: width * 0.12, d: depth, h: back * 0.7, x: -width / 2 + width * 0.06, y: seat + back * 0.35, tone: 'fabric' },
      { w: width * 0.12, d: depth, h: back * 0.7, x: width / 2 - width * 0.06, y: seat + back * 0.35, tone: 'fabric' },
    ]
  }
  if (has('chair', 'seat', 'stool')) {
    const seat = Math.min(0.45, height * 0.5)
    const back = Math.max(height - seat, 0.05)
    const parts = [
      { w: width, d: depth, h: 0.07, y: seat, tone: 'fabric' },
      { w: width * 0.22, d: depth * 0.22, h: seat, y: seat / 2, tone: 'metal' },
    ]
    if (!has('stool')) {
      parts.push({ w: width, d: 0.07, h: back, z: -depth / 2 + 0.035, y: seat + back / 2, tone: 'fabric' })
    }
    return parts
  }
  if (has('desk', 'workstation', 'table', 'bench', 'counter_top')) {
    const top = 0.05
    const legs = Math.max(height - top, 0.05)
    return [
      { w: width, d: depth, h: top, y: height - top / 2, tone: 'timber' },
      { w: 0.06, d: depth * 0.85, h: legs, x: -width / 2 + 0.06, y: legs / 2, tone: 'metal' },
      { w: 0.06, d: depth * 0.85, h: legs, x: width / 2 - 0.06, y: legs / 2, tone: 'metal' },
    ]
  }
  if (has('partition', 'screen', 'divider')) {
    return [{ w: width, d: Math.min(depth, 0.08), h: height, y: height / 2, tone: 'fabric' }]
  }
  if (has('plant', 'tree')) {
    const pot = Math.min(0.35, height * 0.3)
    return [
      { w: width * 0.6, d: depth * 0.6, h: pot, y: pot / 2, tone: 'timber' },
      { w: width, d: depth, h: height - pot, y: pot + (height - pot) / 2, tone: 'foliage' },
    ]
  }
  if (has('counter', 'reception', 'cabinet', 'wardrobe', 'cupboard', 'shelf', 'storage')) {
    return [{ w: width, d: depth, h: height, y: height / 2, tone: 'timber' }]
  }
  if (has('fridge', 'stove', 'oven', 'washer', 'equipment', 'machine')) {
    return [{ w: width, d: depth, h: height, y: height / 2, tone: 'metal' }]
  }
  // Never nothing. An unrecognised type is a labelled box, which says "there
  // is something here" rather than quietly losing it.
  return [{ w: width, d: depth, h: height, y: height / 2, tone: 'generic' }]
}

function itemGroup(model, item, base, element, kind) {
  const group = new THREE.Group()
  const [width, depth] = item.size
  const override = item.material_id ? materialById(model, item.material_id) : null

  for (const part of itemParts(item.asset_type || item.category, width, depth, item.height)) {
    const colour = override?.colour
      ? new THREE.Color(override.colour).getHex()
      : (TONES[part.tone] ?? FACE_COLOURS[kind])
    const piece = boxSolid(
      {
        width: Math.max(part.w, 0.01),
        depth: Math.max(part.d, 0.01),
        height: Math.max(part.h, 0.01),
      },
      new THREE.Vector3(part.x ?? 0, part.y ?? part.h / 2, part.z ?? 0),
      0,
      faceMaterial(colour, { opacity: override?.opacity ?? 1 }),
      element,
    )
    group.add(piece)
  }

  group.position.copy(toWorld(item.position[0], item.position[1], base))
  group.rotation.y = ((item.rotation ?? 0) * Math.PI) / 180
  group.userData.element = element
  return group
}

// -- the element catalogue --------------------------------------------------

/**
 * Every element in the model, in one flat list.
 *
 * The SINGLE definition of what an element is — its id, its name, its kind,
 * its level, its layer. `buildScene` looks objects up in it rather than
 * inventing elements as it builds, so the tree can never list an element the
 * scene does not contain, or name one differently.
 *
 * Pure: no Three.js. The tree can call it without a canvas.
 */
export function listElements(model) {
  const elements = []
  const push = (id, kind, name, levelId, layer) =>
    elements.push({ id, kind, name, levelId, layer })

  for (const level of modelLevels(model)) {
    for (const slab of model?.slabs ?? []) {
      if (slab.level_id !== level.id) continue
      push(slab.id, 'slab', `${level.name} ${slab.kind}`, level.id, 'slabs')
    }
    for (const room of model?.rooms ?? []) {
      if (room.level_id !== level.id) continue
      push(room.id, 'room', room.name, level.id, 'rooms')
    }
    for (const wall of model?.walls ?? []) {
      if (wall.level_id !== level.id) continue
      const kindName = wall.type === 'exterior' ? 'Exterior' : 'Interior'
      push(wall.id, 'wall', `${kindName} wall ${wall.id}`, level.id, 'walls')
    }

    const wallLevel = new Map((model?.walls ?? []).map((wall) => [wall.id, wall.level_id]))
    for (const [collection, kind] of [
      ['doors', 'door'], ['windows', 'window'], ['passages', 'passage'],
    ]) {
      for (const opening of model?.[collection] ?? []) {
        if (wallLevel.get(opening.wall_id) !== level.id) continue
        const label = kind.charAt(0).toUpperCase() + kind.slice(1)
        push(opening.id, kind, `${label} ${opening.id}`, level.id, 'openings')
      }
    }

    for (const [collection, kind] of [
      ['columns', 'column'], ['beams', 'beam'], ['stairs', 'stair'],
    ]) {
      for (const element of model?.[collection] ?? []) {
        if (element.level_id !== level.id) continue
        const label = kind.charAt(0).toUpperCase() + kind.slice(1)
        push(element.id, kind, `${label} ${element.id}`, level.id, 'structure')
      }
    }

    for (const fixture of model?.fixtures ?? []) {
      if (fixture.level_id !== level.id) continue
      push(fixture.id, 'fixture', `${fixture.category} ${fixture.id}`, level.id, 'fixtures')
    }
    for (const item of model?.furniture ?? []) {
      if (item.level_id !== level.id) continue
      push(
        item.id,
        'furniture',
        item.name || item.asset_type || item.id,
        level.id,
        'furniture',
      )
    }
  }

  return elements
}

/**
 * Build the whole scene.
 *
 * Returns `{ root, elements, labels, bounds }` — the group to add to a scene,
 * the flat element list the tree renders, the room labels the viewer draws as
 * sprites, and the bounding box for framing the camera.
 *
 * `flagged` is the set of element ids needing review; they are tinted so a
 * problem is visible in the model, not only in a list.
 */
export function buildScene(model, { flagged = new Set(), wallOpacity = 1 } = {}) {
  const root = new THREE.Group()
  root.name = 'floorplan3d-model'

  const elements = listElements(model)
  const byId = new Map(elements.map((element) => [element.id, element]))
  const register = (id) => byId.get(id) ?? { id, kind: 'element', name: id, layer: 'walls' }
  const labels = []

  const wallsById = new Map((model?.walls ?? []).map((wall) => [wall.id, wall]))

  for (const level of modelLevels(model)) {
    const base = level.elevation ?? 0

    // -- slabs -------------------------------------------------------------
    for (const slab of model?.slabs ?? []) {
      if (slab.level_id !== level.id) continue
      const element = register(slab.id)
      const top = base + (slab.offset ?? 0)
      const plate = plateSolid(slab.polygon, {
        thickness: slab.thickness,
        top: slab.kind === 'ceiling' ? top + slab.thickness : top,
        material: faceMaterial(
          colourFor(model, slab, slab.kind === 'ceiling' ? 'ceiling' : 'slab'),
          { opacity: opacityFor(model, slab) },
        ),
        element,
      })
      if (plate) {
        if (flagged.has(slab.id)) tint(plate, REVIEW_COLOUR)
        root.add(plate)
      }
    }

    // -- room finishes -----------------------------------------------------
    for (const room of model?.rooms ?? []) {
      if (room.level_id !== level.id) continue
      const element = register(room.id)
      const finish = plateSolid(room.polygon, {
        thickness: ROOM_FINISH_THICKNESS,
        top: base + ROOM_FINISH_LIFT + ROOM_FINISH_THICKNESS,
        material: faceMaterial(
          room.floor_material_id
            ? colourFor(model, { material_id: room.floor_material_id }, 'room')
            : FACE_COLOURS.room,
          { transparent: true, opacity: 0.7 },
        ),
        element,
        // No outline: a room finish is a wash of colour on the floor, and
        // outlining every one of them competes with the walls for the reading.
        edges: false,
      })
      if (finish) {
        if (flagged.has(room.id)) tint(finish, REVIEW_COLOUR)
        root.add(finish)
      }
      const [cx, cy] = polygonCentroid(room.polygon ?? [])
      labels.push({
        id: room.id,
        text: room.name,
        position: toWorld(cx, cy, base + 0.05),
        levelId: level.id,
      })
    }

    // -- walls -------------------------------------------------------------
    for (const wall of model?.walls ?? []) {
      if (wall.level_id !== level.id) continue
      const element = register(wall.id)
      const height = effectiveWallHeight(model, wall)
      const material = faceMaterial(colourFor(model, wall, wall.type ?? 'interior'), {
        transparent: wallOpacity < 1,
        opacity: Math.min(wallOpacity, opacityFor(model, wall)),
      })
      if (flagged.has(wall.id)) material.color.setHex(REVIEW_COLOUR)

      const angle = wallAngleRadians(wall)
      const { ux, uy } = wallDirection(wall)
      for (const run of wallRuns(wall, openingsOnWall(model, wall.id), height)) {
        const span = run.to - run.from
        const tall = run.top - run.base
        if (span <= 1e-6 || tall <= 1e-6) continue
        const midpoint = run.from + span / 2
        root.add(boxSolid(
          { width: span, depth: wall.thickness, height: tall },
          toWorld(
            wall.start[0] + ux * midpoint,
            wall.start[1] + uy * midpoint,
            base + (wall.base_elevation ?? 0) + run.base + tall / 2,
          ),
          angle,
          material,
          element,
        ))
      }
    }

    // -- door leaves and window panes, in the holes just cut ---------------
    for (const [collection, kind] of [['doors', 'door'], ['windows', 'window']]) {
      for (const opening of model?.[collection] ?? []) {
        const wall = wallsById.get(opening.wall_id)
        if (!wall || wall.level_id !== level.id) continue
        const element = register(opening.id)
        const isWindow = kind === 'window'
        const material = faceMaterial(colourFor(model, opening, kind), {
          transparent: isWindow,
          opacity: isWindow ? 0.4 : opacityFor(model, opening),
        })
        if (flagged.has(opening.id)) material.color.setHex(REVIEW_COLOUR)

        const { ux, uy } = wallDirection(wall)
        const midpoint = opening.distance_along + opening.width / 2
        root.add(boxSolid(
          {
            width: opening.width,
            // Thinner than the wall so the leaf reads as sitting inside the
            // reveal rather than as part of the wall.
            depth: wall.thickness * (isWindow ? GLAZING_FRACTION : DOOR_LEAF_FRACTION),
            height: opening.height,
          },
          toWorld(
            wall.start[0] + ux * midpoint,
            wall.start[1] + uy * midpoint,
            base + (wall.base_elevation ?? 0) + (opening.sill_height ?? 0)
              + opening.height / 2,
          ),
          wallAngleRadians(wall),
          material,
          element,
        ))
      }
    }
    // A passage is a hole and nothing more; giving it a panel would draw a
    // door the drawing does not have.

    // -- columns -----------------------------------------------------------
    for (const column of model?.columns ?? []) {
      if (column.level_id !== level.id) continue
      const element = register(column.id)
      const height = column.height ?? level.default_wall_height ?? 2.7
      const material = faceMaterial(colourFor(model, column, 'column'))
      if (flagged.has(column.id)) material.color.setHex(REVIEW_COLOUR)

      const geometry = column.shape === 'circular'
        ? new THREE.CylinderGeometry(
          Math.max(column.width, column.depth) / 2,
          Math.max(column.width, column.depth) / 2,
          height, 16,
        )
        : new THREE.BoxGeometry(column.width, height, column.depth)
      const group = solid(geometry, material, element)
      group.position.copy(toWorld(column.position[0], column.position[1],
        base + height / 2))
      group.rotation.y = ((column.rotation ?? 0) * Math.PI) / 180
      root.add(group)
    }

    // -- beams -------------------------------------------------------------
    for (const beam of model?.beams ?? []) {
      if (beam.level_id !== level.id) continue
      const element = register(beam.id)
      const length = Math.hypot(beam.end[0] - beam.start[0], beam.end[1] - beam.start[1])
      if (length < 1e-6) continue
      const soffit = beam.soffit_elevation
        ?? (level.default_wall_height ?? 2.7) - beam.depth
      const material = faceMaterial(colourFor(model, beam, 'beam'))
      if (flagged.has(beam.id)) material.color.setHex(REVIEW_COLOUR)
      root.add(boxSolid(
        { width: length, depth: beam.width, height: beam.depth },
        toWorld(
          (beam.start[0] + beam.end[0]) / 2,
          (beam.start[1] + beam.end[1]) / 2,
          base + soffit + beam.depth / 2,
        ),
        Math.atan2(beam.end[1] - beam.start[1], beam.end[0] - beam.start[0]),
        material,
        element,
      ))
    }

    // -- stairs ------------------------------------------------------------
    for (const stair of model?.stairs ?? []) {
      if (stair.level_id !== level.id) continue
      const element = register(stair.id)
      const run = Math.hypot(stair.end[0] - stair.start[0], stair.end[1] - stair.start[1])
      if (run < 1e-6) continue
      const material = faceMaterial(colourFor(model, stair, 'stair'))
      if (flagged.has(stair.id)) material.color.setHex(REVIEW_COLOUR)
      const ux = (stair.end[0] - stair.start[0]) / run
      const uy = (stair.end[1] - stair.start[1]) / run
      const angle = Math.atan2(uy, ux)
      const going = run / stair.steps
      const group = new THREE.Group()
      for (let step = 0; step < stair.steps; step += 1) {
        const along = (step + 0.5) * going
        const top = (step + 1) * stair.riser
        group.add(boxSolid(
          { width: going, depth: stair.width, height: top },
          toWorld(
            stair.start[0] + ux * along,
            stair.start[1] + uy * along,
            base + top / 2,
          ),
          angle,
          material,
          element,
        ))
      }
      group.userData.element = element
      root.add(group)
    }

    // -- fixtures and furniture -------------------------------------------
    for (const [collection, kind] of [['fixtures', 'fixture'], ['furniture', 'furniture']]) {
      for (const item of model?.[collection] ?? []) {
        if (item.level_id !== level.id) continue
        const element = register(item.id)
        const group = itemGroup(model, item, base, element, kind)
        if (flagged.has(item.id)) tint(group, REVIEW_COLOUR)
        root.add(group)
      }
    }
  }

  const bounds = new THREE.Box3().setFromObject(root)
  if (bounds.isEmpty()) {
    bounds.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 3, 5))
  }

  return { root, elements, labels, bounds }
}

function tint(group, colour) {
  group.traverse((child) => {
    if (child.isMesh && child.material?.color) child.material.color.setHex(colour)
  })
}

/** Free every geometry and material in a scene. Called when one is replaced. */
export function disposeScene(root) {
  if (!root) return
  root.traverse((child) => {
    child.geometry?.dispose?.()
    if (Array.isArray(child.material)) child.material.forEach((entry) => entry.dispose())
    else child.material?.dispose?.()
  })
}
