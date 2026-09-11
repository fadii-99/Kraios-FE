/**
 * Edit commands and the undo/redo stack.
 *
 * ONE PATH FOR EVERY EDIT. A number typed in the inspector, a furniture item
 * dragged in the 3D scene, a wall endpoint pulled in the 2D plan and a
 * sentence typed into the chat all become the SAME command objects, validated
 * and applied by the same backend endpoint. That is what makes undo, redo and
 * the server's revision history one mechanism rather than four.
 *
 * WHY UNDO IS A COMMAND, NOT A ROLLBACK
 * -------------------------------------
 * Undo sends the INVERSE command rather than restoring a snapshot. Two
 * reasons, and both are about the server being the source of truth:
 *
 *   - a snapshot restore would need the whole model on the wire for every
 *     step, and the model is the largest thing here;
 *   - an inverse command is itself a revision, so the history reads as what
 *     actually happened ("moved the door back") rather than as a hole.
 *
 * Every command that can be undone declares its inverse at the moment it is
 * created, from the state BEFORE it ran — which is the only moment that
 * information exists. A command with no inverse (`add_*` and `delete_*` where
 * the id is minted by the server) is still applied; it just ends the undo run,
 * and `canUndo` says so rather than offering an undo that would silently do
 * something else.
 */

import {
  effectiveWallHeight,
  findElement,
  levelById,
  materialById,
  roomById,
  wallById,
  wallLength,
} from '@/lib/experiments/floorplan3d/model'

/** How many steps the browser stack keeps. The server keeps its own history. */
export const MAX_HISTORY = 50

/**
 * A command, its human description, and how to undo it.
 *
 * `inverse` is null when the operation cannot be reversed by another command —
 * an add whose id the server mints, a delete that would have to recreate every
 * hosted opening. Those are undone by restoring a revision, which the history
 * panel offers.
 */
export function command(op, { describe, inverse = null } = {}) {
  return { op, describe: describe || op.op, inverse }
}

// -- builders ---------------------------------------------------------------
// Each takes the CURRENT model, so the inverse can be captured before the
// change is applied. Returning `null` means "nothing to do", which callers
// treat as a no-op rather than as an error — a drag that ends where it started
// must not write a revision.

export function setWallThickness(model, wallId, thickness) {
  const wall = wallById(model, wallId)
  if (!wall || Math.abs(wall.thickness - thickness) < 1e-6) return null
  return command(
    { op: 'set_wall_thickness', wall_id: wallId, thickness },
    {
      describe: `Wall ${wallId} thickness → ${Math.round(thickness * 1000)} mm`,
      inverse: { op: 'set_wall_thickness', wall_id: wallId, thickness: wall.thickness },
    },
  )
}

export function setWallHeight(model, wallId, height) {
  const wall = wallById(model, wallId)
  if (!wall) return null
  const current = wall.height ?? null
  if (current === height) return null
  return command(
    { op: 'set_wall_height', wall_id: wallId, height },
    {
      describe: `Wall ${wallId} height → ${height == null ? 'level default' : `${height.toFixed(2)} m`}`,
      inverse: { op: 'set_wall_height', wall_id: wallId, height: current },
    },
  )
}

export function setWallType(model, wallId, type) {
  const wall = wallById(model, wallId)
  if (!wall || wall.type === type) return null
  return command(
    { op: 'set_wall_type', wall_id: wallId, type },
    {
      describe: `Wall ${wallId} → ${type}`,
      inverse: { op: 'set_wall_type', wall_id: wallId, type: wall.type },
    },
  )
}

export function setWallLength(model, wallId, length, anchor = 'start') {
  const wall = wallById(model, wallId)
  if (!wall) return null
  const current = wallLength(wall)
  if (Math.abs(current - length) < 1e-6) return null
  return command(
    { op: 'set_wall_length', wall_id: wallId, length, anchor },
    {
      describe: `Wall ${wallId} length → ${length.toFixed(2)} m`,
      inverse: { op: 'set_wall_length', wall_id: wallId, length: current, anchor },
    },
  )
}

export function moveWallEndpoint(model, wallId, endpoint, to, dragConnected = true) {
  const wall = wallById(model, wallId)
  if (!wall) return null
  const from = endpoint === 'start' ? wall.start : wall.end
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 1e-6) return null
  return command(
    {
      op: 'move_wall_endpoint',
      wall_id: wallId,
      endpoint,
      to: [to[0], to[1]],
      drag_connected: dragConnected,
    },
    {
      describe: `Moved wall ${wallId} ${endpoint}`,
      // Dragging the corner back takes its neighbours with it, the same way it
      // brought them — which is what makes this a true inverse rather than an
      // approximate one.
      inverse: {
        op: 'move_wall_endpoint',
        wall_id: wallId,
        endpoint,
        to: [from[0], from[1]],
        drag_connected: dragConnected,
      },
    },
  )
}

export function addWall(levelId, start, end, { type = 'interior', thickness } = {}) {
  return command(
    {
      op: 'add_wall',
      level_id: levelId,
      start: [start[0], start[1]],
      end: [end[0], end[1]],
      type,
      ...(thickness ? { thickness } : {}),
    },
    { describe: 'Added a wall' },
  )
}

