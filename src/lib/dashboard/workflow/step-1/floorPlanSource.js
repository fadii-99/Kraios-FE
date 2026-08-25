/**
 * Step 1 — the 2D floor-plan source model.
 *
 * A project has exactly ONE active floor-plan source at a time. The whole
 * mutual-exclusivity rule of this stage lives in that single shape rather than
 * in a pair of booleans spread across the UI:
 *
 *   null                       → no source yet, both modes open
 *   { type: 'upload',    … }   → an uploaded file is the source
 *   { type: 'generated', … }   → an AI-generated plan is the source
 *
 * Which mode the toggle may switch into is *derived* from that value
 * (`lockedModeForSource`), so the two can never disagree. Nothing here discards
 * a source on its own — the user removes it deliberately, and the store
 * releases the object URL at that point.
 */

/** The two ways a user can provide the plan. Also the toggle's option ids. */
export const FLOOR_PLAN_MODES = {
  upload: 'upload',
  generate: 'generate',
}

/** The two shapes a stored source can take. */
export const FLOOR_PLAN_SOURCE_TYPES = {
  upload: 'upload',
  generated: 'generated',
}

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg']
const PDF_MIME_TYPE = 'application/pdf'
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg']
const PDF_EXTENSION = 'pdf'

/**
 * `accept` carries extensions AND mime types on purpose: some browsers report
 * a JPEG with an empty `file.type`, so the extension is the fallback both here
 * and in `fileKind`.
 */
export const FLOOR_PLAN_ACCEPT =
  '.png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf'

export const FLOOR_PLAN_FORMATS_LABEL = 'PNG · JPG · JPEG · PDF'

/** The label that introduces the format list in the stage brief. */
export const FLOOR_PLAN_FORMATS_TERM = 'Supported Formats'

export const UNSUPPORTED_FILE_ERROR =
  'Unsupported file type. Upload a PNG, JPG, JPEG or PDF.'

export const MULTIPLE_FILES_NOTICE =
  'Only one floor plan is supported — the first file was used.'

export const EMPTY_PROMPT_ERROR =
  'Describe the floor plan you want before generating.'

