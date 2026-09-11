/**
 * The model → an SVG floor plan, as geometry rather than as markup.
 *
 * Returns plain data — polylines, arcs, rectangles, labels — which the React
 * component renders. Keeping the geometry out of JSX means the projection can
 * be tested, reused for a hit test, and reasoned about without a DOM.
 *
 * WHY SVG AND NOT A SECOND CANVAS
 * -------------------------------
 * The 2D plan is where a user drags a wall corner and clicks a door, and every
 * element needs to be a real, focusable, hit-testable target. In SVG each one
 * is an element the browser already hit-tests; on a canvas every one of those
 * would be a manual pick against a list of shapes. The 3D scene needs a canvas
 * because it is a scene; the plan does not.
 *
 * PROJECTION
 * ----------
 * Model coordinates are +y UP; screen coordinates are +y DOWN. `project`
 * applies the flip and the scale in one place, and `unproject` inverts it —
 * which is what a corner drag needs to turn a pointer position back into a
 * model coordinate.
 */

import {
  effectiveWallHeight,
  openingsOnWall,
  polygonCentroid,
  wallDirection,
  wallRuns,
} from '@/lib/experiments/floorplan3d/model'

/** Padding around the drawing, in screen pixels. */
export const PLAN_PADDING = 32

/** A door's swing arc is drawn at its own width. */
const SWING_SEGMENTS = 12

/**
 * The transform between model metres and plan pixels.
 *
 * Built once per render from the model's bounds and the viewport size, then
 * passed to everything that needs to place something — so a wall, a door swing
 * and a pointer hit all agree about where a coordinate is.
 */
export function planTransform(bounds, width, height, { padding = PLAN_PADDING } = {}) {
  const [minX, minY, maxX, maxY] = bounds
  const spanX = Math.max(maxX - minX, 0.001)
  const spanY = Math.max(maxY - minY, 0.001)
  const usableWidth = Math.max(width - padding * 2, 1)
  const usableHeight = Math.max(height - padding * 2, 1)
  const scale = Math.min(usableWidth / spanX, usableHeight / spanY)

  // Centred, so a wide plan in a tall viewport does not sit against one edge.
  const offsetX = padding + (usableWidth - spanX * scale) / 2
  const offsetY = padding + (usableHeight - spanY * scale) / 2

  return {
    scale,
    project([x, y]) {
      return [
        offsetX + (x - minX) * scale,
        // +y is UP in the model and DOWN on screen. This flip is the whole
        // reason the plan reads the same way round as the drawing.
        offsetY + (maxY - y) * scale,
      ]
    },
    unproject([px, py]) {
      return [
        minX + (px - offsetX) / scale,
        maxY - (py - offsetY) / scale,
      ]
    },
    /** A length in metres, as pixels. */
    length(metres) {
      return metres * scale
    },
  }
}

/**
 * Everything to draw, in back-to-front order.
 *
 * Order is the z-order: floors, then room washes, then wall bodies, then
 * openings and their swings, then structure, then contents, then annotation.
 * Anything a user clicks is emitted with its element id, so the component does
 * not have to invent one.
 */
