import * as commands from '@/lib/floorplan3d/editCommands'
import {
  ELEMENT_BUCKETS,
  ELEMENT_KINDS,
  elementLabel,
  levels as documentLevels,
  pointAtDistanceAlong,
} from '@/lib/floorplan3d/semanticModel'

/**
 * Running a planned edit — the bridge between a prompt and `editCommands`.
 *
 * ONE DEFINITION OF WHAT AN EDIT MEANS, AND IT IS NOT HERE.
 * Every operation below resolves to a command in `editCommands.js`, the same
 * module the Properties panel's number fields call. This file translates an
 * operation's arguments into that command's payload and nothing else: it does
 * no geometry, clamps no values and knows no rules. A second implementation of
 * "move a wall" — in this file, or in Python on the server — would be the
 * failure `wallSolidRuns` is documented as a warning about.
 *
 * THE SERVER PLANS, THE BROWSER EXECUTES, THE SERVER VALIDATES.
 * The model never sees a document and never writes one. It returns a list of
 * operation names and arguments; this applies them to a DRAFT; the user accepts;
 * and the result goes through the same `POST revisions/` a hand edit does, which
 * re-runs the deterministic repair and can still adjust or reject it.
 *
 * DRIFT IS NEGOTIATED, NOT ASSUMED.
 * `ASSIST_CAPABILITIES` is sent with every request, and the server builds the
 * planner's response schema from the intersection with its own vocabulary. An
 * operation this file has not got cannot be proposed, so a stale tab loses an
 * operation rather than receiving one it would have to throw away.
 *
 * THE DIFF IS OF THE WHOLE DOCUMENT, NOT OF THE TARGETS.
 * After each operation the two documents are compared in full, so the preview
 * shows the knock-on effects as well as the instruction: shortening a wall
 * slides the doors it hosts, and a user about to approve that should see it.
 * `keepOpeningsInsideWall` already does the sliding; this is what makes it
 * visible before it is saved rather than in a toast afterwards.
 */

/** Fields that describe HOW a value was arrived at, not what it is. */
const IGNORED_FIELDS = new Set(['provenance', 'opening_ids', 'connected_wall_ids'])

/**
 * Every operation this bundle can execute.
 *
 * `payload` receives `(elementId, args, context)` and returns the command's
 * payload. `args` arrives in the document's snake_case; the commands take
 * camelCase, and this is the only place the two meet.
 *
 * `undefined` is meaningful in almost every command — it means "leave this
 * alone" — so a payload deliberately passes arguments straight through rather
 * than defaulting them.
 */
