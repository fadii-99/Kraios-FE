/**
 * Reading and editing a FloorPlan3D document, in plain JavaScript.
 *
 * THE DOCUMENT IS THE SOURCE OF TRUTH, AND IT STAYS IN snake_case.
 * `floorplan3dAdapters.js` translates the API ENVELOPE to camelCase per the
 * repository's convention, but the document itself is a versioned schema the
 * backend authors, both geometry engines consume, and this editor sends back
 * with edits. Its field names are the contract; renaming them here would mean
 * renaming them back on every save, in two languages, for no benefit. Only this
 * module and its siblings read inside it.
 *
 * UNITS ARE MILLIMETRES. Everywhere. The conversion to Three.js metres happens
 * in exactly one place — `MM_TO_M` in `buildScene.js` — for the same reason the
 * Blender half has exactly one `MM`.
 *
 * EVERY MUTATION RETURNS A NEW DOCUMENT. `withElement`, `withoutElement` and
 * friends structurally share everything they do not touch, so React sees a new
 * top-level object (and so re-renders) while the scene builder can compare
 * sub-objects by identity to decide what to rebuild. Mutating in place would
 * make both of those impossible.
 */

export const ELEMENT_BUCKETS = [
  'walls',
  'rooms',
  'doors',
  'windows',
  'openings',
  'columns',
  'beams',
  'stairs',
  'ramps',
  'furniture',
  'fixtures',
]

/** What the element tree and the inspector call each bucket, singular. */
export const ELEMENT_KINDS = {
  walls: 'wall',
  rooms: 'room',
  doors: 'door',
  windows: 'window',
  openings: 'opening',
  columns: 'column',
  beams: 'beam',
  stairs: 'stair',
  ramps: 'ramp',
  furniture: 'furniture',
  fixtures: 'fixture',
}

/** Which buckets the category-visibility toggles cover, in display order. */
export const CATEGORIES = [
  { id: 'slab', label: 'Slabs', buckets: [] },
  { id: 'wall', label: 'Walls', buckets: ['walls'] },
  { id: 'door', label: 'Doors', buckets: ['doors', 'openings'] },
  { id: 'window', label: 'Windows', buckets: ['windows'] },
  { id: 'room', label: 'Room floors', buckets: ['rooms'] },
  { id: 'stair', label: 'Stairs', buckets: ['stairs', 'ramps'] },
  { id: 'structure', label: 'Structure', buckets: ['columns', 'beams'] },
  { id: 'furniture', label: 'Furniture', buckets: ['furniture'] },
  { id: 'fixture', label: 'Fixtures', buckets: ['fixtures'] },
]

const OPENING_BUCKETS = ['doors', 'windows', 'openings']

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
export function levels(document) {
  return document?.levels ?? []
}

export function levelById(document, levelId) {
  return levels(document).find((level) => level.id === levelId) ?? null
}

/** Every opening on a level, whatever list it lives in. */
export function openingsOf(level) {
  return OPENING_BUCKETS.flatMap((bucket) => level?.[bucket] ?? [])
}

export function furnitureOf(level) {
  return [...(level?.furniture ?? []), ...(level?.fixtures ?? [])]
}

export function wallById(level, wallId) {
  return (level?.walls ?? []).find((wall) => wall.id === wallId) ?? null
}

export function openingsOnWall(level, wallId) {
  return openingsOf(level).filter((opening) => opening.host_wall_id === wallId)
}

export function materialById(document, materialId) {
  return (
    (document?.materials ?? []).find((material) => material.id === materialId) ?? null
  )
}

/**
 * Every addressable element, flat, with where it lives.
 *
 * `{ element, bucket, kind, level, levelId, category }`. What the element tree
 * lists, what a search filters, and what selection resolves through — one walk
 * of the document rather than eleven loops per consumer.
 */
export function allElements(document) {
  const result = []
  for (const level of levels(document)) {
    for (const bucket of ELEMENT_BUCKETS) {
      for (const element of level[bucket] ?? []) {
        result.push({
          element,
          bucket,
          kind: ELEMENT_KINDS[bucket],
          level,
          levelId: level.id,
          category: categoryForBucket(bucket),
        })
      }
    }
  }
  return result
}

export function categoryForBucket(bucket) {
  return CATEGORIES.find((category) => category.buckets.includes(bucket))?.id ?? 'other'
}

export function findElement(document, elementId) {
  if (!elementId) return null
  return allElements(document).find((entry) => entry.element.id === elementId) ?? null
}

