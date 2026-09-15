import * as THREE from 'three'

/**
 * Dark architectural outlines, in the browser.
 *
 * WHY THIS FILE EXISTS AT ALL. The reference style is built on clean dark edges,
 * and the Blender thumbnails get them from Workbench's object-outline pass. A
 * GLB carries no line style, and neither does a scene built from JSON — so
 * whatever the thumbnails do, the viewer has to draw its own or it looks nothing
 * like its own preview.
 *
 * `EdgesGeometry`, NOT `OutlinePass`. Two reasons, and the second is the
 * decisive one:
 *
 *   1. `OutlinePass` needs `EffectComposer`, a render target and a second
 *      render pass per frame. That is a real cost on integrated graphics, which
 *      this feature has to stay usable on.
 *   2. `OutlinePass` outlines a SILHOUETTE. The style wants the edges INSIDE the
 *      model too — the line where a wall meets a floor, the corner of a
 *      worktop. `EdgesGeometry` gives exactly those, because it emits an edge
 *      wherever two faces meet at more than a threshold angle.
 *
 * `OutlinePass` is still the right tool for a SELECTION glow, which is why
 * selection is done with emissive material instead: no second pass, no
 * composer, and it reads correctly on a wall that is partly behind another.
 */

// Edges are emitted where two faces meet at more than this angle. 25 degrees
// keeps every box corner and every wall/floor junction, and drops the seams
// inside a cylinder's barrel — which at 16 segments would otherwise draw
// sixteen vertical lines up every column.
const THRESHOLD_DEGREES = 25

// The edge colour. Dark, and deliberately not black: pure black on a light grey
// wall reads as a printed line rather than as a shadowed edge.
const EDGE_COLOR = 0x2a3038
const EDGE_OPACITY = 0.55

// Above this many meshes in one element, outlines are skipped for it. A single
// element with hundreds of parts is a pathological document, and the outline
// pass would double its cost for something nobody can see at that density.
const MAX_MESHES_PER_ELEMENT = 60

/**
 * Add outline line segments to every mesh in a group.
 *
 * The lines are added as children of the MESH, not of the group, so they
 * inherit its transform — an outline positioned independently drifts the moment
 * anything moves the mesh, which the furniture transform tool does constantly.
 *
 * `renderOrder` is raised so the lines draw after the surfaces they trace;
 * without it a coplanar edge flickers as the depth test picks a winner per
 * pixel per frame.
 */
export function attachOutline(group) {
  const meshes = []
  group.traverse((child) => {
    if (child.isMesh) meshes.push(child)
  })
  if (meshes.length > MAX_MESHES_PER_ELEMENT) return

  for (const mesh of meshes) {
    // Transparent surfaces do not get outlines: a glazed pane traced in dark
    // grey reads as a solid panel, which is the opposite of what glass is for.
    if (mesh.material?.transparent) continue

    const edges = new THREE.EdgesGeometry(mesh.geometry, THRESHOLD_DEGREES)
    const lines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: EDGE_COLOR,
        transparent: true,
        opacity: EDGE_OPACITY,
        // Depth test ON: an outline that ignores depth draws the far side of
        // every box through the near side, which turns the model into a
        // wireframe.
        depthTest: true,
        depthWrite: false,
      }),
    )
    lines.renderOrder = 1
    // Not pickable, and not part of the model's bounding box.
    lines.raycast = () => {}
    lines.userData.isOutline = true
    mesh.add(lines)
  }
}

/** Show or hide every outline in a subtree, for the quality presets. */
export function setOutlinesVisible(root, visible) {
  root?.traverse((child) => {
    if (child.userData?.isOutline) child.visible = visible
  })
}
