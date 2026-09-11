import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

import { buildScene, disposeScene } from '@/lib/experiments/floorplan3d/buildScene'

/**
 * Browser-side exports.
 *
 * TWO EXPORT PATHS EXIST, AND BOTH ARE DELIBERATE
 * -----------------------------------------------
 * The backend writes every format (`floorplan3d/exporters/`), stores the file
 * as an artifact, and is what a stable, shareable, re-downloadable export is.
 * This module writes JSON and GLB in the BROWSER, from the scene already on
 * screen, and is what "export what I am looking at, now" is.
 *
 * They are not redundant:
 *
 *   - The browser export costs no round trip and no storage, which matters
 *     when a user is iterating and exports six times in a minute.
 *   - It exports the model as EDITED, including changes not yet saved, which
 *     the server by definition cannot.
 *   - It is what still works when the export worker is busy.
 *
 * Both write the same geometry from the same rules (`buildScene` here,
 * `mesh.py` there), and both keep element identity in glTF `extras`, so a file
 * from either can be pointed back at the row of the document that produced it.
 *
 * DOWNLOADS ARE ANNOUNCED ONLY WHEN A FILE WAS PRODUCED
 * -----------------------------------------------------
 * Every helper returns a boolean, matching the rule the rest of the product
 * follows (CLAUDE.md §27). Never save an unverified response as a file, and
 * never announce a download that did not happen.
 */

/** A filename that is safe to save and recognisable a week later. */
export function safeFileName(value, fallback = 'model') {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\.+/g, '.')
  return (cleaned || fallback).slice(0, 80)
}

function saveBlob(blob, filename) {
  if (!blob || blob.size === 0) return false
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoked on the next frame rather than immediately: revoking synchronously
  // races the browser's own read of the URL in some engines, and the download
  // arrives empty.
  requestAnimationFrame(() => URL.revokeObjectURL(url))
  return true
}

/**
 * The canonical model as a JSON file.
 *
 * The lossless export: it is the document itself, not a rendering of it, so it
 * re-imports without losing provenance, assumptions, warnings or materials.
 */
export function downloadModelJson(model, name = 'model') {
  if (!model) return false
  const blob = new Blob([JSON.stringify(model, null, 2)], {
    type: 'application/json',
  })
  return saveBlob(blob, `${safeFileName(name)}.json`)
}

/**
 * The scene as binary glTF.
 *
 * Built from a FRESH scene rather than from the live one, for three reasons:
 * the live scene carries helpers (a grid, axes, a ground plane, room-name
 * sprites) that are viewing aids and not part of the building; it carries
 * whatever is currently hidden or isolated, and an export should be the model,
 * not the view; and its materials carry the selection highlight.
 *
 * `onlyVisible: false` because the temporary scene has nothing hidden in it,
 * and leaving it true would silently drop anything Three.js considered
 * invisible for its own reasons.
 */
export async function exportGlb(model, {
  name = 'model',
  levelIds = null,
  documentHeader = null,
} = {}) {
  if (!model) return false

  const filtered = levelIds ? filterToLevels(model, levelIds) : model
  const { root } = buildScene(filtered, { flagged: new Set(), wallOpacity: 1 })

  // glTF is Y-up and so is the scene this builds, so no rotation is applied
  // here — `buildScene`'s `toWorld` already did it, once, for everything.
  const scene = new THREE.Scene()
  scene.name = documentHeader?.building?.name || name
  scene.userData = {
    schema_version: model.schema_version,
    units: model.units,
    coordinate_system: model.coordinate_system,
    building: model.building,
    scale: model.scale,
    generator: 'kraios.floorplan3d.browser',
  }
  scene.add(root)

  // Element identity, on the nodes, the way the backend writes it. A model
  // round-tripped through Blender or SketchUp can still be pointed back at the
  // row of the document it came from.
  root.traverse((child) => {
    const element = child.userData?.element
    if (!element) return
    child.name = `${element.kind}:${element.id}`
    child.userData = {
      element_id: element.id,
      element_kind: element.kind,
      element_name: element.name,
      level_id: element.levelId,
      source: 'kraios.floorplan3d',
    }
  })

  try {
    const exporter = new GLTFExporter()
    const buffer = await exporter.parseAsync(scene, {
      binary: true,
      onlyVisible: false,
      includeCustomExtensions: true,
    })
    const blob = new Blob([buffer], { type: 'model/gltf-binary' })
    return saveBlob(blob, `${safeFileName(name)}.glb`)
  } finally {
    // The temporary scene is not the one on screen, so every geometry and
    // material in it is ours to free — and a few hundred of them per export
    // is a leak a user iterating would feel.
    disposeScene(root)
  }
}

/** A PNG of the current view, for a report or a message. */
export function downloadSnapshot(dataUrl, name = 'view') {
  if (!dataUrl) return false
  const [, base64] = dataUrl.split(',')
  if (!base64) return false
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return saveBlob(new Blob([bytes], { type: 'image/png' }), `${safeFileName(name)}.png`)
}

/**
 * A copy of the model holding only the named levels.
 *
 * Everything hosted by something on another level goes with it: an opening
 * without its wall is unplaceable, and shipping one would produce a file that
 * fails to load rather than a file with one storey in it.
 */
export function filterToLevels(model, levelIds) {
  const wanted = levelIds instanceof Set ? levelIds : new Set(levelIds)
  const walls = (model.walls ?? []).filter((wall) => wanted.has(wall.level_id))
  const wallIds = new Set(walls.map((wall) => wall.id))
  const keep = (collection) =>
    (model[collection] ?? []).filter((entry) => wanted.has(entry.level_id))
  const keepOpenings = (collection) =>
    (model[collection] ?? []).filter((opening) => wallIds.has(opening.wall_id))

  return {
    ...model,
    levels: (model.levels ?? []).filter((level) => wanted.has(level.id)),
    walls,
    rooms: keep('rooms'),
    slabs: keep('slabs'),
    doors: keepOpenings('doors'),
    windows: keepOpenings('windows'),
    passages: keepOpenings('passages'),
    columns: keep('columns'),
    beams: keep('beams'),
    stairs: keep('stairs'),
    fixtures: keep('fixtures'),
    furniture: keep('furniture'),
    dimensions: keep('dimensions'),
    labels: keep('labels'),
  }
}

/**
 * Download an artifact the SERVER produced.
 *
 * Authenticated: the artifact route sits behind the session cookie, so a bare
 * `<a href>` to it gets a 401 rendered as a broken download. Fetched with
 * credentials, verified, and only then saved — an HTTP error body is not a
 * model.
 */
export async function downloadArtifact(url, filename) {
  if (!url) return false
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) return false
  const blob = await response.blob()
  return saveBlob(blob, filename || 'model')
}