export function planShapes(model, transform, { levelIds, layers, flagged } = {}) {
  const visibleLevels = levelIds ?? new Set((model?.levels ?? []).map((l) => l.id))
  const enabled = layers ?? new Set([
    'walls', 'openings', 'rooms', 'slabs', 'structure', 'fixtures', 'furniture',
  ])
  const flaggedIds = flagged ?? new Set()

  const rooms = []
  const wallBodies = []
  const openingMarks = []
  const swings = []
  const structure = []
  const contents = []
  const labels = []
  const dimensions = []
  const handles = []

  const wallsById = new Map((model?.walls ?? []).map((wall) => [wall.id, wall]))

  if (enabled.has('rooms')) {
    for (const room of model?.rooms ?? []) {
      if (!visibleLevels.has(room.level_id)) continue
      rooms.push({
        id: room.id,
        kind: 'room',
        points: (room.polygon ?? []).map(transform.project),
        flagged: flaggedIds.has(room.id),
      })
      const [cx, cy] = polygonCentroid(room.polygon ?? [])
      labels.push({
        id: room.id,
        kind: 'room',
        text: room.name,
        at: transform.project([cx, cy]),
      })
    }
  }

  if (enabled.has('walls')) {
    for (const wall of model?.walls ?? []) {
      if (!visibleLevels.has(wall.level_id)) continue
      const half = wall.thickness / 2
      const { ux, uy } = wallDirection(wall)
      // The wall's own normal, so its two faces are drawn where they are
      // rather than as a line with a stroke width — which would be wrong at
      // every zoom level except one.
      const nx = -uy * half
      const ny = ux * half
      wallBodies.push({
        id: wall.id,
        kind: 'wall',
        type: wall.type,
        points: [
          transform.project([wall.start[0] + nx, wall.start[1] + ny]),
          transform.project([wall.end[0] + nx, wall.end[1] + ny]),
          transform.project([wall.end[0] - nx, wall.end[1] - ny]),
          transform.project([wall.start[0] - nx, wall.start[1] - ny]),
        ],
        flagged: flaggedIds.has(wall.id),
      })

      // Endpoint handles — what a corner drag grabs. Emitted per wall END
      // rather than per shared corner, because dragging is per wall and the
      // server decides which neighbours follow.
      for (const endpoint of ['start', 'end']) {
        handles.push({
          id: `${wall.id}:${endpoint}`,
          wallId: wall.id,
          endpoint,
          at: transform.project(wall[endpoint]),
        })
      }
    }
  }

  if (enabled.has('openings')) {
    for (const [collection, kind] of [
      ['doors', 'door'], ['windows', 'window'], ['passages', 'passage'],
    ]) {
      for (const opening of model?.[collection] ?? []) {
        const wall = wallsById.get(opening.wall_id)
        if (!wall || !visibleLevels.has(wall.level_id)) continue
        const { ux, uy } = wallDirection(wall)
        const half = wall.thickness / 2
        const nx = -uy * half
        const ny = ux * half
        const near = [
          wall.start[0] + ux * opening.distance_along,
          wall.start[1] + uy * opening.distance_along,
        ]
        const far = [
          near[0] + ux * opening.width,
          near[1] + uy * opening.width,
        ]
        openingMarks.push({
          id: opening.id,
          kind,
          points: [
            transform.project([near[0] + nx, near[1] + ny]),
            transform.project([far[0] + nx, far[1] + ny]),
            transform.project([far[0] - nx, far[1] - ny]),
            transform.project([near[0] - nx, near[1] - ny]),
          ],
          flagged: flaggedIds.has(opening.id),
        })

        if (kind === 'door') {
          swings.push(doorSwing(opening, wall, transform))
        }
      }
    }
  }

  if (enabled.has('structure')) {
    for (const column of model?.columns ?? []) {
      if (!visibleLevels.has(column.level_id)) continue
      structure.push({
        id: column.id,
        kind: 'column',
        shape: column.shape,
        at: transform.project(column.position),
        width: transform.length(column.width),
        depth: transform.length(column.depth),
        rotation: column.rotation ?? 0,
        flagged: flaggedIds.has(column.id),
      })
    }
    for (const beam of model?.beams ?? []) {
      if (!visibleLevels.has(beam.level_id)) continue
      structure.push({
        id: beam.id,
        kind: 'beam',
        from: transform.project(beam.start),
        to: transform.project(beam.end),
        flagged: flaggedIds.has(beam.id),
      })
    }
    for (const stair of model?.stairs ?? []) {
      if (!visibleLevels.has(stair.level_id)) continue
      structure.push({
        id: stair.id,
        kind: 'stair',
        treads: stairTreads(stair, transform),
        arrow: [transform.project(stair.start), transform.project(stair.end)],
        flagged: flaggedIds.has(stair.id),
      })
    }
  }

  for (const [collection, kind, layer] of [
    ['fixtures', 'fixture', 'fixtures'],
    ['furniture', 'furniture', 'furniture'],
  ]) {
    if (!enabled.has(layer)) continue
    for (const item of model?.[collection] ?? []) {
      if (!visibleLevels.has(item.level_id)) continue
      contents.push({
        id: item.id,
        kind,
        at: transform.project(item.position),
        width: transform.length(item.size[0]),
        depth: transform.length(item.size[1]),
        rotation: item.rotation ?? 0,
        label: item.name || item.asset_type || item.category || '',
        flagged: flaggedIds.has(item.id),
      })
    }
  }

  for (const dimension of model?.dimensions ?? []) {
    if (!visibleLevels.has(dimension.level_id)) continue
    dimensions.push({
      id: dimension.id,
      from: transform.project(dimension.start),
      to: transform.project(dimension.end),
      text: dimension.label || `${dimension.value.toFixed(2)} m`,
    })
  }

  return { rooms, wallBodies, openingMarks, swings, structure, contents, labels,
    dimensions, handles }
}

