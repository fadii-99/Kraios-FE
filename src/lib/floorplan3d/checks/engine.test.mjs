/**
 * Focused checks for the browser geometry engine's pure logic.
 *
 *     node --import ./src/lib/floorplan3d/checks/register.mjs \
 *          --test src/lib/floorplan3d/checks/engine.test.mjs
 *
 * (The FILE, not the directory: Node's test runner treats a directory
 * argument as a module to import, and an ESM directory import is an error.)
 *
 * WHY THIS FILE EXISTS AND WHY IT IS SHAPED LIKE THIS
 * ---------------------------------------------------
 * This repository has no frontend testing framework, and adding one for an
 * experiment would be a large, permanent decision made for a small, temporary
 * reason. So these checks use Node's BUILT-IN test runner: no new dependency,
 * no config, no change to `package.json`.
 *
 * `.mjs` and a `checks/` directory, deliberately:
 *   - `eslint.config.js` lints `**\/*.{js,jsx}`, so a `.mjs` file is outside the
 *     lint surface and cannot fail `npm run lint` for using Node globals.
 *   - Nothing imports it, so Vite never bundles it and it costs the shipped
 *     application nothing.
 *
 * WHAT IS CHECKED, AND WHY IT IS THE RIGHT THING TO CHECK
 * ------------------------------------------------------
 * `wallSolidRuns` is the single riskiest function in the browser engine: it is
 * a REIMPLEMENTATION of `backend/floorplan3d/blender/geometry/walls.py`'s
 * `solid_runs`, and if the two disagree the viewer and the downloaded `.blend`
 * show different buildings. The cases below encode the same rules the Python
 * suite asserts, so a change to one that is not made to the other fails here.
 *
 * The rest is the edit machinery — the history stack, snapping, catalogue
 * indexing — which is pure, has no DOM in it, and is what undo/redo and "save
 * as a revision" are built on.
 *
 * What is NOT checked here is anything that needs a browser: WebGL, picking,
 * the gizmo, layout. Those are in the manual smoke-test checklist in
 * `src/pages/experiments/floorplan3d/README.md`, because pretending a jsdom
 * canvas exercises a renderer would be worse than admitting it does not.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cumulativeLengths,
  distanceToPolyline,
  documentBounds,
  pointAtDistanceAlong,
  polygonArea,
  polygonCentroid,
  polylineLength,
  wallSolidRuns,
  withElement,
  withElementConfirmed,
  withRebuiltOpeningIndex,
  withoutElement,
} from '../semanticModel.js'
import {
  applyCommand,
  changeSummary,
  createHistory,
  markSaved,
  redo,
  snap,
  snapPoint,
  snapToWallEndpoints,
  undo,
  deleteElement,
  setOpeningDimensions,
  setRoomProperties,
  setWallDimensions,
} from '../editCommands.js'
import { indexCatalog, catalogByCategory } from '../furniture.js'
import * as THREE from 'three'
import { buildModel } from '../buildScene.js'

// ---------------------------------------------------------------------------
// The wall-splitting algorithm. The one that MUST match the Python engine.
// ---------------------------------------------------------------------------
const wall = { id: 'w', polyline: [[0, 0], [6000, 0]], thickness: 150, height: 2700 }

test('a wall with no openings is one full-height run', () => {
  const runs = wallSolidRuns(wall, [], 2700)
  assert.equal(runs.length, 1)
  assert.deepEqual(runs[0], { from: 0, to: 6000, base: 0, top: 2700 })
})

test('a door splits the wall into the runs either side of it', () => {
  const runs = wallSolidRuns(
    wall,
    [{ position: 3000, width: 900, height: 2100, sill_height: 0 }],
    2700,
  )
  // Before, over the lintel, after. No run UNDER a door - it sits on the floor.
  assert.equal(runs.length, 3)
  assert.deepEqual(runs[0], { from: 0, to: 2550, base: 0, top: 2700 })
  assert.deepEqual(runs[1], { from: 2550, to: 3450, base: 2100, top: 2700 })
  assert.deepEqual(runs[2], { from: 3450, to: 6000, base: 0, top: 2700 })
})

test('a window adds a run under its sill as well as over its head', () => {
  const runs = wallSolidRuns(
    wall,
    [{ position: 3000, width: 1200, height: 1200, sill_height: 900 }],
    2700,
  )
  assert.equal(runs.length, 4)
  assert.deepEqual(runs[1], { from: 2400, to: 3600, base: 0, top: 900 })
  assert.deepEqual(runs[2], { from: 2400, to: 3600, base: 2100, top: 2700 })
})

test('an opening reaching the full wall height leaves no lintel run', () => {
  const runs = wallSolidRuns(
    wall,
    [{ position: 3000, width: 1200, height: 2700, sill_height: 0 }],
    2700,
  )
  assert.equal(runs.length, 2)
  assert.deepEqual(runs[0], { from: 0, to: 2400, base: 0, top: 2700 })
  assert.deepEqual(runs[1], { from: 3600, to: 6000, base: 0, top: 2700 })
})

test('two openings produce the runs between and around them, in order', () => {
  const runs = wallSolidRuns(
    wall,
    [
      { position: 1500, width: 900, height: 2100, sill_height: 0 },
      { position: 4500, width: 900, height: 2100, sill_height: 0 },
    ],
    2700,
  )
  const solids = runs.filter((run) => run.base === 0 && run.top === 2700)
  assert.deepEqual(
    solids.map((run) => [run.from, run.to]),
    [[0, 1050], [1950, 4050], [4950, 6000]],
  )
})

test('an opening wider than its wall is clamped rather than producing negative runs', () => {
  const runs = wallSolidRuns(
    wall,
    [{ position: 3000, width: 20000, height: 2100, sill_height: 0 }],
    2700,
  )
  for (const run of runs) {
    assert.ok(run.to > run.from, `run ${JSON.stringify(run)} is inverted`)
    assert.ok(run.from >= 0 && run.to <= 6000, `run ${JSON.stringify(run)} escapes the wall`)
  }
})

test('an opening past the end of the wall does not produce a run beyond it', () => {
  const runs = wallSolidRuns(
    wall,
    [{ position: 9000, width: 900, height: 2100, sill_height: 0 }],
    2700,
  )
  for (const run of runs) {
    assert.ok(run.to <= 6000, `run ${JSON.stringify(run)} escapes the wall`)
  }
})

test('the runs plus the openings account for the whole wall length', () => {
  const openings = [
    { position: 1500, width: 900, height: 2100, sill_height: 0 },
    { position: 4500, width: 1200, height: 1200, sill_height: 900 },
  ]
  const runs = wallSolidRuns(wall, openings, 2700)
  // Every millimetre of the wall is covered by at least one run OR is inside an
  // opening's full-height gap. Sampling is enough and is robust to how the runs
  // happen to be ordered.
  for (let x = 5; x < 6000; x += 25) {
    const covered = runs.some((run) => x >= run.from && x <= run.to)
    assert.ok(covered, `nothing covers ${x} mm along the wall`)
  }
})

test('a zero-length wall produces no runs rather than dividing by zero', () => {
  assert.deepEqual(wallSolidRuns({ polyline: [[0, 0]] }, [], 2700), [])
})

// ---------------------------------------------------------------------------
// Plan geometry
// ---------------------------------------------------------------------------
test('polyline measurements walk round a bend', () => {
  const points = [[0, 0], [1000, 0], [1000, 1000]]
  assert.equal(polylineLength(points), 2000)
  assert.deepEqual(cumulativeLengths(points), [0, 1000, 2000])
  assert.deepEqual(pointAtDistanceAlong(points, 1500), [1000, 500])
  // Clamped at both ends, so a repaired opening always resolves to a point.
  assert.deepEqual(pointAtDistanceAlong(points, -50), [0, 0])
  assert.deepEqual(pointAtDistanceAlong(points, 9999), [1000, 1000])
})

test('a point is projected onto the polyline with its distance along it', () => {
  const result = distanceToPolyline([500, 200], [[0, 0], [1000, 0]])
  assert.equal(Math.round(result.gap), 200)
  assert.equal(Math.round(result.along), 500)
})

test('polygon area and centroid', () => {
  const square = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
  assert.equal(polygonArea(square), 1_000_000)
  assert.deepEqual(polygonCentroid(square), [500, 500])
  // Winding does not change the unsigned area.
  assert.equal(polygonArea([...square].reverse()), 1_000_000)
})

test('document bounds cover walls and slabs', () => {
  const document = {
    levels: [
      {
        id: 'l',
        walls: [{ id: 'w', polyline: [[0, 0], [4000, 0]] }],
        slab_polygon: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]],
      },
    ],
  }
  assert.deepEqual(documentBounds(document), [0, 0, 4000, 3000])
})

// ---------------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------------
test('grid snapping rounds to the nearest multiple, and is a no-op at zero', () => {
  assert.equal(snap(1234, 50), 1250)
  assert.equal(snap(1234, 0), 1234)
  assert.deepEqual(snapPoint([1234, 5678], 100), [1200, 5700])
})

test('a point near a wall endpoint snaps onto it', () => {
  const level = {
    walls: [
      { id: 'a', polyline: [[0, 0], [4000, 0]] },
      { id: 'b', polyline: [[4000, 0], [4000, 3000]] },
    ],
  }
  assert.deepEqual(snapToWallEndpoints([4060, 40], level), [4000, 0])
  // Too far away to be the same corner.
  assert.equal(snapToWallEndpoints([2000, 2000], level), null)
  // And a wall never snaps to its own endpoint.
  assert.equal(snapToWallEndpoints([10, 10], level, { exclude: 'a', tolerance: 100 }), null)
})

// ---------------------------------------------------------------------------
// Editing the document
// ---------------------------------------------------------------------------
function sampleDocument() {
  return {
    schema_version: '1.0',
    units: 'mm',
    levels: [
      {
        id: 'level-1',
        name: 'Ground Floor',
        elevation: 0,
        floor_to_floor: 3000,
        slab_thickness: 150,
        walls: [
          {
            id: 'wall-1',
            polyline: [[0, 0], [6000, 0]],
            thickness: 150,
            height: 2700,
            opening_ids: [],
          },
        ],
        rooms: [{ id: 'room-1', name: 'Living', polygon: [[0, 0], [6000, 0], [6000, 4000]] }],
        doors: [
          {
            id: 'door-1',
            kind: 'door',
            host_wall_id: 'wall-1',
            position: 3000,
            width: 900,
            height: 2100,
            sill_height: 0,
          },
        ],
        windows: [],
        openings: [],
        furniture: [
          { id: 'sofa-1', semantic_class: 'sofa', position: [1000, 1000], room_id: 'room-1' },
        ],
        fixtures: [],
      },
    ],
    uncertainties: [
      { id: 'u1', code: 'x', element_id: 'wall-1', resolved: false, message: 'check' },
    ],
  }
}

test('an edit returns a NEW document and leaves the original untouched', () => {
  const before = sampleDocument()
  const after = withElement(before, 'wall-1', { thickness: 230 })
  assert.notEqual(after, before)
  assert.equal(before.levels[0].walls[0].thickness, 150)
  assert.equal(after.levels[0].walls[0].thickness, 230)
})

test('deleting a wall also deletes the openings it hosted', () => {
  const after = withoutElement(sampleDocument(), 'wall-1')
  assert.equal(after.levels[0].walls.length, 0)
  // An opening with no wall cannot be built, and the server's contract rejects
  // the whole document for one - so the editor must never produce that state.
  assert.equal(after.levels[0].doors.length, 0)
})

test('deleting a room clears the furniture that referenced it', () => {
  const after = withoutElement(sampleDocument(), 'room-1')
  assert.equal(after.levels[0].rooms.length, 0)
  assert.equal(after.levels[0].furniture[0].room_id, '')
})

test('the opening index is rebuilt from the host references, not trusted', () => {
  const lying = sampleDocument()
  lying.levels[0].walls[0].opening_ids = ['nonsense']
  const after = withRebuiltOpeningIndex(lying)
  assert.deepEqual(after.levels[0].walls[0].opening_ids, ['door-1'])
  // And furniture gets its level stamped, as the server's `sync()` does.
  assert.equal(after.levels[0].furniture[0].level_id, 'level-1')
})

test('confirming an element resolves its findings and outranks later repairs', () => {
  const after = withElementConfirmed(sampleDocument(), 'wall-1')
  const confirmed = after.levels[0].walls[0]
  assert.equal(confirmed.provenance.confirmed, true)
  assert.equal(confirmed.provenance.detection_source, 'manual')
  assert.equal(confirmed.provenance.confidence, 1)
  assert.equal(after.uncertainties[0].resolved, true)
})

test('an opening is kept inside its wall when the wall is shortened', () => {
  const document = sampleDocument()
  const shortened = setWallDimensions.apply(document, {
    elementId: 'wall-1',
    height: 1500,
  })
  const door = shortened.levels[0].doors[0]
  assert.ok(door.height + door.sill_height <= 1500, 'the door is taller than its wall')
})

test('an opening cannot be widened past its wall', () => {
  const document = sampleDocument()
  const widened = setOpeningDimensions.apply(document, {
    elementId: 'door-1',
    width: 99000,
  })
  const door = widened.levels[0].doors[0]
  assert.ok(door.width <= 6000, 'the door is wider than its wall')
  assert.ok(door.position - door.width / 2 >= -1e-6)
  assert.ok(door.position + door.width / 2 <= 6000 + 1e-6)
})

test('a door with a sill is corrected, because that is a mislabelled window', () => {
  const document = sampleDocument()
  const patched = setOpeningDimensions.apply(document, {
    elementId: 'door-1',
    sillHeight: 900,
  })
  assert.equal(patched.levels[0].doors[0].sill_height, 0)
})

// ---------------------------------------------------------------------------
// Undo / redo
// ---------------------------------------------------------------------------
test('undo and redo walk the document history', () => {
  let history = createHistory(sampleDocument())
  assert.equal(history.dirty, false)

  history = applyCommand(history, setRoomProperties, {
    elementId: 'room-1',
    name: 'Great Room',
  }).history
  assert.equal(history.present.levels[0].rooms[0].name, 'Great Room')
  assert.equal(history.dirty, true)
  assert.equal(history.past.length, 1)

  history = undo(history)
  assert.equal(history.present.levels[0].rooms[0].name, 'Living')
  assert.equal(history.future.length, 1)

  history = redo(history)
  assert.equal(history.present.levels[0].rooms[0].name, 'Great Room')
  assert.equal(history.future.length, 0)
})

test('undo at the beginning and redo at the end are no-ops, not crashes', () => {
  const history = createHistory(sampleDocument())
  assert.equal(undo(history), history)
  assert.equal(redo(history), history)
})

test('a new edit discards the redo branch', () => {
  let history = createHistory(sampleDocument())
  history = applyCommand(history, setRoomProperties, { elementId: 'room-1', name: 'A' }).history
  history = undo(history)
  assert.equal(history.future.length, 1)
  history = applyCommand(history, setRoomProperties, { elementId: 'room-1', name: 'B' }).history
  // Keeping it would let a user redo their way into a document that never existed.
  assert.equal(history.future.length, 0)
})

test('a command that changes nothing does not create an undo step', () => {
  const history = createHistory(sampleDocument())
  const result = applyCommand(history, deleteElement, { elementId: 'does-not-exist' })
  assert.equal(result.changed, false)
  assert.equal(result.history, history)
})

test('saving clears the dirty flag and adopts the server document', () => {
  let history = createHistory(sampleDocument())
  history = applyCommand(history, setRoomProperties, { elementId: 'room-1', name: 'A' }).history

  const fromServer = sampleDocument()
  fromServer.levels[0].rooms[0].name = 'A (repaired)'
  history = markSaved(history, fromServer)

  assert.equal(history.dirty, false)
  assert.equal(history.present.levels[0].rooms[0].name, 'A (repaired)')
  // The undo stack survives a save: wanting the previous arrangement back is a
  // reasonable question, and the answer is one more revision.
  assert.ok(history.past.length > 0)
})

test('the change summary describes what was edited', () => {
  let history = createHistory(sampleDocument())
  history = applyCommand(history, setRoomProperties, { elementId: 'room-1', name: 'A' }).history
  history = applyCommand(history, setWallDimensions, { elementId: 'wall-1', thickness: 230 }).history
  const summary = changeSummary(history)
  assert.match(summary, /Edit room/)
  assert.match(summary, /Edit wall/)
})

test('the history stack is bounded', () => {
  let history = createHistory(sampleDocument())
  for (let index = 0; index < 40; index += 1) {
    history = applyCommand(history, setRoomProperties, {
      elementId: 'room-1',
      name: `Room ${index}`,
    }).history
  }
  assert.ok(history.past.length <= 20, `history grew to ${history.past.length}`)
})

// ---------------------------------------------------------------------------
// The shared furniture catalogue
// ---------------------------------------------------------------------------
const catalogPayload = {
  assets: [
    {
      asset_id: 'fp3d.desk.basic',
      name: 'Desk',
      category: 'office',
      semantic_class: 'desk',
      default_size: [1400, 700, 740],
      color: '#C8A06A',
      parts: [{ kind: 'box', size: [1, 1, 0.05], offset: [0, 0, 0.975], color: '#C8A06A' }],
    },
    {
      asset_id: 'fp3d.chair.basic',
      name: 'Chair',
      category: 'seating',
      semantic_class: 'chair',
      default_size: [450, 480, 900],
      color: '#B4705A',
      parts: [],
    },
  ],
}

test('the catalogue is indexed by id and by semantic class', () => {
  const index = indexCatalog(catalogPayload)
  assert.equal(index.byId.get('fp3d.desk.basic').name, 'Desk')
  assert.equal(index.byClass.get('chair').asset_id, 'fp3d.chair.basic')
  assert.equal(index.byId.get('missing'), undefined)
})

test('the catalogue groups by category for the picker', () => {
  const groups = catalogByCategory(catalogPayload)
  assert.deepEqual(groups.map((group) => group.category), ['office', 'seating'])
})

test('an empty catalogue indexes without throwing', () => {
  const index = indexCatalog(null)
  assert.equal(index.byId.size, 0)
  assert.deepEqual(catalogByCategory(undefined), [])
})

// ---------------------------------------------------------------------------
// The shared API client must not mangle a binary body.
//
// A REGRESSION TEST FOR A REAL BUG. `JSON.stringify` does not throw on a Blob —
// it returns `"{}"`. So a 560 KB chunk went onto the wire as TWO BYTES, the
// request succeeded, and the only symptom was the server reporting a size
// mismatch long afterwards. Silent binary corruption in the one HTTP client
// every feature shares is worth a permanent test.
// ---------------------------------------------------------------------------
test('a Blob body is sent as-is, not JSON-stringified', async () => {
  const { apiClient } = await import('../../api/client.js')

  const payload = new Uint8Array(4096).fill(7)
  const chunk = new Blob([payload])

  let seen = null
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    seen = options
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    await apiClient('/x/', {
      method: 'PUT',
      body: chunk,
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  } finally {
    globalThis.fetch = realFetch
  }

  assert.ok(seen.body instanceof Blob, 'the Blob was replaced')
  assert.equal(seen.body.size, 4096, 'the body lost its bytes')
  assert.notEqual(seen.body, '{}')
  // And the caller's own content type is not overwritten with JSON.
  assert.equal(seen.headers['Content-Type'], 'application/octet-stream')
})

test('a typed array body is sent as-is', async () => {
  const { apiClient } = await import('../../api/client.js')

  let seen = null
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    seen = options
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    await apiClient('/x/', { method: 'PUT', body: new Uint8Array([1, 2, 3, 4]) })
  } finally {
    globalThis.fetch = realFetch
  }

  assert.ok(ArrayBuffer.isView(seen.body))
  assert.equal(seen.body.byteLength, 4)
  // A binary body is not JSON, so the client must not claim it is.
  assert.notEqual(seen.headers['Content-Type'], 'application/json')
})

test('a plain object body is still JSON-stringified', async () => {
  const { apiClient } = await import('../../api/client.js')

  let seen = null
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    seen = options
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    await apiClient('/x/', { method: 'POST', body: { a: 1 } })
  } finally {
    globalThis.fetch = realFetch
  }

  assert.equal(seen.body, '{"a":1}')
  assert.equal(seen.headers['Content-Type'], 'application/json')
})


// ---------------------------------------------------------------------------
// Geometry: the plan-to-world axis mapping
// ---------------------------------------------------------------------------

/**
 * A minimal document: one 10 m x 6 m slab and one wall along its far edge.
 *
 * The wall is on the plan's y = 6000 edge deliberately. Everything here turns
 * on the sign of y, so a wall at y = 0 would pass whether the mapping were
 * right or mirrored.
 */
