/**
 * Checks for the prompt-edit executor — the bridge between a plan and the
 * edit commands.
 *
 *     node --import ./src/lib/floorplan3d/checks/register.mjs \
 *          --test src/lib/floorplan3d/checks/assist.test.mjs
 *
 * WHAT IS WORTH CHECKING HERE, AND WHY
 * ------------------------------------
 * Nothing in `assistCommands.js` does geometry — that is the whole design, and
 * it is what makes these checks short. What it DOES do, and what breaks if it
 * does it wrong, is three things:
 *
 *   1. **Translate arguments.** The plan speaks the document's `snake_case`
 *      and the commands take camelCase. A mistranslated argument is silent:
 *      the command receives `undefined`, treats it as "leave this alone", and
 *      the preview reports a change that did not happen.
 *   2. **Refuse to lie about what happened.** A command that cannot make an
 *      edit returns the document it was given. If that counted as applied, the
 *      user would approve a proposal that changes nothing — which is worse
 *      than a refusal, because they stop checking.
 *   3. **Report the knock-on effects.** Shortening a wall slides the doors it
 *      hosts. The diff is taken over the WHOLE document for that reason, and
 *      an edit whose side effects went unreported would be an edit the user
 *      approved without seeing.
 *
 * The vocabulary's own rules — which operations exist, what ranges values are
 * clamped to, whether an id is of the right kind — are the SERVER's, and are
 * checked in `backend/floorplan3d/tests/test_assist.py`. Checking them again
 * here would be asserting a copy rather than the contract.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ASSIST_CAPABILITIES,
  ASSIST_OPERATIONS,
  applyPlan,
  assistChangeSummary,
  diffDocuments,
  indexDocument,
} from '../assistCommands.js'
import * as commands from '../editCommands.js'

function sampleDocument() {
  return {
    schema_version: '1.0',
    units: 'mm',
    materials: [{ id: 'floor-timber', name: 'Timber' }],
    levels: [
      {
        id: 'level-1',
        name: 'Ground Floor',
        elevation: 0,
        floor_to_floor: 3000,
        slab_thickness: 150,
        walls: [
          {
            id: 'wall-south',
            polyline: [[0, 0], [6000, 0]],
            thickness: 150,
            height: 2700,
            wall_type: 'exterior',
            opening_ids: ['window-1'],
          },
          {
            id: 'wall-north',
            polyline: [[0, 4000], [6000, 4000]],
            thickness: 150,
            height: 2700,
            wall_type: 'exterior',
            opening_ids: [],
          },
        ],
        rooms: [
          {
            id: 'room-kitchen',
            name: 'Kitchen',
            room_type: 'kitchen',
            polygon: [[0, 0], [6000, 0], [6000, 4000], [0, 4000]],
          },
        ],
        doors: [],
        windows: [
          {
            id: 'window-1',
            kind: 'window',
            host_wall_id: 'wall-south',
            position: 3000,
            width: 900,
            height: 1200,
            sill_height: 750,
            swing: 'none',
          },
        ],
        openings: [],
        columns: [],
        beams: [],
        stairs: [],
        ramps: [],
        furniture: [
          {
            id: 'desk-1',
            semantic_class: 'desk',
            position: [1000, 1000],
            rotation: 0,
            size: [1400, 700, 750],
            room_id: 'room-kitchen',
          },
        ],
        fixtures: [],
      },
    ],
    uncertainties: [],
  }
}

/** A plan operation, in the shape the server's `plan_payload` produces. */
function operation(name, targetIds, args = {}, extra = {}) {
  return {
    operation: name,
    target_ids: targetIds,
    arguments: args,
    describe: name,
    structural: false,
    destructive: false,
    confirmed_ids: [],
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// The vocabulary the browser advertises
// ---------------------------------------------------------------------------
test('every advertised capability resolves to a real command with a payload', () => {
  assert.ok(ASSIST_CAPABILITIES.length > 0)
  for (const name of ASSIST_CAPABILITIES) {
    const definition = ASSIST_OPERATIONS[name]
    assert.ok(definition, `${name} is advertised but not defined`)
    assert.equal(
      typeof definition.command?.apply,
      'function',
      `${name} does not resolve to an edit command`,
    )
    assert.equal(typeof definition.payload, 'function', `${name} has no payload builder`)
  }
})

test('every operation points at a command this app actually exports', () => {
  const exported = new Set(
    Object.values(commands).filter((value) => value && typeof value === 'object'),
  )
  for (const [name, definition] of Object.entries(ASSIST_OPERATIONS)) {
    assert.ok(
      exported.has(definition.command),
      `${name} uses a command that is not exported from editCommands`,
    )
  }
})

// ---------------------------------------------------------------------------
// Argument translation
// ---------------------------------------------------------------------------
test('an opening resize reaches the command with every argument translated', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('set-opening-dimensions', ['window-1'], {
      width: 1200,
      sill_height: 900,
    }),
  ])

  const window = outcome.document.levels[0].windows[0]
  assert.equal(window.width, 1200)
  // `sill_height`, not `sillHeight`. A mistranslation here is silent: the
  // command reads undefined as "leave it alone" and the sill never moves.
  assert.equal(window.sill_height, 900)
  assert.equal(outcome.applied, 1)
  assert.deepEqual(outcome.changedIds, ['window-1'])
})