/** Lowercase extension without the dot, or '' when the name carries none. */
export function fileExtension(name = '') {
  const parts = String(name).split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

/** 'image' | 'pdf' | null — null means the file is not a supported source. */
export function fileKind(file) {
  if (!file) return null

  const mime = (file.type || '').toLowerCase()
  const extension = fileExtension(file.name)

  if (IMAGE_MIME_TYPES.includes(mime) || IMAGE_EXTENSIONS.includes(extension)) {
    return 'image'
  }

  if (mime === PDF_MIME_TYPE || extension === PDF_EXTENSION) {
    return 'pdf'
  }

  return null
}

export function isSupportedFloorPlanFile(file) {
  return fileKind(file) !== null
}

/**
 * Wraps a picked file as an upload source.
 *
 * `ownsPreviewUrl` marks the blob URL as ours to revoke — the store releases it
 * when the source is replaced, removed, or the dashboard unmounts. A generated
 * source coming back from a future API will carry a remote URL and leave the
 * flag false, so the same release path stays correct for both.
 */
export function createUploadSource(file) {
  const kind = fileKind(file)
  if (!kind) return null

  return {
    type: FLOOR_PLAN_SOURCE_TYPES.upload,
    kind,
    name: file.name,
    size: file.size,
    mime: file.type || (kind === 'pdf' ? PDF_MIME_TYPE : ''),
    extension: fileExtension(file.name) || (kind === 'pdf' ? PDF_EXTENSION : ''),
    previewUrl: kind === 'image' ? URL.createObjectURL(file) : null,
    ownsPreviewUrl: kind === 'image',
    addedAt: Date.now(),
  }
}

/** The shape a completed generation must produce. */
export function createGeneratedSource({ prompt, previewUrl, ownsPreviewUrl = false }) {
  return {
    type: FLOOR_PLAN_SOURCE_TYPES.generated,
    kind: 'image',
    name: 'Generated floor plan',
    prompt,
    previewUrl,
    ownsPreviewUrl,
    addedAt: Date.now(),
  }
}

/** Frees the blob URL a source owns. Safe on null, and on a remote URL. */
export function releaseFloorPlanSource(source) {
  if (source?.ownsPreviewUrl && source.previewUrl) {
    URL.revokeObjectURL(source.previewUrl)
  }
}

/** Which mode a stored source belongs to. */
export function modeForSource(source) {
  return source?.type === FLOOR_PLAN_SOURCE_TYPES.generated
    ? FLOOR_PLAN_MODES.generate
    : FLOOR_PLAN_MODES.upload
}

/**
 * The mode the user may NOT switch into while this source exists — the single
 * expression of "one active source at a time".
 */
export function lockedModeForSource(source) {
  if (!source) return null

  return source.type === FLOOR_PLAN_SOURCE_TYPES.upload
    ? FLOOR_PLAN_MODES.generate
    : FLOOR_PLAN_MODES.upload
}

/**
 * The validation boundary Step 1 hands to the rest of the workflow.
 */
export function hasFloorPlanSource(source) {
  return Boolean(source)
}

/**
 * Why 3D Rendering is not reachable yet, or `null` when it is.
 *
 * The same shape as Step 2's `renderingGateMessage`, and read the same way:
 * `ProjectWorkspace` asks the active stage's domain for a reason and hands it
 * to the shared bottom navigation, which explains instead of navigating. Step 2
 * has to have a plan to work from — its own gateway says so and offers "Go to
 * Upload" — so leaving Step 1 without one is a dead end, not a shortcut.
 *
 * The stepper and a typed URL still reach `/rendering` directly; that view
 * already handles a missing source, and this gate does not remove it.
 */
export function floorPlanGateMessage(source) {
  return hasFloorPlanSource(source) ? null : NEXT_STEP_PENDING
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ---------------------------------------------------------------------------
   Stage copy — declared once, the way every other dashboard constant is.
   --------------------------------------------------------------------------- */

/**
 * `headingLines` are AUTHORED line breaks, the way the landing page's section
 * headings are: the display tier is set to the rail, so where the two lines
 * break is a typographic decision, not whatever the browser happens to do at a
 * given width.
 *
 * Upload carries no paragraph. The three points ARE the explanation — a
 * paragraph saying the same thing above them was the tallest single element in
 * the rail and the reason the stage overflowed its zone.
 */
export const UPLOAD_BRIEF = {
  eyebrow: 'Floor Plan Input',
  headingLines: ['Upload Your 2D', 'Architectural', 'Plan'],
  points: [
    {
      term: 'Clear Plan',
      icon: 'plan',
    },
    {
      term: 'Top-Down',
      icon: 'topDown',
    },
    {
      term: 'Single File',
      icon: 'source',
    },
  ],
}

export const GENERATE_BRIEF = {
  eyebrow: 'AI Floor Plan',
  headingLines: ['Generate 2D', 'Architectural', 'Plan'],
  points: [
    {
      term: 'Rooms',
      detail: 'Bed, Bath, Kitchen',
      icon: 'rooms',
    },
    {
      term: 'Dimensions',
      detail: 'e.g. 12m × 9m',
      icon: 'dimensions',
    },
    {
      term: 'Layout',
      detail: 'Open plan, Balcony',
      icon: 'layout',
    },
  ],
}

export const PROMPT_PLACEHOLDER =
  'Example: Create a two-bedroom apartment with an open living and kitchen area, one shared bathroom, master ensuite, balcony access from the living room, and approximately 12 m × 9 m overall dimensions…'

export const MODE_LOCK_MESSAGES = {
  [FLOOR_PLAN_MODES.generate]:
    'A 2D floor plan is currently uploaded. Please remove or clear the existing plan first to generate a new AI layout.',
  [FLOOR_PLAN_MODES.upload]:
    'An AI-generated floor plan is currently active. Please clear it first to upload a new 2D architectural file.',
}

export const NEXT_STEP_PENDING =
  'Add or generate a 2D floor plan before continuing to 3D Rendering.'

export const NEXT_STEP_READY =
  '2D floor plan ready — continue to 3D Rendering when you are.'