function documentWithSlabAndWall() {
  return {
    materials: [{ id: 'm', color: '#A6A6A1', roughness: 0.9, metallic: 0, opacity: 1 }],
    levels: [
      {
        id: 'L1',
        name: 'Ground',
        elevation: 0,
        slab_thickness: 200,
        slab_material_id: 'm',
        slab_polygon: [
          [0, 0],
          [10000, 0],
          [10000, 6000],
          [0, 6000],
        ],
        walls: [
          {
            id: 'w1',
            polyline: [
              [0, 6000],
              [10000, 6000],
            ],
            thickness: 200,
            height: 3000,
            base_elevation: 0,
            wall_type: 'exterior',
            material_id: 'm',
            opening_ids: [],
            connected_wall_ids: [],
            load_bearing: true,
            provenance: {},
          },
        ],
        doors: [],
        windows: [],
        openings: [],
        rooms: [],
        furniture: [],
        fixtures: [],
        columns: [],
        beams: [],
        stairs: [],
        ramps: [],
        text_labels: [],
        dimensions: [],
      },
    ],
  }
}

function boxesByKind(model) {
  const found = {}
  model.root.traverse((object) => {
    if (!object.isMesh) return
    const kind = (object.parent?.name || '').split(':')[0]
    if (!kind) return
    found[kind] = new THREE.Box3().setFromObject(object)
  })
  return found
}