export function deleteWall(wallId) {
  return command({ op: 'delete_wall', wall_id: wallId }, {
    describe: `Deleted wall ${wallId}`,
  })
}

export function addOpening(kind, wallId, distanceAlong, extra = {}) {
  return command(
    { op: 'add_opening', kind, wall_id: wallId, distance_along: distanceAlong, ...extra },
    { describe: `Added a ${kind}` },
  )
}

export function moveOpening(model, openingId, distanceAlong) {
  const found = findElement(model, openingId)
  if (!found) return null
  const current = found.element.distance_along
  if (Math.abs(current - distanceAlong) < 1e-6) return null
  return command(
    { op: 'move_opening', opening_id: openingId, distance_along: distanceAlong },
    {
      describe: `Moved ${openingId} to ${distanceAlong.toFixed(2)} m along its wall`,
      inverse: {
        op: 'move_opening',
        opening_id: openingId,
        distance_along: current,
      },
    },
  )
}

export function resizeOpening(model, openingId, changes) {
  const found = findElement(model, openingId)
  if (!found) return null
  const element = found.element
  const before = {}
  const after = {}
  for (const key of ['width', 'height', 'sill_height']) {
    if (changes[key] == null) continue
    if (Math.abs((element[key] ?? 0) - changes[key]) < 1e-6) continue
    after[key] = changes[key]
    before[key] = element[key]
  }
  if (!Object.keys(after).length) return null
  return command(
    { op: 'resize_opening', opening_id: openingId, ...after },
    {
      describe: `Resized ${openingId}`,
      inverse: { op: 'resize_opening', opening_id: openingId, ...before },
    },
  )
}

export function setOpeningOrientation(model, openingId, changes) {
  const found = findElement(model, openingId)
  if (!found) return null
  const element = found.element
  const before = {}
  const after = {}
  for (const key of ['swing_side', 'swing_direction']) {
    if (!changes[key] || changes[key] === element[key]) continue
    after[key] = changes[key]
    before[key] = element[key]
  }
  if (!Object.keys(after).length) return null
  return command(
    { op: 'set_opening_orientation', opening_id: openingId, ...after },
    {
      describe: `Changed the swing of ${openingId}`,
      inverse: { op: 'set_opening_orientation', opening_id: openingId, ...before },
    },
  )
}

export function deleteOpening(openingId) {
  return command({ op: 'delete_opening', opening_id: openingId }, {
    describe: `Deleted ${openingId}`,
  })
}

export function addFurniture(levelId, assetType, position, extra = {}) {
  return command(
    {
      op: 'add_furniture',
      level_id: levelId,
      asset_type: assetType,
      position: [position[0], position[1]],
      ...extra,
    },
    { describe: `Added ${assetType.replace(/_/g, ' ')}` },
  )
}

export function moveFurniture(model, furnitureId, position) {
  const found = findElement(model, furnitureId)
  if (!found) return null
  const from = found.element.position
  if (Math.hypot(position[0] - from[0], position[1] - from[1]) < 1e-6) return null
  return command(
    { op: 'move_furniture', furniture_id: furnitureId, position: [position[0], position[1]] },
    {
      describe: `Moved ${found.element.name || found.element.asset_type}`,
      inverse: {
        op: 'move_furniture',
        furniture_id: furnitureId,
        position: [from[0], from[1]],
      },
    },
  )
}

export function rotateFurniture(model, furnitureId, rotation) {
  const found = findElement(model, furnitureId)
  if (!found) return null
  const from = found.element.rotation ?? 0
  if (Math.abs(from - rotation) < 1e-6) return null
  return command(
    { op: 'rotate_furniture', furniture_id: furnitureId, rotation },
    {
      describe: `Rotated ${found.element.name || found.element.asset_type}`,
      inverse: { op: 'rotate_furniture', furniture_id: furnitureId, rotation: from },
    },
  )
}

export function resizeFurniture(model, furnitureId, { size, height, seats }) {
  const found = findElement(model, furnitureId)
  if (!found) return null
  const element = found.element
  const after = {}
  const before = {}
  if (size && (Math.abs(size[0] - element.size[0]) > 1e-6
    || Math.abs(size[1] - element.size[1]) > 1e-6)) {
    after.size = [size[0], size[1]]
    before.size = [element.size[0], element.size[1]]
  }
  if (height != null && Math.abs(height - element.height) > 1e-6) {
    after.height = height
    before.height = element.height
  }
  if (seats != null && seats !== element.seats) {
    after.seats = seats
    before.seats = element.seats ?? 0
  }
  if (!Object.keys(after).length) return null
  return command(
    { op: 'resize_furniture', furniture_id: furnitureId, ...after },
    {
      describe: `Resized ${element.name || element.asset_type}`,
      inverse: { op: 'resize_furniture', furniture_id: furnitureId, ...before },
    },
  )
}

export function deleteFurniture(furnitureId) {
  return command({ op: 'delete_furniture', furniture_id: furnitureId }, {
    describe: `Deleted ${furnitureId}`,
  })
}

