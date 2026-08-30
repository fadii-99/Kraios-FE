/**
 * Step 2 — Design Assistant configuration and copy.
 *
 * Everything Step 2 *declares*: the settings the generation service supports,
 * and the fixed copy the two Step 2 views render. No state, no derivations —
 * `designAssistantState.js` owns the shape and the transitions,
 * `designAssistantSelectors.js` owns the questions asked of them.
 */

/* ---------------------------------------------------------------------------
   Working settings — only what the service actually supports.
   --------------------------------------------------------------------------- */

/**
 * Render styles offered by the Design Assistant.
 *
 * This list is the single source of truth for the header control AND for what
 * is put on the request, so a style is added or removed here and nowhere else.
 *
 * `photo-realistic` was added on an explicit product request. It is worth
 * naming the tension rather than hiding it: Kraios's established positioning is
 * a technical, SketchUp-style model, and no generation service is connected
 * yet, so NEITHER style is currently produced by a backend — both select the
 * same frontend mock and are recorded on the result as metadata. Before this
 * control can claim to do anything, the real service has to support both
 * values; if it only ever supports one, this list is where that is corrected.
 */
export const RENDER_STYLES = [
  {
    id: 'sketchup',
    label: 'SketchUp',
    description: 'Technical SketchUp-style 3D model',
  },
  {
    id: 'photo-realistic',
    label: 'Photo Realistic',
    description: 'Lit, material-accurate visual render',
  },
]

export const DEFAULT_RENDER_STYLE_ID = RENDER_STYLES[0].id

/**
 * View angles. Selecting one is a REAL generation request — the angle goes into
 * the prompt pipeline and the service returns a new render. Nothing here
 * rotates an existing image with CSS.
 */
export const VIEW_ANGLES = [
  {
    id: 'isometric-45',
    label: 'Isometric 45°',
    description: 'Classic diagonal dollhouse angle',
    prompt: 'Generate an isometric 45° view of the 3D floor model.',
  },
]

export const DEFAULT_VIEW_ANGLE_ID = null

export function renderStyleById(id) {
  return RENDER_STYLES.find((style) => style.id === id) ?? RENDER_STYLES[0]
}

export function viewAngleById(id) {
  return VIEW_ANGLES.find((angle) => angle.id === id) || null
}

/* ---------------------------------------------------------------------------
   Stage copy — declared once, the way every other dashboard constant is.
   --------------------------------------------------------------------------- */

export const RENDERING_COPY = {
  eyebrow: '3D Model',
  headingLines: ['Create Your', '3D Floor Model'],
  paragraph:
    'Open Design Assistant to generate, refine and approve the 3D model created from your floor plan.',

  approvedEyebrow: 'Design Approved',
  approvedHeadingLines: ['Your 3D Model', 'Is Ready'],
  approvedParagraph:
    'This design was approved in Design Assistant and is ready for the BoQ stage.',

  assistantTitle: 'Kraios Design Assistant',
  assistantSubtitle: 'Generate, refine and approve your 3D floor model.',
  assistantBlurb:
    'Generate, refine and approve your 3D floor model in a dedicated conversational workspace.',
  assistantCta: 'Open Design Assistant',

  /**
   * The capability hint, as ONE restrained line rather than three feature
   * boxes. It says what is behind the button so the CTA is not a leap in the
   * dark, and costs the composition a single `label-ui` row.
   */
  capabilityHint: 'Conversational editing · View control · Design approval',

  referenceTitle: 'Reference Plan',
  referenceReady: '2D source ready',
  referenceMissing: 'A 2D floor plan is required before starting 3D Rendering.',
  referenceMissingCta: 'Go to Upload',

  statusPendingNote:
    'Approve a final design in Design Assistant before continuing to BoQ.',
  noteGenerating: 'Generating a 3D model in Design Assistant…',
  noteOneUnapproved:
    '1 render generated in this session. Approve one to continue to BoQ.',
  noteManyUnapproved:
    '{count} renders generated in this session. Approve one to continue to BoQ.',
  approvedContinueNote: 'Continue to BoQ from the navigation below.',

  boqGateMessage: 'Approve a 3D design before continuing to BoQ.',
}

export const ASSISTANT_COPY = {
  /**
   * The opening state. It is the empty state AND the greeting — one turn, not
   * two: a permanent greeting message plus a separate empty state said the same
   * thing twice and left the workspace looking like it had already been used.
   */
  emptyHeading: 'Generate Your 3D Floor Model',
  emptyBody:
    'Enter your prompt in the box below to generate your 3D floor plan. Kraios AI will create and render your architectural model instantly.',
  suggestedLabel: 'Suggested Prompts',

  /**
   * The composer's context strip. Two states, because "edit this one" and
   * "carry on from the last one" are genuinely different intents and a user
   * typing "make the walls darker" has to know which render it lands on.
   */
  editingNoticeSelected: 'Editing selected result',
  editingNoticeLatest: 'Refining latest result',

  retryLabel: 'Retry',

  /** Pending line for a view-angle request. `{angle}` is the angle's label. */
  generatingAngle: 'Generating {angle} view…',

  composerPlaceholder: 'Describe changes to the 3D model…',
  composerHelp: 'Enter to send · Shift + Enter for a new line',
  editingNotice: 'Editing current 3D result',
  generating: 'Getting response, please wait…',
}

/** Optional openers. They go through the same pipeline as anything typed. */
export const QUICK_PROMPTS = [
  'Generate a clean 3D floor model',
  'Create an isometric 45° view',
  'Create a furnished modern layout',
  'Use a minimal architectural style',
]