export const ASSIST_OPERATIONS = {
  // -- openings ---------------------------------------------------------
  'set-opening-dimensions': {
    command: commands.setOpeningDimensions,
    payload: (elementId, args) => ({
      elementId,
      width: args.width,
      height: args.height,
      sillHeight: args.sill_height,
      kind: args.kind,
      swing: args.swing,
    }),
  },
  'set-opening-placement': {
    command: commands.setOpeningPlacement,
    payload: (elementId, args) => ({
      elementId,
      position: args.position,
      hostWallId: args.host_wall_id,
    }),
  },
  // The target is the HOST WALL, so the element that changes is a new one.
  'add-opening': {
    command: commands.addOpening,
    creates: true,
    payload: (wallId, args, { levelIdFor, pointAlongWall }) => ({
      levelId: levelIdFor(wallId),
      wallId,
      kind: args.kind || 'door',
      width: args.width,
      height: args.height,
      sillHeight: args.sill_height,
      // `addOpening` places an opening at a POINT, which it then projects onto
      // the wall's centreline; a plan gives the distance along instead. Turning
      // the distance back into a point on that same centreline is exact, and it
      // means the command keeps its single definition of where an opening may
      // sit — including the end margins. `null` leaves the command's own
      // centring, which is what "put a door in this wall" should do.
      point: pointAlongWall(wallId, args.position),
    }),
  },

  // -- walls ------------------------------------------------------------
  'set-wall-dimensions': {
    command: commands.setWallDimensions,
    payload: (elementId, args) => ({
      elementId,
      thickness: args.thickness,
      height: args.height,
      wallType: args.wall_type,
      loadBearing: args.load_bearing,
    }),
  },
  'set-wall-endpoint': {
    command: commands.setWallEndpoint,
    payload: (elementId, args, { pointOf }) => ({
      elementId,
      index: args.endpoint_index === undefined ? -1 : Math.round(args.endpoint_index),
      point: pointOf(elementId, args),
    }),
  },
  'add-wall': {
    command: commands.addWall,
    creates: true,
    targetsLevel: true,
    payload: (levelId, args) => ({
      levelId,
      start: [args.x ?? 0, args.y ?? 0],
      end: [args.end_x ?? 0, args.end_y ?? 0],
      thickness: args.thickness ?? 150,
      wallType: args.wall_type ?? 'interior',
    }),
  },

  // -- rooms and levels -------------------------------------------------
  'set-room-properties': {
    command: commands.setRoomProperties,
    payload: (elementId, args) => ({
      elementId,
      name: args.name,
      roomType: args.room_type,
      floorMaterialId: args.material_id,
      ceilingHeight: args.ceiling_height,
    }),
  },
  'set-level-properties': {
    command: commands.setLevelProperties,
    targetsLevel: true,
    payload: (levelId, args) => ({
      levelId,
      name: args.name,
      floorToFloor: args.floor_to_floor,
      slabThickness: args.slab_thickness,
      elevation: args.elevation,
    }),
  },
  'set-level-wall-height': {
    command: commands.setLevelWallHeight,
    targetsLevel: true,
    payload: (levelId, args) => ({ levelId, height: args.height }),
  },

  // -- structure --------------------------------------------------------
  'set-column-properties': {
    command: commands.setColumnProperties,
    payload: (elementId, args, { sizeOf, pointOf }) => ({
      elementId,
      position: args.x === undefined && args.y === undefined
        ? undefined
        : pointOf(elementId, args),
      size: sizeOf(elementId, args, 2),
      height: args.height,
      shape: args.shape,
      rotation: args.rotation,
    }),
  },
  'set-stair-properties': {
    command: commands.setStairProperties,
    payload: (elementId, args) => ({
      elementId,
      stepCount: args.step_count,
      treadDepth: args.tread_depth,
      runWidth: args.run_width,
      totalRise: args.total_rise,
      direction: args.direction,
      kind: args.kind,
      goesUp: args.goes_up,
    }),
  },

  // -- furniture --------------------------------------------------------
  'move-furniture': {
    command: commands.moveFurniture,
    payload: (elementId, args) => ({
      elementId,
      deltaXMm: args.delta_x ?? 0,
      deltaYMm: args.delta_y ?? 0,
    }),
  },
  'set-furniture-position': {
    command: commands.setFurniturePosition,
    payload: (elementId, args, { pointOf }) => ({
      elementId,
      position: pointOf(elementId, args),
    }),
  },
  'rotate-furniture': {
    command: commands.rotateFurniture,
    payload: (elementId, args) => ({
      elementId,
      absolute: args.rotation,
      deltaDegrees: args.delta_degrees,
    }),
  },
  'resize-furniture': {
    command: commands.scaleFurniture,
    payload: (elementId, args, { sizeOf }) => ({
      elementId,
      scale: args.scale ?? 1,
      size: sizeOf(elementId, args, 3),
    }),
  },
  'set-furniture-asset': {
    command: commands.setFurnitureAsset,
    payload: (elementId, args, { assetOf }) => {
      const asset = assetOf(args.asset_id)
      return {
        elementId,
        assetId: args.asset_id,
        semanticClass: args.semantic_class ?? asset?.semantic_class,
        size: asset?.default_size,
      }
    },
  },
  'duplicate-furniture': {
    command: commands.duplicateFurniture,
    creates: true,
    payload: (elementId, args) => ({ elementId, offsetMm: args.offset ?? 400 }),
  },
  'add-furniture': {
    command: commands.addFurniture,
    creates: true,
    targetsLevel: true,
    payload: (levelId, args, { assetOf }) => ({
      levelId,
      asset: assetOf(args.asset_id),
      position: [args.x ?? 0, args.y ?? 0],
      roomId: args.room_id ?? '',
    }),
  },

  // -- appearance -------------------------------------------------------
  'set-element-colour': {
    command: commands.setElementColor,
    payload: (elementId, args) => ({ elementId, color: args.colour ?? '' }),
  },
  'set-element-material': {
    command: commands.setElementMaterial,
    payload: (elementId, args, { materialFieldFor }) => ({
      elementId,
      materialId: args.material_id,
      field: materialFieldFor(elementId),
    }),
  },

  // -- removal and confirmation -----------------------------------------
  'delete-element': {
    command: commands.deleteElement,
    payload: (elementId) => ({ elementId }),
  },
  'confirm-element': {
    command: commands.confirmElement,
    payload: (elementId) => ({ elementId }),
  },
}

/** What this bundle tells the server it can run. Sent with every request. */
export const ASSIST_CAPABILITIES = Object.keys(ASSIST_OPERATIONS)