test('a room type reaches the room, and a material reaches its floor field', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('set-room-properties', ['room-kitchen'], {
      name: 'Tea Point',
      room_type: 'pantry',
    }),
    operation('set-element-material', ['room-kitchen'], { material_id: 'floor-timber' }),
  ])

  const room = outcome.document.levels[0].rooms[0]
  assert.equal(room.name, 'Tea Point')
  assert.equal(room.room_type, 'pantry')
  // A room's material is its FLOOR finish. Writing `material_id` on a room
  // sets a field the contract ignores, which looks exactly like an edit that
  // did nothing.
  assert.equal(room.floor_material_id, 'floor-timber')
})

test('a level operation with no target falls back to the level in scope', () => {
  const outcome = applyPlan(
    sampleDocument(),
    [operation('set-level-wall-height', [], { height: 3000 })],
    { levelId: 'level-1' },
  )
  assert.equal(outcome.applied, 1)
  for (const wall of outcome.document.levels[0].walls) {
    assert.equal(wall.height, 3000)
  }
})

test('a relative furniture move adds to the position rather than replacing it', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('move-furniture', ['desk-1'], { delta_x: 300, delta_y: -200 }),
  ])
  assert.deepEqual(outcome.document.levels[0].furniture[0].position, [1300, 800])
})

test('a resize by scale is not cancelled by an absent size', () => {
  // `scaleFurniture` treats any size it is given as an override. Assembling one
  // from the element's own values would silently ignore the scale.
  const outcome = applyPlan(sampleDocument(), [
    operation('resize-furniture', ['desk-1'], { scale: 2 }),
  ])
  const size = outcome.document.levels[0].furniture[0].size
  assert.deepEqual(size.slice(0, 2), [2800, 1400])
  // Height is NOT scaled by a footprint change — the command's own rule.
  assert.equal(size[2], 750)
})

test('a new opening is placed at the distance along the wall that was asked for', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('add-opening', ['wall-south'], { kind: 'door', position: 1500, width: 900 }),
  ])
  assert.equal(outcome.applied, 1)
  const door = outcome.document.levels[0].doors[0]
  assert.ok(door, 'no door was added')
  // A plan gives a distance along the wall; the command takes a point. The
  // round trip through the centreline has to land back on the same number.
  assert.ok(
    Math.abs(door.position - 1500) < 1,
    `door landed at ${door.position} rather than 1500`,
  )
  assert.equal(door.host_wall_id, 'wall-south')
  // Anything added by a prompt is the user's, never something the drawing showed.
  assert.equal(door.provenance.detection_source, 'manual')
})

// ---------------------------------------------------------------------------
// Honesty about what happened
// ---------------------------------------------------------------------------
test('an operation that changes nothing is reported as skipped, not applied', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('set-opening-dimensions', ['window-1'], { width: 900, sill_height: 750 }),
  ])
  assert.equal(outcome.applied, 0)
  assert.equal(outcome.results[0].status, 'skipped')
  assert.equal(outcome.changed, false)
})

