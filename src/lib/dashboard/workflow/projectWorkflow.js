/**
 * Kraios project workflow stages — the single source of truth.
 *
 * The four stages are SIBLINGS under one project, not a chain. Upload,
 * 3D Rendering, BoQ and Output each own a route segment and are
 * independently addressable at /dashboard/projects/:projectId/<segment>.
 *
 * Deliberately no status model yet (no completed / locked / skipped). When
 * status lands it belongs on the *project*, keyed by stage `id` — never as a
 * gate that makes one route depend on another, because BoQ is optional: a user
 * may skip it, reach Output, and come back to BoQ later in the same project.
 */
/**
 * `description` is the full sentence. `summary` is the compressed form the
 * Welcome cards use — that screen is height-budgeted to one dashboard viewport,
 * so its copy is capped at a single short line rather than wrapping to three.
 * Both live here for the same reason: stage copy is declared once.
 */
export const WORKFLOW_STAGES = [
  {
    id: 'upload',
    number: '01',
    label: 'Upload',
    segment: 'upload',
    description: 'Upload your existing 2D floor plan.',
    summary: 'Add your 2D floor plan.',
  },
  {
    id: 'rendering',
    number: '02',
    label: '3D Rendering',
    segment: 'rendering',
    description: 'Generate and refine your 3D floor plan.',
    summary: 'Generate your 3D model.',
  },
  {
    id: 'boq',
    number: '03',
    label: 'BoQ',
    segment: 'boq',
    description: 'Generate a Bill of Quantities when you need it.',
    summary: 'Price materials and quantities.',
    optional: true,
  },
  {
    id: 'output',
    number: '04',
    label: 'Output',
    segment: 'output',
    description: 'Access the outputs available for your project.',
    summary: 'Export your finished files.',
  },
]

/** The stage a project workspace opens on when no segment is given. */
export const DEFAULT_WORKFLOW_SEGMENT = WORKFLOW_STAGES[0].segment

/** Path builder — keeps route strings out of components. */
export function projectStagePath(projectId, segment) {
  return `/dashboard/projects/${projectId}/${segment}`
}

/**
 * Step 1's 2D Floor Plan Assistant workspace.
 */
export const FLOOR_PLAN_ASSISTANT_SEGMENT = 'assistant'

export function floorPlanAssistantPath(projectId, fromStage = 'generate') {
  return `${projectStagePath(projectId, fromStage)}/${FLOOR_PLAN_ASSISTANT_SEGMENT}`
}

/**
 * Step 2's Design Assistant workspace.
 *
 * A child SEGMENT of the rendering stage, not a fifth stage: the workflow is
 * still four siblings, and this is where Step 2's work is done. Declared here
 * with the other path builders so no component types the route string.
 *
 * It is a SIBLING of `ProjectWorkspace` in the router rather than a child, so
 * it arrives without the stepper and the Previous / Next bar — but inside the
 * same dashboard shell, with the sidebar and the page surface intact. There is
 * deliberately no "is this the focused route" predicate any more: no layout
 * branches on it.
 */
export const DESIGN_ASSISTANT_SEGMENT = 'assistant'

export function designAssistantPath(projectId) {
  return `${projectStagePath(projectId, 'rendering')}/${DESIGN_ASSISTANT_SEGMENT}`
}

/**
 * Step 3's BoQ Assistant workspace path builder.
 */
export const BOQ_ASSISTANT_SEGMENT = 'assistant'

export function boqAssistantPath(projectId) {
  return `${projectStagePath(projectId, 'boq')}/${BOQ_ASSISTANT_SEGMENT}`
}


/**
 * Which stage the URL is on — the one place that answer is computed.
 *
 * The workflow nav and the Previous/Next nav both need it and had each been
 * re-deriving it with `pathname.includes('/' + segment)`, which matches a
 * segment anywhere in the path. This reads the LAST segment only, and falls
 * back to the first stage for the bare workspace URL (which redirects to
 * Upload anyway).
 */
export function workflowIndexForPath(pathname) {
  const last = pathname.split('/').filter(Boolean).pop()
  if (last === 'generate') return 0
  const index = WORKFLOW_STAGES.findIndex((stage) => stage.segment === last)

  return index >= 0 ? index : 0
}