// ---------------------------------------------------------------------------
// Indexing and diffing
// ---------------------------------------------------------------------------
/**
 * `id → { element, bucket, kind, levelId }` for every element in a document.
 *
 * A Map rather than repeated `findElement` calls: the diff below runs once per
 * operation over the whole document, and `findElement` is a full walk each time.
 */
export function indexDocument(document) {
  const index = new Map()
  for (const level of documentLevels(document)) {
    for (const bucket of ELEMENT_BUCKETS) {
      for (const element of level[bucket] ?? []) {
        index.set(element.id, {
          element,
          bucket,
          kind: ELEMENT_KINDS[bucket],
          levelId: level.id,
        })
      }
    }
  }
  return index
}

function changedFields(before, after) {
  const fields = []
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key) || key === 'id') continue
    const from = before?.[key]
    const to = after?.[key]
    // Deep-ish comparison via JSON: every value in the document is a scalar, an
    // array of scalars, or an array of those. Objects with unordered keys do not
    // occur, so this cannot produce a false difference.
    if (JSON.stringify(from) === JSON.stringify(to)) continue
    fields.push({ name: key, before: from, after: to })
  }
  return fields.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * What changed between two documents, element by element.
 *
 * Used to describe one operation's effect, which is why it reports EVERYTHING
 * that moved rather than only the ids the operation named — see the module
 * note about knock-on effects.
 */
export function diffDocuments(before, after) {
  const from = indexDocument(before)
  const to = indexDocument(after)

  const changed = []
  const added = []
  const removed = []

  for (const [id, entry] of to) {
    const previous = from.get(id)
    if (!previous) {
      added.push({ id, kind: entry.kind, label: elementLabel(entry) })
      continue
    }
    const fields = changedFields(previous.element, entry.element)
    if (fields.length) {
      changed.push({ id, kind: entry.kind, label: elementLabel(entry), fields })
    }
  }

  for (const [id, entry] of from) {
    if (!to.has(id)) removed.push({ id, kind: entry.kind, label: elementLabel(entry) })
  }

  return { changed, added, removed }
}

// ---------------------------------------------------------------------------
// Applying a plan
// ---------------------------------------------------------------------------
function buildContext(document, catalog) {
  const index = indexDocument(document)
  return {
    index,
    levelIdFor: (elementId) => index.get(elementId)?.levelId ?? '',
    /** A point from `x`/`y`, falling back to whatever the element already has. */
    pointOf: (elementId, args) => {
      const current = index.get(elementId)?.element
      const fallback = Array.isArray(current?.position)
        ? current.position
        : current?.polyline?.[current.polyline.length - 1] ?? [0, 0]
      return [args.x ?? fallback[0] ?? 0, args.y ?? fallback[1] ?? 0]
    },
    /**
     * A size array, or undefined when the operation said nothing about size.
     *
     * Undefined matters: `scaleFurniture` treats any size it is given as an
     * override and ignores `scale`, so returning a size assembled from the
     * element's own values would silently cancel a `scale` argument.
     */
    sizeOf: (elementId, args, length) => {
      if (args.size_x === undefined && args.size_y === undefined && args.size_z === undefined) {
        return undefined
      }
      const current = index.get(elementId)?.element?.size ?? [600, 600, 750]
      const next = [
        args.size_x ?? current[0] ?? 600,
        args.size_y ?? current[1] ?? 600,
        args.size_z ?? current[2] ?? 750,
      ]
      return next.slice(0, length)
    },
    /**
     * A catalogue entry by id, falling back to its semantic class.
     *
     * The fallback matters: the planner is shown the ids the document already
     * uses, and a plan asking for `desk` when the catalogue calls it
     * `desk_1400` should still place a desk rather than an empty box.
     * `indexCatalog` builds both maps for exactly this.
     */
    /**
     * A point at `position` millimetres along a wall, or null.
     *
     * Null when no position was given, which is the difference between "put a
     * door 1.2 m along this wall" and "put a door in this wall".
     */
    pointAlongWall: (wallId, position) => {
      if (position === undefined || position === null) return null
      const polyline = index.get(wallId)?.element?.polyline
      if (!Array.isArray(polyline) || polyline.length < 2) return null
      return pointAtDistanceAlong(polyline, position)
    },
    assetOf: (assetId) =>
      assetId
        ? catalog?.byId?.get(assetId) ?? catalog?.byClass?.get(assetId) ?? null
        : null,
    /**
     * Which field on this element holds a material id.
     *
     * A room's floor finish is `floor_material_id`; everything else uses
     * `material_id`. Getting this wrong writes a field the contract ignores,
     * which looks exactly like an edit that did nothing.
     */
    materialFieldFor: (elementId) =>
      index.get(elementId)?.bucket === 'rooms' ? 'floor_material_id' : 'material_id',
  }
}