test('the slab is built on the same side of the origin as the walls', () => {
  const { slab, wall } = boxesByKind(buildModel(documentWithSlabAndWall(), { outlines: false }))

  // `toWorld` sends plan +y to world -z. A slab spanning plan y 0..6000 must
  // therefore occupy world z -6..0, NOT 0..6.
  //
  // THIS IS A REGRESSION TEST FOR A REAL BUG. The slab is the only thing built
  // from a `THREE.Shape`, and the rotation that stands the shape up already
  // applies that flip; the outline was ALSO being negated, so the flip happened
  // twice. Slabs and room floors came out mirrored about the plan's x axis and
  // landed a whole building-depth away from the walls - which is what a user
  // sees as a grey floor lying beside the model rather than under it. Nothing
  // else in the viewer uses `Shape`, so nothing else caught it.
  assert.ok(slab.min.z < -5.9 && slab.min.z > -6.1, `slab min.z was ${slab.min.z}`)
  assert.ok(slab.max.z <= 0.001, `slab max.z was ${slab.max.z}`)

  // And the wall has to stand ON it, not beside it.
  assert.ok(
    wall.min.z >= slab.min.z - 0.2 && wall.max.z <= slab.max.z + 0.2,
    `wall z ${wall.min.z}..${wall.max.z} is outside slab z ${slab.min.z}..${slab.max.z}`,
  )
})