/** A short human label for an element, for the tree and the inspector. */
export function elementLabel(entry) {
  if (!entry) return ''
  const { element, kind } = entry
  if (kind === 'room') return element.name || 'Room'
  if (kind === 'wall') {
    const type = element.wall_type || 'interior'
    return `${type[0].toUpperCase()}${type.slice(1)} wall`
  }
  if (kind === 'furniture' || kind === 'fixture') {
    return humanise(element.semantic_class || kind)
  }
  if (kind === 'door' || kind === 'window' || kind === 'opening') {
    return humanise(element.kind || kind)
  }
  if (kind === 'stair') return `${humanise(element.kind || 'stair')} stair`
  return humanise(kind)
}

export function humanise(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------
export function confidenceOf(element) {
  return element?.provenance?.confidence ?? 0
}

export function isConfirmed(element) {
  return Boolean(element?.provenance?.confirmed)
}

/**
 * Whether an element should be drawn as "needs a look".
 *
 * Mirrors `Provenance.is_reliable` on the server so the browser and the review
 * list agree about which elements are flagged. A confirmed element is never
 * flagged, however low its original confidence was — that is the whole point of
 * confirming it.
 */
export function isReliable(element) {
  const provenance = element?.provenance
  if (!provenance) return true
  if (provenance.confirmed) return true
  if (
    provenance.detection_source === 'vector' ||
    provenance.detection_source === 'raster' ||
    provenance.detection_source === 'manual'
  ) {
    return true
  }
  return (provenance.confidence ?? 0) >= 0.75
}

/** Element ids the editor should mark as uncertain, as a Set. */
export function flaggedElementIds(document) {
  const flagged = new Set()
  for (const uncertainty of document?.uncertainties ?? []) {
    if (uncertainty.element_id && !uncertainty.resolved) {
      flagged.add(uncertainty.element_id)
    }
  }
  for (const entry of allElements(document)) {
    if (!isReliable(entry.element)) flagged.add(entry.element.id)
  }
  return flagged
}

/** Elements whose value came from a default — the "assumed, not measured" list. */
export function assumedElementIds(document) {
  const assumed = new Set()
  for (const entry of allElements(document)) {
    if (entry.element?.provenance?.detection_source === 'default') {
      assumed.add(entry.element.id)
    }
  }
  return assumed
}

// ---------------------------------------------------------------------------
// Geometry, millimetres
// ---------------------------------------------------------------------------
export function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

export function polylineLength(points) {
  let total = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    total += distance(points[index], points[index + 1])
  }
  return total
}

export function cumulativeLengths(points) {
  const marks = [0]
  for (let index = 0; index < points.length - 1; index += 1) {
    marks.push(marks[marks.length - 1] + distance(points[index], points[index + 1]))
  }
  return marks
}

/** The point `target` mm along a polyline, clamped at both ends. */
export function pointAtDistanceAlong(points, target) {
  if (!points?.length) return [0, 0]
  if (points.length === 1 || target <= 0) return points[0]
  let remaining = target
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]
    const b = points[index + 1]
    const segment = distance(a, b)
    if (segment < 1e-9) continue
    if (remaining <= segment) {
      const ratio = remaining / segment
      return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]
    }
    remaining -= segment
  }
  return points[points.length - 1]
}

/** The polyline's bearing at `target` mm along it, in DEGREES. */
export function bearingAtDistanceAlong(points, target) {
  let remaining = Math.max(0, target)
  let fallback = 0
  let seen = false
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]
    const b = points[index + 1]
    const segment = distance(a, b)
    if (segment < 1e-9) continue
    const bearing = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
    if (!seen) {
      fallback = bearing
      seen = true
    }
    if (remaining <= segment) return bearing
    remaining -= segment
  }
  return fallback
}

/** Closest point on segment ab, and how far along ab it sits in MILLIMETRES. */
export function projectOntoSegment(point, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared < 1e-9) return { point: a, along: 0, gap: distance(point, a) }
  let ratio = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared
  ratio = Math.max(0, Math.min(1, ratio))
  const closest = [a[0] + dx * ratio, a[1] + dy * ratio]
  return {
    point: closest,
    along: ratio * Math.sqrt(lengthSquared),
    gap: distance(point, closest),
  }
}

export function distanceToPolyline(point, points) {
  let best = { gap: Infinity, along: 0, point: points?.[0] ?? [0, 0] }
  let travelled = 0
  for (let index = 0; index < (points?.length ?? 0) - 1; index += 1) {
    const a = points[index]
    const b = points[index + 1]
    const segment = distance(a, b)
    if (segment < 1e-9) continue
    const projection = projectOntoSegment(point, a, b)
    if (projection.gap < best.gap) {
      best = {
        gap: projection.gap,
        along: travelled + projection.along,
        point: projection.point,
      }
    }
    travelled += segment
  }
  return best
}