/**
 * Run a plan against a document and report what it did.
 *
 * Returns `{ document, results, changedIds, addedIds, removedIds, applied, skipped }`.
 * `document` is a NEW document — the original is untouched, which is what lets
 * the caller hold the proposal as a draft and throw it away for nothing.
 *
 * An operation that changes nothing is recorded as skipped rather than silently
 * counted: the commands refuse impossible edits by returning the document they
 * were given (a wall collapsed to a point, an opening wider than its wall), and
 * a preview that reported those as applied would be lying about the one thing
 * the user is reading it for.
 */
export function applyPlan(document, operations, { catalog, levelId } = {}) {
  let current = document
  const results = []
  const changedIds = new Set()
  const addedIds = new Set()
  const removedIds = new Set()

  for (const operation of operations ?? []) {
    const definition = ASSIST_OPERATIONS[operation.operation]
    if (!definition) {
      results.push({
        operation: operation.operation,
        describe: operation.describe,
        status: 'unsupported',
        reason: 'This version of the editor cannot run that operation.',
        changes: [],
      })
      continue
    }

    const args = operation.arguments ?? {}
    const targets = definition.targetsLevel
      ? (operation.target_ids?.length ? operation.target_ids : [levelId]).filter(Boolean)
      : operation.target_ids ?? []

    for (const targetId of targets) {
      const before = current
      const context = buildContext(before, catalog)
      let outcome
      try {
        outcome = definition.command.apply(
          before,
          definition.payload(targetId, args, context),
        )
      } catch (caught) {
        results.push({
          operation: operation.operation,
          targetId,
          describe: operation.describe,
          status: 'failed',
          reason: caught?.message || 'That change could not be made.',
          changes: [],
        })
        continue
      }

      const next = outcome?.document ?? outcome
      if (!next || next === before) {
        results.push({
          operation: operation.operation,
          targetId,
          describe: operation.describe,
          status: 'skipped',
          reason: 'That change would not fit, so the plan is unchanged.',
          changes: [],
        })
        continue
      }

      const diff = diffDocuments(before, next)

      // A NEW DOCUMENT IS NOT THE SAME AS A CHANGE.
      // Most commands stamp `provenance` — confirmed, manual, confidence 1 —
      // whenever they run, so asking for a value an element already holds
      // produces a different object with identical geometry. Counting that as
      // applied would offer a proposal saying "1 change" with nothing
      // highlighted anywhere, which is the fastest way to teach somebody to
      // stop reading the preview. The document is left alone too: quietly
      // marking an element confirmed is a side effect the user did not ask
      // for, and `confirm-element` is the operation that exists to ask for it.
      if (!diff.changed.length && !diff.added.length && !diff.removed.length) {
        results.push({
          operation: operation.operation,
          targetId,
          describe: operation.describe,
          status: 'skipped',
          reason: 'The plan already says that.',
          changes: [],
        })
        continue
      }
      for (const entry of diff.changed) changedIds.add(entry.id)
      for (const entry of diff.added) addedIds.add(entry.id)
      for (const entry of diff.removed) {
        removedIds.add(entry.id)
        changedIds.delete(entry.id)
        addedIds.delete(entry.id)
      }

      current = next
      results.push({
        operation: operation.operation,
        targetId,
        newElementId: outcome?.newElementId ?? null,
        describe: operation.describe,
        label: definition.command.label,
        status: 'applied',
        structural: Boolean(operation.structural),
        destructive: Boolean(operation.destructive),
        confirmed: (operation.confirmed_ids ?? []).includes(targetId),
        changes: diff.changed,
        added: diff.added,
        removed: diff.removed,
      })
    }
  }

  const applied = results.filter((result) => result.status === 'applied').length
  return {
    document: current,
    results,
    changedIds: [...changedIds],
    addedIds: [...addedIds],
    removedIds: [...removedIds],
    applied,
    skipped: results.length - applied,
    changed: current !== document,
  }
}

/**
 * A one-line change summary for the revision the user is about to save.
 *
 * The PROMPT, not the operation names. A history row reading "Widen the south
 * windows to 1200" is what somebody scanning the versions six weeks later
 * needs; "Edit opening (3)" is what the machine did.
 */
export function assistChangeSummary(prompt, applied) {
  const instruction = String(prompt ?? '').trim().replace(/\s+/g, ' ')
  const count = applied === 1 ? '1 change' : `${applied} changes`
  return `${instruction} — ${count} by prompt`.slice(0, 400)
}