test('the slab hangs below the floor datum rather than standing on it', () => {
  const { slab, wall } = boxesByKind(buildModel(documentWithSlabAndWall(), { outlines: false }))

  // A slab polygon is the FINISHED FLOOR level and the structure hangs below
  // it, matching `blender/common.py:polygon_mesh`. Extruding upwards instead
  // puts the floor 200 mm proud of the walls standing on it.
  assert.ok(Math.abs(slab.max.y) < 0.002, `slab top was at y=${slab.max.y}, expected 0`)
  assert.ok(Math.abs(slab.min.y + 0.2) < 0.002, `slab underside was at y=${slab.min.y}`)
  assert.ok(Math.abs(wall.min.y) < 0.002, `wall base was at y=${wall.min.y}`)
})

test('the low quality preset drops to non-physical materials', () => {
  const doc = documentWithSlabAndWall()
  const physical = buildModel(doc, { outlines: false, physicallyBased: true })
  const lambert = buildModel(doc, { outlines: false, physicallyBased: false })

  const typeOf = (model) => {
    let name = null
    model.root.traverse((object) => {
      if (object.isMesh && !name) name = object.material.type
    })
    return name
  }
  assert.equal(typeOf(physical), 'MeshStandardMaterial')
  assert.equal(typeOf(lambert), 'MeshLambertMaterial')
})


