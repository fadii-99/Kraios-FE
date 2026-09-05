import * as THREE from 'three'

/**
 * Floor textures, drawn on a canvas at load time rather than downloaded.
 *
 * WHY PROCEDURAL. A wood floor is what turns this model from a diagram into a
 * room, and it is the single biggest visual difference between the viewer and
 * the reference renders. Image files would look better still, but they mean
 * sourcing assets, checking their licences, hosting them and waiting on a
 * network request before the model can be shown. A few hundred lines of canvas
 * drawing gets most of the way there, ships in the bundle, and has no licence.
 *
 * SCALE LIVES IN THE UV REPEAT, NOT IN THE CANVAS. Each texture below draws a
 * patch of a stated real-world size; callers set `repeat` from the metres they
 * are covering, so a plank is the same physical size on a 6 m bedroom and a
 * 30 m warehouse. See `floorTexture`.
 *
 * `colorSpace` is set on every one of these. A colour map left in the default
 * linear space renders visibly dark and desaturated once tone mapping is on,
 * which is exactly the "muddy" look this module exists to remove.
 */

// The patch each canvas represents, in metres. Planks are laid along the first
// axis, so this is 2 planks across by 6 rows down.
const WOOD_PATCH = { width: 2.4, depth: 1.08, planks: 6 }
const TILE_PATCH = { width: 1.2, depth: 1.2, tiles: 4 }

// One canvas per texture, built once and shared by every floor that uses it.
// A texture per room would be a few hundred megabytes of identical pixels.
const cache = new Map()

function canvas(size = 1024) {
  const element = document.createElement('canvas')
  element.width = size
  element.height = size
  return element
}

function finish(element, patch) {
  const texture = new THREE.CanvasTexture(element)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  // Floors are seen at a grazing angle across a whole room; without this the
  // far half of a large floor turns into shimmer.
  texture.anisotropy = 8
  texture.userData.patch = patch
  return texture
}

/** Warm oak boards with staggered end joints. */
function drawWood(context, size) {
  const rowHeight = size / WOOD_PATCH.planks

  context.fillStyle = '#b98d5f'
  context.fillRect(0, 0, size, size)

  for (let row = 0; row < WOOD_PATCH.planks; row += 1) {
    const y = row * rowHeight

    // Boards vary in tone. A deterministic wobble rather than Math.random, so
    // the texture is identical between reloads and between users — a floor
    // that reshuffles itself on refresh reads as a rendering bug.
    // Mid oak, deliberately well below the walls' tone. Pitched lighter than
    // this the floor and the plaster converged and the model read as one pale
    // material — the flat look this texture exists to break.
    const shade = Math.sin(row * 2.399) * 0.5 + 0.5
    const lightness = 40 + shade * 11
    context.fillStyle = `hsl(28, 38%, ${lightness}%)`
    context.fillRect(0, y, size, rowHeight)

    // Grain: a few long, low-contrast streaks along the board.
    context.strokeStyle = `hsla(26, 34%, ${lightness - 11}%, 0.6)`
    context.lineWidth = 1
    for (let streak = 0; streak < 7; streak += 1) {
      const offset = ((streak * 37 + row * 61) % 100) / 100
      context.beginPath()
      context.moveTo(0, y + rowHeight * (0.12 + offset * 0.76))
      context.bezierCurveTo(
        size * 0.33, y + rowHeight * (0.1 + offset * 0.8),
        size * 0.66, y + rowHeight * (0.14 + offset * 0.72),
        size, y + rowHeight * (0.12 + offset * 0.76),
      )
      context.stroke()
    }

    // End joints, staggered row to row so the floor does not read as a grid.
    const stagger = ((row % 3) / 3) * size
    context.strokeStyle = 'rgba(70, 46, 24, 0.55)'
    context.lineWidth = 2
    for (let joint = 0; joint < 2; joint += 1) {
      const x = (stagger + joint * (size / 2)) % size
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x, y + rowHeight)
      context.stroke()
    }

    // The board seam itself.
    context.strokeStyle = 'rgba(62, 40, 20, 0.5)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(size, y)
    context.stroke()
  }
}

/** Pale square tiles with grout, for wet rooms. */
function drawTile(context, size) {
  const step = size / TILE_PATCH.tiles

  context.fillStyle = '#c9cfd4'
  context.fillRect(0, 0, size, size)

  for (let row = 0; row < TILE_PATCH.tiles; row += 1) {
    for (let column = 0; column < TILE_PATCH.tiles; column += 1) {
      const shade = Math.sin(row * 1.7 + column * 2.9) * 0.5 + 0.5
      context.fillStyle = `hsl(205, 11%, ${76 + shade * 6}%)`
      context.fillRect(column * step + 2, row * step + 2, step - 4, step - 4)
    }
  }

  context.strokeStyle = 'rgba(140, 150, 158, 0.75)'
  context.lineWidth = 3
  for (let line = 0; line <= TILE_PATCH.tiles; line += 1) {
    const position = line * step
    context.beginPath()
    context.moveTo(position, 0)
    context.lineTo(position, size)
    context.moveTo(0, position)
    context.lineTo(size, position)
    context.stroke()
  }
}

function build(kind) {
  if (cache.has(kind)) return cache.get(kind)

  const element = canvas()
  const context = element.getContext('2d')
  const size = element.width

  if (kind === 'tile') drawTile(context, size)
  else drawWood(context, size)

  const texture = finish(element, kind === 'tile' ? TILE_PATCH : WOOD_PATCH)
  cache.set(kind, texture)
  return texture
}

/**
 * A floor texture sized for a real area.
 *
 * The shared canvas is cloned per floor because `repeat` belongs to the
 * texture, not the material, and two rooms of different sizes need different
 * repeats. Clones share the underlying image, so this costs a few objects and
 * no extra pixels.
 */
export function floorTexture(kind, widthMetres, depthMetres) {
  const base = build(kind)
  const texture = base.clone()
  texture.needsUpdate = true

  const patch = base.userData.patch
  texture.repeat.set(
    Math.max(widthMetres, 0.5) / patch.width,
    Math.max(depthMetres, 0.5) / patch.depth,
  )
  return texture
}

/** Which floor a room gets, from whatever the extractor called it. */
export function floorKindForRoom(name = '', type = '') {
  const text = `${name} ${type}`.toLowerCase()
  if (/toilet|bath|wc|shower|wash|powder|ensuite|en-suite/.test(text)) return 'tile'
  if (/kitchen|utility|laundry|pantry/.test(text)) return 'tile'
  return 'wood'
}

/** Free every cloned texture in a model. */
export function disposeTexture(texture) {
  if (texture && texture.isTexture) texture.dispose()
}
