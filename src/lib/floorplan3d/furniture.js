import * as THREE from 'three'

/**
 * Furniture and fixtures, from the shared procedural catalogue.
 *
 * ONE CATALOGUE, TWO ENGINES. The part specs come from the backend
 * (`floorplan3d/assets/catalog.json`, served by `GET .../assets/`) and are read
 * by BOTH geometry engines — this module and
 * `backend/floorplan3d/blender/geometry/furniture.py`. A desk that looks like a
 * desk here and like a filing cabinet in the downloaded `.blend` is a bug the
 * user reports as "the download is wrong", and the only durable fix is one
 * description of what a desk is.
 *
 * That is also why the catalogue is FETCHED rather than bundled: a copy in the
 * frontend bundle is a copy that drifts.
 *
 * Part sizes and offsets are FRACTIONS of the item's own (width, depth,
 * height). Offsets are from the footprint centre in x and y and from the base
 * in z, so one spec is correct at any size.
 *
 * FAILS OPEN. No catalogue, or an asset it does not carry, gives one labelled
 * box at the item's real footprint — never nothing. An unlabelled box in the
 * right place is information; a missing item is not.
 */

/** `{ byId, byClass }` from a catalogue payload. Cheap; called once per build. */
export function indexCatalog(payload) {
  const byId = new Map()
  const byClass = new Map()
  for (const asset of payload?.assets ?? []) {
    if (asset.asset_id) byId.set(asset.asset_id, asset)
    if (asset.semantic_class && !byClass.has(asset.semantic_class)) {
      byClass.set(asset.semantic_class, asset)
    }
  }
  return { byId, byClass }
}

function entryFor(item, catalog) {
  if (!catalog) return null
  return (
    catalog.byId?.get(item.asset_id) ??
    catalog.byClass?.get(item.semantic_class) ??
    null
  )
}

function rotate(x, y, degrees) {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [x * cos - y * sin, x * sin + y * cos]
}

/**
 * One furniture item as a group of parts.
 *
 * `box` and `cylinder` are injected rather than imported, so the single
 * plan-millimetres-to-Three.js conversion stays in `buildScene.js`. Two
 * definitions of that mapping is how a model ends up mirrored.
 */
export function buildFurnitureGroup(item, level, { catalog, materials, box, cylinder }) {
  const group = new THREE.Group()

  const size = item.size ?? [600, 600, 750]
  const width = Number(size[0]) || 600
  const depth = Number(size[1]) || 600
  const height = Number(size[2]) || 750
  if (width <= 0 || depth <= 0 || height <= 0) return group

  const position = item.position ?? [0, 0]
  const rotation = item.rotation ?? 0
  const base = (level?.elevation ?? 0) + (item.base_elevation ?? 0)
  const override = (item.color || '').trim()

  const entry = entryFor(item, catalog)
  const parts = entry?.parts ?? []

  if (!parts.length) {
    const material = override
      ? materials.color(override)
      : materials.resolve(item.material_id || 'mat-fabric')
    const mesh = box([width, depth, height], position, base, rotation, material)
    if (mesh) group.add(mesh)
    return group
  }

  for (const part of parts) {
    const partSize = part.size ?? [1, 1, 1]
    const partOffset = part.offset ?? [0, 0, 0.5]

    const sizeX = Number(partSize[0]) * width
    const sizeY = Number(partSize[1]) * depth
    const sizeZ = Number(partSize[2]) * height
    if (!(sizeX > 0) || !(sizeY > 0) || !(sizeZ > 0)) continue

    const localX = Number(partOffset[0]) * width
    const localY = Number(partOffset[1]) * depth
    const localZ = Number(partOffset[2]) * height

    // The spec's z offset is the part's CENTRE height; the builders take a base.
    const partBase = base + localZ - sizeZ / 2
    const [rotatedX, rotatedY] = rotate(localX, localY, rotation)
    const centre = [position[0] + rotatedX, position[1] + rotatedY]

    const material = materials.color(override || part.color || entry.color || '#9AA3AB')

    const mesh =
      part.kind === 'cylinder'
        ? cylinder(sizeX, sizeZ, centre, partBase, material)
        : box([sizeX, sizeY, sizeZ], centre, partBase, rotation, material)
    if (mesh) group.add(mesh)
  }

  return group
}

/**
 * The catalogue grouped for the "change asset" picker.
 *
 * Only assets whose licence permits commercial use reach the client at all —
 * the server filters them — so anything in this list is safe to place. See
 * `backend/floorplan3d/assets/MANIFEST.md`.
 */
export function catalogByCategory(payload) {
  const grouped = new Map()
  for (const asset of payload?.assets ?? []) {
    const category = asset.category || 'other'
    const list = grouped.get(category) ?? []
    list.push(asset)
    grouped.set(category, list)
  }
  return [...grouped.entries()]
    .map(([category, assets]) => ({
      category,
      assets: assets.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}