// ---------------------------------------------------------------------------
// Stair kinds and voids: the two engines must agree
// ---------------------------------------------------------------------------

function documentWithStair(kind, overrides = {}) {
  const { runWidth = 1000, steps = 16, tread = 250, start = [2000, 1500] } = overrides
  return {
    materials: [{ id: 'mat-stair', color: '#BFBAB2', roughness: 0.8, metallic: 0, opacity: 1 }],
    levels: [
      {
        id: 'L1',
        name: 'Ground',
        elevation: 0,
        floor_to_floor: 3000,
        slab_thickness: 150,
        slab_polygon: [[0, 0], [8000, 0], [8000, 8000], [0, 8000]],
        walls: [],
        rooms: [
          {
            id: 'R1',
            name: 'Stair hall',
            room_type: 'stair',
            polygon: [[1000, 1000], [5000, 1000], [5000, 6000], [1000, 6000]],
            provenance: {},
          },
        ],
        stairs: [
          {
            id: 'S1',
            kind,
            start,
            direction: 90,
            run_width: runWidth,
            tread_depth: tread,
            riser_height: 180,
            step_count: steps,
            total_rise: steps * 180,
            landings: [],
            goes_up: true,
            material_id: 'mat-stair',
            provenance: {},
          },
        ],
        doors: [], windows: [], openings: [], furniture: [], fixtures: [],
        columns: [], beams: [], ramps: [], text_labels: [], dimensions: [],
      },
    ],
  }
}