export function assignMaterial(model, elementId, materialId, slot = 'default') {
  const found = findElement(model, elementId)
  if (!found) return null
  const field =
    slot === 'floor' ? 'floor_material_id'
      : slot === 'ceiling' ? 'ceiling_material_id'
        : 'material_id'
  const current = found.element[field] ?? null
  if (current === materialId) return null
  const material = materialById(model, materialId)
  return command(
    { op: 'assign_material', element_id: elementId, material_id: materialId, slot },
    {
      describe: `${elementId} → ${material?.name ?? materialId}`,
      // Clearing a material is not an operation, so an element that had none
      // cannot be returned to having none by a command. It is still undoable
      // through the revision history, which is what the panel offers.
      inverse: current
        ? { op: 'assign_material', element_id: elementId, material_id: current, slot }
        : null,
    },
  )
}

export function renameRoom(model, roomId, { name, type }) {
  const room = roomById(model, roomId)
  if (!room) return null
  const after = {}
  const before = {}
  if (name != null && name !== room.name) {
    after.name = name
    before.name = room.name
  }
  if (type != null && type !== room.type) {
    after.type = type
    before.type = room.type
  }
  if (!Object.keys(after).length) return null
  return command(
    { op: 'rename_room', room_id: roomId, ...after },
    {
      describe: `Renamed ${room.name}`,
      inverse: { op: 'rename_room', room_id: roomId, ...before },
    },
  )
}

export function setLevelHeights(model, levelId, changes) {
  const level = levelById(model, levelId)
  if (!level) return null
  const after = {}
  const before = {}
  for (const key of ['default_wall_height', 'floor_to_floor', 'slab_thickness']) {
    if (changes[key] == null) continue
    if (Math.abs(level[key] - changes[key]) < 1e-6) continue
    after[key] = changes[key]
    before[key] = level[key]
  }
  if (!Object.keys(after).length) return null
  return command(
    { op: 'set_level_heights', level_id: levelId, ...after },
    {
      describe: `${level.name} heights changed`,
      // Setting a wall height can raise the floor-to-floor to suit, so the
      // inverse restores BOTH — undoing only what was asked for would leave
      // the storey taller than it started.
      inverse: {
        op: 'set_level_heights',
        level_id: levelId,
        default_wall_height: level.default_wall_height,
        floor_to_floor: level.floor_to_floor,
        slab_thickness: level.slab_thickness,
      },
    },
  )
}

export function setLevelElevation(model, levelId, elevation, cascade = true) {
  const level = levelById(model, levelId)
  if (!level || Math.abs(level.elevation - elevation) < 1e-6) return null
  return command(
    { op: 'set_level_elevation', level_id: levelId, elevation, cascade },
    {
      describe: `${level.name} elevation → ${elevation.toFixed(2)} m`,
      inverse: {
        op: 'set_level_elevation',
        level_id: levelId,
        elevation: level.elevation,
        cascade,
      },
    },
  )
}

// -- the stack --------------------------------------------------------------

export function emptyHistory() {
  return { past: [], future: [] }
}

/**
 * Record a command. Clears the redo branch, because a new edit made from here
 * means the future the user redid away from is no longer reachable.
 */
export function pushHistory(history, entry) {
  const past = [...history.past, entry].slice(-MAX_HISTORY)
  return { past, future: [] }
}

export function canUndo(history) {
  return history.past.length > 0 && Boolean(history.past.at(-1)?.inverse)
}

export function canRedo(history) {
  return history.future.length > 0
}

/**
 * What undo should send, and the history after it.
 *
 * Returns `null` when the last command has no inverse — an add or a delete
 * whose ids the server minted. The toolbar reads `canUndo` and disables rather
 * than offering an undo that would do something else.
 */
export function undoStep(history) {
  const entry = history.past.at(-1)
  if (!entry?.inverse) return null
  return {
    commands: [entry.inverse],
    describe: `Undo: ${entry.describe}`,
    history: {
      past: history.past.slice(0, -1),
      future: [entry, ...history.future].slice(0, MAX_HISTORY),
    },
  }
}

export function redoStep(history) {
  const entry = history.future[0]
  if (!entry) return null
  return {
    commands: [entry.op],
    describe: `Redo: ${entry.describe}`,
    history: {
      past: [...history.past, entry].slice(-MAX_HISTORY),
      future: history.future.slice(1),
    },
  }
}

/**
 * The label the toolbar shows on the undo control.
 *
 * Naming the step matters: "Undo" alone makes a user press it to find out what
 * it does, which in an editor is how work gets lost.
 */
export function undoLabel(history) {
  const entry = history.past.at(-1)
  if (!entry) return 'Nothing to undo'
  if (!entry.inverse) return `Cannot undo: ${entry.describe}`
  return `Undo: ${entry.describe}`
}

export function redoLabel(history) {
  const entry = history.future[0]
  return entry ? `Redo: ${entry.describe}` : 'Nothing to redo'
}

/** The heights a wall inherits, for the inspector's placeholder. */
export function inheritedWallHeight(model, wall) {
  return effectiveWallHeight(model, wall)
}