/**
 * The quarter-circle a door leaf sweeps, plus the leaf itself.
 *
 * Drawn because a door with no swing is indistinguishable from a hole, and
 * which way a door opens is a real decision a person makes on a plan.
 * `swing_side` picks the hinge end; `swing_direction` picks which side of the
 * wall the arc falls on.
 */
export function doorSwing(opening, wall, transform) {
  const { ux, uy } = wallDirection(wall)
  const hingeAt = opening.swing_side === 'right'
    ? opening.distance_along + opening.width
    : opening.distance_along
  const hinge = [
    wall.start[0] + ux * hingeAt,
    wall.start[1] + uy * hingeAt,
  ]
  // Along the wall, toward the opening's other edge.
  const sign = opening.swing_side === 'right' ? -1 : 1
  // The wall's normal, flipped for a door that opens the other way.
  const facing = opening.swing_direction === 'out' ? -1 : 1
  const nx = -uy * facing
  const ny = ux * facing

  const radius = opening.width
  const points = []
  for (let step = 0; step <= SWING_SEGMENTS; step += 1) {
    const angle = (Math.PI / 2) * (step / SWING_SEGMENTS)
    const alongComponent = Math.cos(angle) * radius * sign
    const outComponent = Math.sin(angle) * radius
    points.push(transform.project([
      hinge[0] + ux * alongComponent + nx * outComponent,
      hinge[1] + uy * alongComponent + ny * outComponent,
    ]))
  }

  return {
    id: opening.id,
    hinge: transform.project(hinge),
    // The leaf, drawn open at 90°, which is how a plan shows it.
    leaf: [
      transform.project(hinge),
      transform.project([hinge[0] + nx * radius, hinge[1] + ny * radius]),
    ],
    arc: points,
  }
}

function stairTreads(stair, transform) {
  const run = Math.hypot(stair.end[0] - stair.start[0], stair.end[1] - stair.start[1])
  if (run < 1e-6) return []
  const ux = (stair.end[0] - stair.start[0]) / run
  const uy = (stair.end[1] - stair.start[1]) / run
  const nx = -uy * (stair.width / 2)
  const ny = ux * (stair.width / 2)
  const going = run / stair.steps

  const treads = []
  for (let step = 1; step < stair.steps; step += 1) {
    const along = step * going
    const at = [stair.start[0] + ux * along, stair.start[1] + uy * along]
    treads.push([
      transform.project([at[0] + nx, at[1] + ny]),
      transform.project([at[0] - nx, at[1] - ny]),
    ])
  }
  return treads
}

/**
 * A wall's runs as plan rectangles — the 2D echo of the 3D split.
 *
 * Used by the plan's "show openings as gaps" mode, so the 2D drawing and the
 * 3D model agree about where a wall actually is solid.
 */
export function wallRunRectangles(model, wall, transform) {
  const height = effectiveWallHeight(model, wall)
  const { ux, uy } = wallDirection(wall)
  const half = wall.thickness / 2
  const nx = -uy * half
  const ny = ux * half

  return wallRuns(wall, openingsOnWall(model, wall.id), height)
    // Only the runs that reach the floor: a lintel over a door is solid wall
    // above head height, and drawing it as solid on a PLAN would fill in the
    // doorway, which is the one thing a plan must not do.
    .filter((run) => run.base < 1e-6)
    .map((run) => {
      const from = [wall.start[0] + ux * run.from, wall.start[1] + uy * run.from]
      const to = [wall.start[0] + ux * run.to, wall.start[1] + uy * run.to]
      return [
        transform.project([from[0] + nx, from[1] + ny]),
        transform.project([to[0] + nx, to[1] + ny]),
        transform.project([to[0] - nx, to[1] - ny]),
        transform.project([from[0] - nx, from[1] - ny]),
      ]
    })
}

export function pointsToPath(points) {
  if (!points?.length) return ''
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}