/** The stair's plan footprint in millimetres, as [xSpan, zSpan]. */
function stairFootprint(document) {
  const model = buildModel(document, { outlines: false })
  const box = new THREE.Box3()
  let found = false
  model.root.traverse((object) => {
    if (!object.isMesh) return
    if (!(object.parent?.name || '').startsWith('stair:')) return
    box.expandByObject(object)
    found = true
  })
  assert.ok(found, 'no stair geometry was built')
  const size = box.getSize(new THREE.Vector3())
  return [size.x * 1000, size.z * 1000]
}

test('a spiral stair fits the circle its run_width describes', () => {
  const runWidth = 1500
  const [x, z] = stairFootprint(documentWithStair('spiral', { runWidth, steps: 12, tread: 220 }))
  // `run_width` is the DIAMETER of a circular stair, not its radius. Read as a
  // radius it doubles every spiral and pushes it out through its own stair well.
  for (const span of [x, z]) {
    assert.ok(
      span < runWidth * 1.35,
      `the spiral is ${span.toFixed(0)} mm across, nearer twice ${runWidth} than equal to it`,
    )
    assert.ok(span > runWidth * 0.5, `the spiral is only ${span.toFixed(0)} mm across`)
  }
})

test('a u-shape stair folds back instead of running straight on', () => {
  const runWidth = 1000
  const tread = 250
  const steps = 16
  const [x, z] = stairFootprint(documentWithStair('u_shape', { runWidth, steps, tread }))
  // Direction is 90 degrees, so the flights run along the plan's y - which is
  // the viewer's z - and the pair widens along x.
  assert.ok(
    z < steps * tread * 0.8,
    `the run is ${z.toFixed(0)} mm long against ${steps * tread} straight - it did not fold`,
  )
  assert.ok(
    x > runWidth * 1.6,
    `the stair is only ${x.toFixed(0)} mm wide, so there is one flight, not two`,
  )
})

