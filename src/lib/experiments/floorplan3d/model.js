/**
 * Reading inside the architectural model document.
 *
 * THE ONE MODULE THAT KNOWS THE DOCUMENT'S FIELD NAMES. Everything else in
 * this feature works with what these functions return, which is why the
 * document can stay `snake_case` without spreading that spelling through the
 * components — see the note in `adapters.js`.
 *
 * Pure: no React, no Three.js, no network. The 2D plan, the 3D scene, the
 * inspector, the element tree and the export helpers all read through here, so
 * "what is in this model" has exactly one answer.
 */

export const OPENING_COLLECTIONS = ['doors', 'windows', 'passages']

export const ELEMENT_KINDS = {
  level: 'level',
  wall: 'wall',
  room: 'room',
  slab: 'slab',
  door: 'door',
  window: 'window',
  passage: 'passage',
  column: 'column',
  beam: 'beam',
  stair: 'stair',
  fixture: 'fixture',
  furniture: 'furniture',
  material: 'material',
  dimension: 'dimension',
  label: 'label',
}

/** Which collections a layer toggle covers. The left panel drives this. */
export const LAYERS = [
  { id: 'walls', label: 'Walls', kinds: ['wall'] },
  { id: 'openings', label: 'Doors & windows', kinds: ['door', 'window', 'passage'] },
  { id: 'rooms', label: 'Room finishes', kinds: ['room'] },
  { id: 'slabs', label: 'Floors & ceilings', kinds: ['slab'] },
  { id: 'structure', label: 'Columns, beams & stairs', kinds: ['column', 'beam', 'stair'] },
  { id: 'fixtures', label: 'Fixtures', kinds: ['fixture'] },
  { id: 'furniture', label: 'Furniture', kinds: ['furniture'] },
]

const KIND_TO_LAYER = new Map(
  LAYERS.flatMap((layer) => layer.kinds.map((kind) => [kind, layer.id])),
)

export function layerFor(kind) {
  return KIND_TO_LAYER.get(kind) ?? 'walls'
}

// -- collections -----------------------------------------------------------

export function levels(model) {
  return model?.levels ?? []
}

export function walls(model) {
  return model?.walls ?? []
}

export function rooms(model) {
  return model?.rooms ?? []
}

export function materials(model) {
  return model?.materials ?? []
}

/** Doors, windows and passages in one list, each tagged with its own kind. */
export function openings(model) {
  const out = []
  for (const collection of OPENING_COLLECTIONS) {
    for (const opening of model?.[collection] ?? []) {
      out.push({ ...opening, kind: collection.slice(0, -1) })
    }
  }
  return out
}

export function openingsOnWall(model, wallId) {
  return openings(model).filter((opening) => opening.wall_id === wallId)
}

// -- lookups ---------------------------------------------------------------

export function wallById(model, id) {
  return walls(model).find((wall) => wall.id === id) ?? null
}

export function levelById(model, id) {
  return levels(model).find((level) => level.id === id) ?? null
}

export function roomById(model, id) {
  return rooms(model).find((room) => room.id === id) ?? null
}

export function materialById(model, id) {
  return materials(model).find((material) => material.id === id) ?? null
}

/**
 * Any element by id, with the collection it came from.
 *
 * Returns `{ element, kind }` rather than the bare element, because the
 * inspector needs to know what it is holding before it can offer the right
 * fields — and asking "which list was this in?" twice is how the two answers
 * drift apart.
 */
export function findElement(model, id) {
  if (!model || !id) return null
  const collections = [
    ['levels', ELEMENT_KINDS.level],
    ['walls', ELEMENT_KINDS.wall],
    ['rooms', ELEMENT_KINDS.room],
    ['slabs', ELEMENT_KINDS.slab],
    ['doors', ELEMENT_KINDS.door],
    ['windows', ELEMENT_KINDS.window],
    ['passages', ELEMENT_KINDS.passage],
    ['columns', ELEMENT_KINDS.column],
    ['beams', ELEMENT_KINDS.beam],
    ['stairs', ELEMENT_KINDS.stair],
    ['fixtures', ELEMENT_KINDS.fixture],
    ['furniture', ELEMENT_KINDS.furniture],
    ['materials', ELEMENT_KINDS.material],
    ['dimensions', ELEMENT_KINDS.dimension],
    ['labels', ELEMENT_KINDS.label],
  ]
  for (const [collection, kind] of collections) {
    const element = (model[collection] ?? []).find((entry) => entry.id === id)
    if (element) return { element, kind }
  }
  return null
}