test('an unknown operation is reported rather than silently dropped', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('demolish-everything', ['wall-south'], {}),
  ])
  assert.equal(outcome.applied, 0)
  assert.equal(outcome.results[0].status, 'unsupported')
})

test('an operation aimed at a missing element is skipped and the rest still run', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('set-opening-dimensions', ['window-does-not-exist'], { width: 1200 }),
    operation('set-opening-dimensions', ['window-1'], { width: 1500 }),
  ])
  assert.equal(outcome.applied, 1)
  assert.equal(outcome.results[0].status, 'skipped')
  assert.equal(outcome.document.levels[0].windows[0].width, 1500)
})

test('the original document is never mutated', () => {
  const before = sampleDocument()
  const snapshot = JSON.stringify(before)
  applyPlan(before, [
    operation('set-opening-dimensions', ['window-1'], { width: 1200 }),
    operation('delete-element', ['desk-1'], {}),
  ])
  assert.equal(JSON.stringify(before), snapshot, 'applyPlan mutated its input')
})

test('one operation on many targets produces one result per target', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('set-wall-dimensions', ['wall-south', 'wall-north'], { thickness: 230 }),
  ])
  assert.equal(outcome.applied, 2)
  assert.equal(outcome.results.length, 2)
  for (const wall of outcome.document.levels[0].walls) {
    assert.equal(wall.thickness, 230)
  }
})

// ---------------------------------------------------------------------------
// Knock-on effects
// ---------------------------------------------------------------------------
test('a wall shortened under its opening reports the opening that moved too', () => {
  const outcome = applyPlan(sampleDocument(), [
    // Pull the wall's far end in so the window no longer fits where it was.
    operation('set-wall-endpoint', ['wall-south'], {
      endpoint_index: -1,
      x: 2000,
      y: 0,
    }),
  ])

  assert.equal(outcome.applied, 1)
  const touched = outcome.results[0].changes.map((change) => change.id)
  assert.ok(touched.includes('wall-south'))
  // The window was not named by the operation. It moved because the wall did,
  // and a preview that hid that would have the user approving a door move they
  // never saw.
  assert.ok(
    touched.includes('window-1'),
    'the opening on the shortened wall was not reported',
  )
})

test('a deletion is reported as a removal, not as a change', () => {
  const outcome = applyPlan(sampleDocument(), [
    operation('delete-element', ['wall-south'], {}, { destructive: true }),
  ])
  assert.deepEqual(outcome.removedIds.sort(), ['wall-south', 'window-1'])
  // Deleting a wall deletes the openings it hosts — an opening with no host is
  // a document the server's contract rejects outright.
  assert.equal(outcome.document.levels[0].windows.length, 0)
  assert.equal(outcome.changedIds.includes('wall-south'), false)
})

// ---------------------------------------------------------------------------
// Diffing and summaries
// ---------------------------------------------------------------------------
test('provenance changes alone are not reported as a change', () => {
  const before = sampleDocument()
  const after = commands.confirmElement.apply(before, { elementId: 'wall-south' })
  const diff = diffDocuments(before, after)
  // Confirming records HOW a value is held, not what it is. Reporting it as an
  // edit would make every confirm look like a geometry change.
  assert.equal(diff.changed.length, 0)
  assert.equal(diff.added.length, 0)
  assert.equal(diff.removed.length, 0)
})

test('the index finds every element across every bucket', () => {
  const index = indexDocument(sampleDocument())
  assert.equal(index.get('wall-south').bucket, 'walls')
  assert.equal(index.get('room-kitchen').kind, 'room')
  assert.equal(index.get('window-1').bucket, 'windows')
  assert.equal(index.get('desk-1').kind, 'furniture')
})

test('the change summary leads with the prompt, not with a command name', () => {
  const summary = assistChangeSummary('  Widen the  south windows to 1200 ', 3)
  assert.equal(summary, 'Widen the south windows to 1200 — 3 changes by prompt')
  assert.equal(assistChangeSummary('Set the ceilings to 3 m', 1).includes('1 change'), true)
})

test('a very long prompt is capped at what a change summary column holds', () => {
  const summary = assistChangeSummary('x'.repeat(900), 2)
  assert.ok(summary.length <= 400)
})
