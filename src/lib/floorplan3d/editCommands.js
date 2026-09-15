import {
  bearingAtDistanceAlong,
  distance,
  distanceToPolyline,
  levelById,
  manualProvenance,
  newElementId,
  openingsOf,
  pointAtDistanceAlong,
  polylineLength,
  wallById,
  withElement,
  withElementConfirmed,
  withLevel,
  withNewElement,
  withRebuiltOpeningIndex,
  withoutElement,
} from '@/lib/floorplan3d/semanticModel'

/**
 * Every edit the browser can make, as a command with an inverse.
 *
 * EDITS ARE SEMANTIC, NEVER MESH-LEVEL. Each command takes a document and
 * returns a NEW document; the scene is then rebuilt from it. Nothing here
 * touches a Three.js object. That is the whole architecture in one sentence:
 * dragging a wall changes a number in the JSON, and the geometry follows.
 *
 * UNDO IS A STACK OF DOCUMENTS, NOT OF INVERSE OPERATIONS.
 * A command's real inverse is hard to write correctly — deleting a wall also
 * deletes its openings, and un-deleting means restoring both plus their order —
 * and getting it subtly wrong produces an undo that corrupts the document. The
 * documents themselves are immutable and structurally shared, so keeping the
 * previous one costs a handful of objects rather than a copy of the building.
 * `HISTORY_LIMIT` bounds it.
 *
 * VALIDATION IS THE SERVER'S. These commands keep the document
 * INTERNALLY CONSISTENT — no dangling host, no reference to a deleted room —
 * because the server's contract rejects those outright and the editor should
 * not offer to save something that will be refused. They do NOT enforce the
 * geometric rules (an opening fitting inside its wall, a plausible thickness):
 * the server re-runs the same deterministic repair on save and says what it
 * adjusted. Duplicating that here would be two definitions of buildable.
 */

// How many steps of undo are kept. Twenty is well past what anybody uses in one
// sitting, and each step is a structurally-shared object rather than a copy.
export const HISTORY_LIMIT = 20

/** Snap a millimetre value to a grid. 0 or less means no snapping. */
export function snap(value, gridMm) {
  if (!(gridMm > 0)) return value
  return Math.round(value / gridMm) * gridMm
}

export function snapPoint(point, gridMm) {
  return [snap(point[0], gridMm), snap(point[1], gridMm)]
}

/**
 * Snap a point onto the nearest wall endpoint, if one is close enough.
 *
 * Endpoint snapping is what makes a hand-drawn wall meet the building instead
 * of stopping 40 mm short — the single most common thing a user has to fix by
 * hand, and the repair stage's biggest job. `tolerance` is in millimetres.
 */