// -- geometry --------------------------------------------------------------

export function wallLength(wall) {
  if (!wall) return 0
  return Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])
}

export function wallDirection(wall) {
  const length = wallLength(wall)
  if (length < 1e-9) return { ux: 1, uy: 0, length: 0 }
  return {
    ux: (wall.end[0] - wall.start[0]) / length,
    uy: (wall.end[1] - wall.start[1]) / length,
    length,
  }
}

export function wallAngleRadians(wall) {
  return Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0])
}

export function pointAlongWall(wall, distance) {
  const { ux, uy } = wallDirection(wall)
  return [wall.start[0] + ux * distance, wall.start[1] + uy * distance]
}

export function effectiveWallHeight(model, wall) {
  if (wall?.height != null) return wall.height
  return levelById(model, wall?.level_id)?.default_wall_height ?? 2.7
}

export function polygonArea(polygon) {
  if (!polygon || polygon.length < 3) return 0
  let total = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [x1, y1] = polygon[index]
    const [x2, y2] = polygon[(index + 1) % polygon.length]
    total += x1 * y2 - x2 * y1
  }
  return Math.abs(total) / 2
}

export function polygonCentroid(polygon) {
  if (!polygon || polygon.length === 0) return [0, 0]
  if (polygon.length < 3) {
    return [
      polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
      polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length,
    ]
  }
  let area = 0
  let cx = 0
  let cy = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [x1, y1] = polygon[index]
    const [x2, y2] = polygon[(index + 1) % polygon.length]
    const cross = x1 * y2 - x2 * y1
    area += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  if (Math.abs(area) < 1e-12) {
    return [
      polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
      polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length,
    ]
  }
  area /= 2
  return [cx / (6 * area), cy / (6 * area)]
}