test('a straight flight is unchanged by the addition of the other kinds', () => {
  const [x, z] = stairFootprint(documentWithStair('straight', { steps: 12 }))
  assert.ok(z > 12 * 250 * 0.9, `expected a full-length run, got ${z.toFixed(0)} mm`)
  assert.ok(x < 1200, `expected one flight's width, got ${x.toFixed(0)} mm`)
})

test('an open-to-sky room is a hole, not a floor', () => {
  const document = documentWithSlabAndWall()
  const level = document.levels[0]
  level.rooms = [
    {
      id: 'V1',
      name: 'OPEN TO SKY',
      room_type: 'light_well',
      polygon: [[2000, 1000], [6000, 1000], [6000, 4000], [2000, 4000]],
      provenance: {},
    },
  ]
  const model = buildModel(document, { outlines: false })

  // No floor finish for it: a light well given one reads as a windowless
  // internal room, which is exactly the defect this guards.
  let roomMeshes = 0
  model.root.traverse((object) => {
    if (object.isMesh && (object.parent?.name || '').startsWith('room:')) roomMeshes += 1
  })
  assert.equal(roomMeshes, 0, 'a void room was given a floor finish')

  // And the slab is genuinely perforated rather than merely covered up: an
  // extruded shape with a hole has more vertices than the same shape without.
  const withHole = model.root.getObjectByName(`slab:${level.id}`)
  assert.ok(withHole, 'no slab was built')
  level.rooms = []
  const solid = buildModel(document, { outlines: false }).root.getObjectByName(
    `slab:${level.id}`,
  )
  const count = (group) => {
    let total = 0
    group.traverse((object) => {
      if (object.isMesh) total += object.geometry.attributes.position.count
    })
    return total
  }
  assert.ok(
    count(withHole) > count(solid),
    'the slab has the same geometry with and without the void - it was not cut',
  )
})