export function polygonArea(polygon) {
  if (!polygon || polygon.length < 3) return 0
  let total = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index]
    const [bx, by] = polygon[(index + 1) % polygon.length]
    total += ax * by - bx * ay
  }
  return Math.abs(total) / 2
}

export function polygonCentroid(polygon) {
  if (!polygon?.length) return [0, 0]
  let area = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index]
    const [bx, by] = polygon[(index + 1) % polygon.length]
    area += ax * by - bx * ay
  }
  area /= 2
  if (Math.abs(area) < 1e-9) {
    return [
      polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
      polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length,
    ]
  }
  let cx = 0
  let cy = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index]
    const [bx, by] = polygon[(index + 1) % polygon.length]
    const cross = ax * by - bx * ay
    cx += (ax + bx) * cross
    cy += (ay + by) * cross
  }
  return [cx / (6 * area), cy / (6 * area)]
}

/** `[minX, minY, maxX, maxY]` over every wall and slab, or null. */
export function documentBounds(document) {
  const xs = []
  const ys = []
  for (const level of levels(document)) {
    for (const wall of level.walls ?? []) {
      for (const [x, y] of wall.polyline ?? []) {
        xs.push(x)
        ys.push(y)
      }
    }
    for (const [x, y] of level.slab_polygon ?? []) {
      xs.push(x)
      ys.push(y)
    }
  }
  if (!xs.length) return null
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

/**
 * The solid runs of a wall left once its openings are cut.
 *
 * MIRRORS `blender/geometry/walls.py:solid_runs` EXACTLY, and the shared
 * fixtures under `backend/floorplan3d/tests/fixtures/` are what keep the two in
 * step. A wall with a door is drawn as several boxes — before the opening,
 * after it, under a window's sill, over its lintel — rather than as one box
 * with a hole subtracted. Boolean CSG in the browser is slow, fragile on
 * coplanar faces and needs a library; splitting is exact for rectangular
 * openings, which is every opening this schema can express.
 *
 * Returns `{ from, to, base, top }` in wall-local millimetres.
 */
export function wallSolidRuns(wall, openings, wallHeight) {
  const length = polylineLength(wall.polyline ?? [])
  if (length <= 0) return []

  const cuts = (openings ?? [])
    .map((opening) => {
      const width = opening.width ?? 0
      const position = opening.position ?? 0
      const sill = Math.max(0, opening.sill_height ?? 0)
      const height = opening.height ?? 0
      return {
        from: Math.max(0, Math.min(position - width / 2, length)),
        to: Math.max(0, Math.min(position + width / 2, length)),
        sill: Math.min(sill, wallHeight),
        head: Math.min(wallHeight, sill + height),
      }
    })
    .filter((cut) => cut.to - cut.from > 1e-6)
    .sort((a, b) => a.from - b.from)

  const runs = []
  let cursor = 0
  for (const cut of cuts) {
    if (cut.from - cursor > 1e-6) {
      runs.push({ from: cursor, to: cut.from, base: 0, top: wallHeight })
    }
    if (cut.sill > 1e-6) {
      runs.push({ from: cut.from, to: cut.to, base: 0, top: cut.sill })
    }
    if (wallHeight - cut.head > 1e-6) {
      runs.push({ from: cut.from, to: cut.to, base: cut.head, top: wallHeight })
    }
    cursor = Math.max(cursor, cut.to)
  }
  if (length - cursor > 1e-6) {
    runs.push({ from: cursor, to: length, base: 0, top: wallHeight })
  }
  return runs
}

// ---------------------------------------------------------------------------
// Editing — always returns a new document
// ---------------------------------------------------------------------------
function mapLevel(document, levelId, transform) {
  return {
    ...document,
    levels: levels(document).map((level) =>
      level.id === levelId ? transform(level) : level,
    ),
  }
}

/** Replace one element by id, wherever it lives. */
export function withElement(document, elementId, patch) {
  for (const level of levels(document)) {
    for (const bucket of ELEMENT_BUCKETS) {
      const list = level[bucket] ?? []
      const index = list.findIndex((element) => element.id === elementId)
      if (index < 0) continue
      const next = [...list]
      next[index] =
        typeof patch === 'function' ? patch(list[index]) : { ...list[index], ...patch }
      return mapLevel(document, level.id, (target) => ({ ...target, [bucket]: next }))
    }
  }
  return document
}

/** Add an element to a bucket on a level. */
export function withNewElement(document, levelId, bucket, element) {
  return mapLevel(document, levelId, (level) => ({
    ...level,
    [bucket]: [...(level[bucket] ?? []), element],
  }))
}

/**
 * Remove an element, and anything that referenced it.
 *
 * Deleting a wall deletes the openings it hosted — an opening with no wall
 * cannot be drawn, exported or edited, and the server's contract rejects the
 * document outright. Doing it here means the editor never offers to save
 * something that will be refused.
 */
export function withoutElement(document, elementId) {
  let next = document
  for (const level of levels(document)) {
    for (const bucket of ELEMENT_BUCKETS) {
      const list = level[bucket] ?? []
      if (!list.some((element) => element.id === elementId)) continue

      next = mapLevel(next, level.id, (target) => ({
        ...target,
        [bucket]: (target[bucket] ?? []).filter((element) => element.id !== elementId),
      }))

      if (bucket === 'walls') {
        next = mapLevel(next, level.id, (target) => {
          const cleaned = { ...target }
          for (const openingBucket of OPENING_BUCKETS) {
            cleaned[openingBucket] = (target[openingBucket] ?? []).filter(
              (opening) => opening.host_wall_id !== elementId,
            )
          }
          return cleaned
        })
      }
      if (bucket === 'rooms') {
        // Furniture keeps its position but loses a room that no longer exists;
        // the contract rejects a reference to a missing room.
        next = mapLevel(next, level.id, (target) => ({
          ...target,
          furniture: (target.furniture ?? []).map((item) =>
            item.room_id === elementId ? { ...item, room_id: '' } : item,
          ),
          fixtures: (target.fixtures ?? []).map((item) =>
            item.room_id === elementId ? { ...item, room_id: '' } : item,
          ),
        }))
      }
      return withRebuiltOpeningIndex(next)
    }
  }
  return document
}

export function withLevel(document, levelId, patch) {
  return mapLevel(document, levelId, (level) =>
    typeof patch === 'function' ? patch(level) : { ...level, ...patch },
  )
}

export function withUncertaintyResolved(document, uncertaintyId) {
  return {
    ...document,
    uncertainties: (document.uncertainties ?? []).map((uncertainty) =>
      uncertainty.id === uncertaintyId ? { ...uncertainty, resolved: true } : uncertainty,
    ),
  }
}

/**
 * Mark an element as human-confirmed.
 *
 * `confirmed` outranks every automatic rule on the server: a confirmed element
 * is never re-clamped, re-snapped or re-hosted by a later repair pass. Without
 * it the review path would undo itself.
 */
export function withElementConfirmed(document, elementId) {
  const next = withElement(document, elementId, (element) => ({
    ...element,
    provenance: {
      ...(element.provenance ?? {}),
      confirmed: true,
      detection_source: 'manual',
      confidence: 1,
    },
  }))
  return {
    ...next,
    uncertainties: (next.uncertainties ?? []).map((uncertainty) =>
      uncertainty.element_id === elementId
        ? { ...uncertainty, resolved: true }
        : uncertainty,
    ),
  }
}

/**
 * Rebuild `Wall.opening_ids`, which is derived from `Opening.host_wall_id`.
 *
 * The server does the same in `FloorPlan3D.sync()`. Keeping it correct in the
 * browser matters because the document is sent back verbatim, and a stale
 * reverse index is a stale reverse index in the database.
 */
export function withRebuiltOpeningIndex(document) {
  return {
    ...document,
    levels: levels(document).map((level) => {
      const hosted = new Map()
      for (const opening of openingsOf(level)) {
        const list = hosted.get(opening.host_wall_id) ?? []
        list.push(opening.id)
        hosted.set(opening.host_wall_id, list)
      }
      return {
        ...level,
        walls: (level.walls ?? []).map((wall) => ({
          ...wall,
          opening_ids: hosted.get(wall.id) ?? [],
        })),
        furniture: (level.furniture ?? []).map((item) => ({
          ...item,
          level_id: level.id,
        })),
        fixtures: (level.fixtures ?? []).map((item) => ({
          ...item,
          level_id: level.id,
        })),
      }
    }),
  }
}

/**
 * A new element id.
 *
 * A real UUID, because the server's contract expects one and because the
 * browser creates elements before the server has seen them — two clients must
 * not be able to mint the same id. `randomUUID` needs a secure context, which
 * is the same requirement `sha256Hex` already imposes for uploads; the fallback
 * exists so an insecure development origin degrades to something unique rather
 * than to a collision.
 */
export function newElementId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `${random()}${random()}-${random()}-4${random().slice(1)}-${random()}-${random()}${random()}${random()}`
}

/** Provenance for something the user created. Never flagged, never repaired. */
export function manualProvenance(note = '') {
  return {
    confidence: 1,
    detection_source: 'manual',
    confirmed: true,
    source_region: null,
    source_polygon: [],
    source_page: 0,
    note,
  }
}