export function snapToWallEndpoints(point, level, { tolerance = 200, exclude } = {}) {
  let best = null
  let bestGap = tolerance
  for (const wall of level?.walls ?? []) {
    if (wall.id === exclude) continue
    for (const candidate of [wall.polyline?.[0], wall.polyline?.[wall.polyline.length - 1]]) {
      if (!candidate) continue
      const gap = distance(point, candidate)
      if (gap < bestGap) {
        bestGap = gap
        best = candidate
      }
    }
  }
  return best ?? null
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
export const moveFurniture = {
  id: 'move-furniture',
  label: 'Move furniture',
  apply(document, { elementId, deltaXMm, deltaYMm, gridMm = 0 }) {
    return withElement(document, elementId, (element) => {
      const next = [
        (element.position?.[0] ?? 0) + deltaXMm,
        (element.position?.[1] ?? 0) + deltaYMm,
      ]
      return { ...element, position: gridMm > 0 ? snapPoint(next, gridMm) : next }
    })
  },
}

export const setFurniturePosition = {
  id: 'set-furniture-position',
  label: 'Set position',
  apply(document, { elementId, position }) {
    return withElement(document, elementId, { position })
  },
}

export const rotateFurniture = {
  id: 'rotate-furniture',
  label: 'Rotate furniture',
  apply(document, { elementId, deltaDegrees, absolute, snapDegrees = 0 }) {
    return withElement(document, elementId, (element) => {
      let rotation =
        absolute !== undefined
          ? absolute
          : (element.rotation ?? 0) + (deltaDegrees ?? 0)
      rotation = ((rotation % 360) + 360) % 360
      if (snapDegrees > 0) {
        rotation = (Math.round(rotation / snapDegrees) * snapDegrees) % 360
      }
      return { ...element, rotation }
    })
  },
}

export const scaleFurniture = {
  id: 'scale-furniture',
  label: 'Resize furniture',
  apply(document, { elementId, scale, size }) {
    return withElement(document, elementId, (element) => {
      if (size) return { ...element, size }
      const current = element.size ?? [600, 600, 750]
      // Height is NOT scaled by a plan-view drag: a plan drag says how big the
      // footprint is, and a user who wants a taller cabinet types a height.
      return {
        ...element,
        size: [
          Math.max(50, current[0] * scale),
          Math.max(50, current[1] * scale),
          current[2],
        ],
      }
    })
  },
}

export const setFurnitureAsset = {
  id: 'set-furniture-asset',
  label: 'Change furniture',
  apply(document, { elementId, assetId, semanticClass, size }) {
    return withElement(document, elementId, (element) => ({
      ...element,
      asset_id: assetId ?? element.asset_id,
      semantic_class: semanticClass ?? element.semantic_class,
      // The new asset's default size, unless the user has already sized this
      // item by hand — a confirmed size is theirs, not the catalogue's.
      size: size && !element.provenance?.confirmed ? size : element.size,
      provenance: { ...(element.provenance ?? {}), confirmed: true, detection_source: 'manual' },
    }))
  },
}

export const setElementColor = {
  id: 'set-element-color',
  label: 'Change colour',
  apply(document, { elementId, color }) {
    return withElement(document, elementId, { color: color || '' })
  },
}

export const setElementMaterial = {
  id: 'set-element-material',
  label: 'Change material',
  apply(document, { elementId, materialId, field = 'material_id' }) {
    return withElement(document, elementId, { [field]: materialId })
  },
}

export const duplicateFurniture = {
  id: 'duplicate-furniture',
  label: 'Duplicate furniture',
  apply(document, { elementId, offsetMm = 400 }) {
    for (const level of document.levels ?? []) {
      for (const bucket of ['furniture', 'fixtures']) {
        const original = (level[bucket] ?? []).find((item) => item.id === elementId)
        if (!original) continue
        const copy = {
          ...original,
          id: newElementId(),
          position: [
            (original.position?.[0] ?? 0) + offsetMm,
            (original.position?.[1] ?? 0) + offsetMm,
          ],
          provenance: manualProvenance('duplicated in the editor'),
        }
        return {
          document: withNewElement(document, level.id, bucket, copy),
          newElementId: copy.id,
        }
      }
    }
    return { document, newElementId: null }
  },
}

export const addFurniture = {
  id: 'add-furniture',
  label: 'Add furniture',
  apply(document, { levelId, asset, position, roomId = '' }) {
    const bucket = asset?.category === 'sanitary' || asset?.category === 'kitchen'
      ? 'fixtures'
      : 'furniture'
    const item = {
      id: newElementId(),
      semantic_class: asset?.semantic_class || 'other',
      asset_id: asset?.asset_id || '',
      position,
      rotation: 0,
      size: asset?.default_size ?? [600, 600, 750],
      base_elevation: 0,
      level_id: levelId,
      room_id: roomId,
      material_id: '',
      color: '',
      provenance: manualProvenance('added in the editor'),
    }
    return {
      document: withNewElement(document, levelId, bucket, item),
      newElementId: item.id,
    }
  },
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------
export const setWallEndpoint = {
  id: 'set-wall-endpoint',
  label: 'Move wall endpoint',
  apply(document, { elementId, index, point, gridMm = 0, snapToEndpoints = true }) {
    const entry = findWallLevel(document, elementId)
    if (!entry) return document
    const { level, wall } = entry

    let target = gridMm > 0 ? snapPoint(point, gridMm) : point
    if (snapToEndpoints) {
      const snapped = snapToWallEndpoints(target, level, { exclude: elementId })
      if (snapped) target = snapped
    }

    const polyline = [...(wall.polyline ?? [])]
    const at = index < 0 ? polyline.length + index : index
    if (at < 0 || at >= polyline.length) return document
    polyline[at] = target

    // A wall that has collapsed to a point is not a wall, and the contract
    // rejects it. Refusing the edit is better than storing something invalid.
    if (polylineLength(polyline) < 1) return document

    return keepOpeningsInsideWall(withElement(document, elementId, { polyline }), elementId)
  },
}

export const setWallDimensions = {
  id: 'set-wall-dimensions',
  label: 'Edit wall',
  apply(document, { elementId, thickness, height, wallType, loadBearing }) {
    const patched = withElement(document, elementId, (wall) => ({
      ...wall,
      ...(thickness !== undefined ? { thickness } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(wallType !== undefined ? { wall_type: wallType } : {}),
      ...(loadBearing !== undefined ? { load_bearing: loadBearing } : {}),
      // A value the user typed is measured, not assumed, and must survive the
      // next repair pass untouched.
      provenance: {
        ...(wall.provenance ?? {}),
        confirmed: true,
        detection_source: 'manual',
        confidence: 1,
      },
    }))
    // A shorter wall can leave an opening hanging above it.
    return height !== undefined ? keepOpeningsInsideWall(patched, elementId) : patched
  },
}

export const addWall = {
  id: 'add-wall',
  label: 'Add wall',
  apply(document, { levelId, start, end, thickness = 150, wallType = 'interior', gridMm = 0 }) {
    const level = levelById(document, levelId)
    if (!level) return { document, newElementId: null }

    let from = gridMm > 0 ? snapPoint(start, gridMm) : start
    let to = gridMm > 0 ? snapPoint(end, gridMm) : end
    from = snapToWallEndpoints(from, level) ?? from
    to = snapToWallEndpoints(to, level) ?? to
    if (distance(from, to) < 150) return { document, newElementId: null }

    const wall = {
      id: newElementId(),
      polyline: [from, to],
      thickness,
      height: level.floor_to_floor ? level.floor_to_floor - (level.slab_thickness ?? 150) : 2700,
      base_elevation: level.elevation ?? 0,
      wall_type: wallType,
      material_id: '',
      load_bearing: wallType === 'exterior',
      connected_wall_ids: [],
      opening_ids: [],
      provenance: manualProvenance('drawn in the editor'),
    }
    return {
      document: withNewElement(document, levelId, 'walls', wall),
      newElementId: wall.id,
    }
  },
}

export const deleteElement = {
  id: 'delete-element',
  label: 'Delete',
  apply(document, { elementId }) {
    return withoutElement(document, elementId)
  },
}

// ---------------------------------------------------------------------------
// Openings
// ---------------------------------------------------------------------------
export const addOpening = {
  id: 'add-opening',
  label: 'Add opening',
  apply(document, { levelId, wallId, kind = 'door', point, width, height, sillHeight }) {
    const level = levelById(document, levelId)
    const wall = wallById(level, wallId)
    if (!wall) return { document, newElementId: null }

    const wallLength = polylineLength(wall.polyline ?? [])
    // Placed where the user clicked, projected onto the wall's centreline —
    // which is what "add a door here" means when "here" is a point in space and
    // a door's position is a distance along a wall.
    const along = point
      ? distanceToPolyline(point, wall.polyline).along
      : wallLength / 2

    const isWindow = ['window', 'fixed_window', 'bay_window'].includes(kind)
    const openingWidth = width ?? (isWindow ? 1200 : 900)
    const openingHeight = height ?? (isWindow ? 1200 : 2100)
    const sill = sillHeight ?? (isWindow ? 900 : 0)

    const margin = 50 + openingWidth / 2
    if (wallLength < 2 * margin) return { document, newElementId: null }

    const opening = {
      id: newElementId(),
      kind,
      host_wall_id: wallId,
      position: Math.min(Math.max(along, margin), wallLength - margin),
      width: openingWidth,
      height: Math.min(openingHeight, (wall.height ?? 2700) - sill - 20),
      sill_height: sill,
      swing: isWindow ? 'none' : 'unknown',
      material_id: '',
      provenance: manualProvenance('added in the editor'),
    }

    const bucket = isWindow ? 'windows' : kind === 'passage' ? 'openings' : 'doors'
    return {
      document: withRebuiltOpeningIndex(
        withNewElement(document, levelId, bucket, opening),
      ),
      newElementId: opening.id,
    }
  },
}

export const setOpeningPlacement = {
  id: 'set-opening-placement',
  label: 'Move opening',
  apply(document, { elementId, position, hostWallId }) {
    const entry = findOpeningLevel(document, elementId)
    if (!entry) return document
    const { level, opening } = entry

    const targetWallId = hostWallId ?? opening.host_wall_id
    const wall = wallById(level, targetWallId)
    if (!wall) return document

    const wallLength = polylineLength(wall.polyline ?? [])
    const margin = 50 + opening.width / 2
    if (wallLength < 2 * margin) return document

    const clamped = Math.min(
      Math.max(position ?? opening.position, margin),
      wallLength - margin,
    )
    return withRebuiltOpeningIndex(
      withElement(document, elementId, {
        position: clamped,
        host_wall_id: targetWallId,
      }),
    )
  },
}

export const setOpeningDimensions = {
  id: 'set-opening-dimensions',
  label: 'Edit opening',
  apply(document, { elementId, width, height, sillHeight, kind, swing }) {
    const entry = findOpeningLevel(document, elementId)
    if (!entry) return document
    const { level, opening } = entry
    const wall = wallById(level, opening.host_wall_id)
    if (!wall) return document

    const wallLength = polylineLength(wall.polyline ?? [])
    const nextWidth = Math.max(200, Math.min(width ?? opening.width, wallLength - 100))
    const nextSill = Math.max(0, sillHeight ?? opening.sill_height ?? 0)
    const nextHeight = Math.max(
      100,
      Math.min(height ?? opening.height, (wall.height ?? 2700) - nextSill - 20),
    )

    const margin = 50 + nextWidth / 2
    const position = Math.min(
      Math.max(opening.position, margin),
      Math.max(margin, wallLength - margin),
    )

    return withElement(document, elementId, (current) => ({
      ...current,
      width: nextWidth,
      height: nextHeight,
      // A door with a sill is a mislabelled window; the contract corrects it
      // anyway, and doing it here keeps the editor's own preview honest.
      sill_height: isDoorKind(kind ?? current.kind) ? 0 : nextSill,
      ...(kind ? { kind } : {}),
      ...(swing ? { swing } : {}),
      position,
      provenance: {
        ...(current.provenance ?? {}),
        confirmed: true,
        detection_source: 'manual',
        confidence: 1,
      },
    }))
  },
}

// ---------------------------------------------------------------------------
// Rooms, levels, columns, stairs
// ---------------------------------------------------------------------------
export const setRoomProperties = {
  id: 'set-room-properties',
  label: 'Edit room',
  apply(document, { elementId, name, roomType, floorMaterialId, ceilingHeight }) {
    return withElement(document, elementId, (room) => ({
      ...room,
      ...(name !== undefined ? { name } : {}),
      ...(roomType !== undefined ? { room_type: roomType } : {}),
      ...(floorMaterialId !== undefined ? { floor_material_id: floorMaterialId } : {}),
      ...(ceilingHeight !== undefined ? { ceiling_height: ceilingHeight } : {}),
      provenance: {
        ...(room.provenance ?? {}),
        confirmed: true,
        detection_source: 'manual',
        confidence: 1,
      },
    }))
  },
}

export const setLevelProperties = {
  id: 'set-level-properties',
  label: 'Edit level',
  apply(document, { levelId, name, floorToFloor, slabThickness, elevation }) {
    return withLevel(document, levelId, (level) => ({
      ...level,
      ...(name !== undefined ? { name } : {}),
      ...(floorToFloor !== undefined ? { floor_to_floor: floorToFloor } : {}),
      ...(slabThickness !== undefined ? { slab_thickness: slabThickness } : {}),
      ...(elevation !== undefined ? { elevation } : {}),
    }))
  },
}

/**
 * Set every wall on a level to one height.
 *
 * The control the "assumed wall heights" finding points at: a storey height is
 * one decision, and making the user retype it on forty walls is how a review
 * list gets abandoned.
 */
export const setLevelWallHeight = {
  id: 'set-level-wall-height',
  label: 'Set storey height',
  apply(document, { levelId, height }) {
    let next = withLevel(document, levelId, (level) => ({
      ...level,
      walls: (level.walls ?? []).map((wall) => ({
        ...wall,
        height,
        provenance: {
          ...(wall.provenance ?? {}),
          confirmed: true,
          detection_source: 'manual',
          confidence: 1,
        },
      })),
    }))
    for (const opening of openingsOf(levelById(next, levelId) ?? {})) {
      next = clampOpeningToWall(next, levelId, opening.id)
    }
    return next
  },
}

export const setColumnProperties = {
  id: 'set-column-properties',
  label: 'Edit column',
  apply(document, { elementId, position, size, height, shape, rotation }) {
    return withElement(document, elementId, (column) => ({
      ...column,
      ...(position !== undefined ? { position } : {}),
      ...(size !== undefined ? { size } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(shape !== undefined ? { shape } : {}),
      ...(rotation !== undefined ? { rotation } : {}),
      provenance: {
        ...(column.provenance ?? {}),
        confirmed: true,
        detection_source: 'manual',
        confidence: 1,
      },
    }))
  },
}

/**
 * Edit a stair through its PARAMETERS, never its geometry.
 *
 * `total_rise` is kept as given and the riser height is re-derived from the step
 * count, so the flight always lands exactly on the floor above. A user who sets
 * a riser height and a step count that do not reach the next storey has
 * described an impossible stair, and silently building it is how dangerous
 * geometry gets into a model.
 */
export const setStairProperties = {
  id: 'set-stair-properties',
  label: 'Edit stair',
  apply(document, { elementId, stepCount, treadDepth, runWidth, totalRise, direction, kind, goesUp }) {
    return withElement(document, elementId, (stair) => {
      const rise = totalRise ?? stair.total_rise ?? 2800
      const steps = Math.max(1, Math.round(stepCount ?? stair.step_count ?? 16))
      return {
        ...stair,
        total_rise: rise,
        step_count: steps,
        riser_height: rise / steps,
        ...(treadDepth !== undefined ? { tread_depth: treadDepth } : {}),
        ...(runWidth !== undefined ? { run_width: runWidth } : {}),
        ...(direction !== undefined ? { direction } : {}),
        ...(kind !== undefined ? { kind } : {}),
        ...(goesUp !== undefined ? { goes_up: goesUp } : {}),
        provenance: {
          ...(stair.provenance ?? {}),
          confirmed: true,
          detection_source: 'manual',
          confidence: 1,
        },
      }
    })
  },
}

export const setSlabOutline = {
  id: 'set-slab-outline',
  label: 'Edit floor outline',
  apply(document, { levelId, polygon }) {
    if (!polygon || polygon.length < 3) return document
    return withLevel(document, levelId, { slab_polygon: polygon })
  },
}

export const confirmElement = {
  id: 'confirm-element',
  label: 'Confirm',
  apply(document, { elementId }) {
    return withElementConfirmed(document, elementId)
  },
}

// ---------------------------------------------------------------------------
// Internal consistency
// ---------------------------------------------------------------------------
function isDoorKind(kind) {
  return [
    'door',
    'double_door',
    'sliding_door',
    'folding_door',
    'garage_door',
  ].includes(kind)
}

function findWallLevel(document, wallId) {
  for (const level of document.levels ?? []) {
    const wall = (level.walls ?? []).find((candidate) => candidate.id === wallId)
    if (wall) return { level, wall }
  }
  return null
}

function findOpeningLevel(document, openingId) {
  for (const level of document.levels ?? []) {
    for (const bucket of ['doors', 'windows', 'openings']) {
      const opening = (level[bucket] ?? []).find((candidate) => candidate.id === openingId)
      if (opening) return { level, opening, bucket }
    }
  }
  return null
}

/**
 * Keep every opening on one wall inside it.
 *
 * Called after a wall is moved or shortened. The server would repair this on
 * save anyway, but doing it here means the user SEES the door slide back rather
 * than dragging a wall, saving, and discovering the door moved on its own.
 */
function keepOpeningsInsideWall(document, wallId) {
  const entry = findWallLevel(document, wallId)
  if (!entry) return document
  let next = document
  for (const opening of openingsOf(entry.level)) {
    if (opening.host_wall_id !== wallId) continue
    next = clampOpeningToWall(next, entry.level.id, opening.id)
  }
  return next
}

function clampOpeningToWall(document, levelId, openingId) {
  const level = levelById(document, levelId)
  const entry = findOpeningLevel(document, openingId)
  if (!level || !entry) return document
  const wall = wallById(level, entry.opening.host_wall_id)
  if (!wall) return document

  const wallLength = polylineLength(wall.polyline ?? [])
  const width = Math.min(entry.opening.width, Math.max(200, wallLength - 100))
  const margin = 50 + width / 2
  const position = Math.min(
    Math.max(entry.opening.position, margin),
    Math.max(margin, wallLength - margin),
  )
  const sill = entry.opening.sill_height ?? 0
  const height = Math.min(entry.opening.height, Math.max(100, (wall.height ?? 2700) - sill - 20))

  if (
    width === entry.opening.width &&
    position === entry.opening.position &&
    height === entry.opening.height
  ) {
    return document
  }
  return withElement(document, openingId, { width, position, height })
}

// ---------------------------------------------------------------------------
// The history stack
// ---------------------------------------------------------------------------
/**
 * An undo/redo stack over whole documents.
 *
 * `past` and `future` hold documents, not operations. See the module docstring
 * for why. `pendingSummaries` accumulates the labels of the commands applied
 * since the last save, which is what the save dialog offers as a change summary
 * — a user who moved two walls and added a door should not have to describe
 * that themselves.
 */
export function createHistory(initialDocument) {
  return {
    present: initialDocument,
    past: [],
    future: [],
    pendingSummaries: [],
    dirty: false,
  }
}

export function applyCommand(history, command, payload) {
  const result = command.apply(history.present, payload)
  const document = result?.document ?? result
  if (!document || document === history.present) {
    return { history, newElementId: result?.newElementId ?? null, changed: false }
  }

  const past = [...history.past, history.present].slice(-HISTORY_LIMIT)
  return {
    history: {
      present: document,
      past,
      // Any new edit invalidates the redo branch. Keeping it would let a user
      // redo their way into a document that never existed.
      future: [],
      pendingSummaries: [...history.pendingSummaries, command.label].slice(-40),
      dirty: true,
    },
    newElementId: result?.newElementId ?? null,
    changed: true,
  }
}

export function undo(history) {
  if (!history.past.length) return history
  const previous = history.past[history.past.length - 1]
  return {
    present: previous,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
    pendingSummaries: history.pendingSummaries.slice(0, -1),
    dirty: true,
  }
}

export function redo(history) {
  if (!history.future.length) return history
  const next = history.future[0]
  return {
    present: next,
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    future: history.future.slice(1),
    pendingSummaries: history.pendingSummaries,
    dirty: true,
  }
}

/** After a successful save: the server's document becomes the new baseline. */
export function markSaved(history, savedDocument) {
  return {
    present: savedDocument ?? history.present,
    // The undo stack is kept: a user who saves and then wants their previous
    // arrangement back is asking a reasonable question, and the answer is one
    // more revision rather than a lost afternoon.
    past: history.past,
    future: [],
    pendingSummaries: [],
    dirty: false,
  }
}

/** A one-line summary of what has changed since the last save. */
export function changeSummary(history) {
  const counts = new Map()
  for (const label of history.pendingSummaries) {
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  if (!counts.size) return 'Edited in the browser.'
  return [...counts.entries()]
    .map(([label, count]) => (count > 1 ? `${label} (${count})` : label))
    .join(', ')
    .slice(0, 400)
}

export { bearingAtDistanceAlong, pointAtDistanceAlong }