/** (minX, minY, maxX, maxY) over everything with a plan position. */
export function modelBounds(model) {
  const xs = []
  const ys = []
  for (const wall of walls(model)) {
    xs.push(wall.start[0], wall.end[0])
    ys.push(wall.start[1], wall.end[1])
  }
  for (const room of rooms(model)) {
    for (const [x, y] of room.polygon ?? []) {
      xs.push(x)
      ys.push(y)
    }
  }
  for (const level of levels(model)) {
    for (const [x, y] of level.outline ?? []) {
      xs.push(x)
      ys.push(y)
    }
  }
  if (!xs.length) return [0, 0, 10, 10]
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

/**
 * Split a wall into the solid runs that survive its openings.
 *
 * The SAME rule the backend's `mesh.wall_runs` applies, so what the user sees
 * and what they export are the same building. Openings are cut by SPLITTING
 * the wall into boxes — before, after, under a sill, over a lintel — rather
 * than by boolean subtraction, which needs a library, is fragile on coplanar
 * faces, and can fail on input this system accepts. Splitting is exact for
 * rectangular openings, which is every opening this schema can express.
 *
 * Clamped even though the server repairs the model, because this also runs on
 * a model the user has just edited in the browser and not yet saved.
 */
export function wallRuns(wall, wallOpenings, height) {
  const { length } = wallDirection(wall)
  const cuts = (wallOpenings ?? [])
    .map((opening) => ({
      from: Math.max(0, Math.min(opening.distance_along, length)),
      to: Math.max(0, Math.min(opening.distance_along + opening.width, length)),
      sill: Math.max(0, Math.min(opening.sill_height ?? 0, height)),
      head: Math.max(
        0,
        Math.min((opening.sill_height ?? 0) + opening.height, height),
      ),
    }))
    .filter((cut) => cut.to - cut.from > 1e-6)
    .sort((a, b) => a.from - b.from)

  const runs = []
  let cursor = 0
  for (const cut of cuts) {
    if (cut.from - cursor > 1e-6) {
      runs.push({ from: cursor, to: cut.from, base: 0, top: height })
    }
    if (cut.sill > 1e-6) {
      runs.push({ from: cut.from, to: cut.to, base: 0, top: cut.sill })
    }
    if (height - cut.head > 1e-6) {
      runs.push({ from: cut.from, to: cut.to, base: cut.head, top: height })
    }
    cursor = Math.max(cursor, cut.to)
  }
  if (length - cursor > 1e-6) {
    runs.push({ from: cursor, to: length, base: 0, top: height })
  }
  return runs
}

// -- review surface --------------------------------------------------------

/**
 * The ids the UI must mark: low-confidence detections and open findings.
 *
 * The same rule the backend applies in `elements_needing_review`, computed
 * here so the viewer can tint an element without another request.
 */
export function elementsNeedingReview(model) {
  const flagged = new Set()
  for (const warning of model?.warnings ?? []) {
    if (warning.element_id && (warning.needs_review || !warning.repaired)) {
      flagged.add(warning.element_id)
    }
  }
  const collections = [
    'walls', 'rooms', 'doors', 'windows', 'passages',
    'columns', 'beams', 'stairs', 'fixtures', 'furniture',
  ]
  for (const collection of collections) {
    for (const element of model?.[collection] ?? []) {
      const provenance = element.provenance
      if (!provenance) continue
      if (provenance.source === 'user_correction') continue
      if ((provenance.confidence ?? 0) < 0.5) flagged.add(element.id)
    }
  }
  return flagged
}

/** How a provenance source is described to a person, and how it is coloured. */
export const PROVENANCE_LABELS = {
  explicit_dimension: {
    label: 'From a printed dimension',
    tone: 'measured',
    detail: 'Read off a dimension string on the drawing. The most reliable source there is.',
  },
  drawing_geometry: {
    label: 'Measured from the drawing',
    tone: 'measured',
    detail: 'Scaled off the drawing’s own geometry.',
  },
  ai_detection: {
    label: 'Detected',
    tone: 'detected',
    detail: 'Recognised in the drawing, but nothing on the sheet states it.',
  },
  project_default: {
    label: 'Assumed',
    tone: 'assumed',
    detail: 'Nothing in the drawing addressed this; a standard construction value was used.',
  },
  user_correction: {
    label: 'Set by you',
    tone: 'user',
    detail: 'You changed this. Nothing automatic will overwrite it.',
  },
}

export function describeProvenance(provenance) {
  const entry = PROVENANCE_LABELS[provenance?.source] ?? PROVENANCE_LABELS.ai_detection
  return {
    ...entry,
    confidence: provenance?.confidence ?? null,
    page: provenance?.page ?? null,
    bbox: provenance?.bbox ?? null,
    note: provenance?.note || '',
    needsReview:
      provenance?.source !== 'user_correction' && (provenance?.confidence ?? 0) < 0.5,
  }
}

// -- formatting ------------------------------------------------------------

export function formatMeters(value, decimals = 2) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)} m`
}

export function formatMillimeters(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(Number(value) * 1000)} mm`
}

export function formatArea(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Number(value).toFixed(1)} m²`
}

export function elementLabel(model, id) {
  const found = findElement(model, id)
  if (!found) return id
  const { element, kind } = found
  switch (kind) {
    case ELEMENT_KINDS.wall:
      return `${element.type === 'exterior' ? 'Exterior' : 'Interior'} wall ${element.id}`
    case ELEMENT_KINDS.room:
      return element.name || `Room ${element.id}`
    case ELEMENT_KINDS.level:
      return element.name || `Level ${element.id}`
    case ELEMENT_KINDS.furniture:
      return element.name || element.asset_type || `Furniture ${element.id}`
    case ELEMENT_KINDS.fixture:
      return element.category || `Fixture ${element.id}`
    case ELEMENT_KINDS.material:
      return element.name || `Material ${element.id}`
    default:
      return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${element.id}`
  }
}
