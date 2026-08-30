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
 * (`lockedModeForSource`), so the two can never disagree.
 *
 * The source itself is DERIVED too. It used to be stored in the provider and
 * minted from a picked file; it is now read from the project's approved Step 1
 * version (`sourceFromApprovedVersion`), because `selected_floor_plan` on the
 * backend is the record of which plan the project works from and a second local
 * copy could only disagree with it. Nothing here mints an object URL, so
 * nothing here has one to free.
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

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const PDF_MIME_TYPE = 'application/pdf'
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const PDF_EXTENSION = 'pdf'

/**
 * `accept` carries extensions AND mime types on purpose: some browsers report
 * a JPEG with an empty `file.type`, so the extension is the fallback both here
 * and in `fileKind`.
 *
 * The list mirrors what `POST /step-1/upload/` accepts. Adding a format the
 * backend rejects only moves the refusal from the dropzone to a 400.
 */
export const FLOOR_PLAN_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf'

export const FLOOR_PLAN_FORMATS_LABEL = 'PNG · JPG · JPEG · WEBP · PDF'

/**
 * The backend's default maximum upload size. Checked here so an oversized file
 * is refused before it is uploaded rather than after a 25 MB round trip; the
 * server still enforces it, and may be configured differently.
 */
export const FLOOR_PLAN_MAX_BYTES = 25 * 1024 * 1024

export const FILE_TOO_LARGE_ERROR =
  'That file is larger than 25 MB. Upload a smaller floor plan.'

/** Whether the file is within the upload size limit. */
export function isWithinUploadLimit(file) {
  return !file || file.size <= FLOOR_PLAN_MAX_BYTES
}

/** The label that introduces the format list in the stage brief. */
export const FLOOR_PLAN_FORMATS_TERM = 'Supported Formats'

export const UNSUPPORTED_FILE_ERROR =
  'Unsupported file type. Upload a PNG, JPG, JPEG, WEBP or PDF.'

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
 * The active source, derived from the APPROVED Step 1 version.
 *
 * This is what replaced the session-memory source: the backend's
 * `selected_floor_plan` is the record of which plan the project is working
 * from, so Step 1's source is read from it rather than stored a second time.
 * The shape is unchanged, so `modeForSource`, `lockedModeForSource` and every
 * preview keep working exactly as they did.
 *
 * `UPLOADED` becomes an upload source; `GENERATED` and `EDITED` become a
 * generated one, because both came out of the assistant.
 */
export function sourceFromApprovedVersion(result) {
  if (!result?.imageUrl) return null

  const uploaded = result.source === 'UPLOADED'

  return {
    type: uploaded ? FLOOR_PLAN_SOURCE_TYPES.upload : FLOOR_PLAN_SOURCE_TYPES.generated,
    kind: 'image',
    name: result.assetName || (uploaded ? 'Uploaded floor plan' : 'Generated floor plan'),
    prompt: result.prompt || '',
    versionId: result.id,
    assetId: result.assetId ?? null,
    previewUrl: result.imageUrl,
    // A backend url, never a blob this app minted, so there is nothing to free.
    ownsPreviewUrl: false,
    addedAt: result.at,
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

/*
 * `NEXT_STEP_PENDING` / `NEXT_STEP_READY` moved to `STAGE_GATE_MESSAGES` in
 * `projectWorkflow.js`, alongside `stageGateMessage` — the gate is read from
 * the project's `workflow_state` now, so the copy belongs with the question
 * rather than with this module's source model.
 *
 * `createUploadSource`, `createGeneratedSource`, `releaseFloorPlanSource`,
 * `hasFloorPlanSource` and `floorPlanGateMessage` were removed with the
 * session-memory source they served: a source is DERIVED from the approved
 * backend version (`sourceFromApprovedVersion`), so nothing mints one, nothing
 * owns a blob URL to free, and the gate does not ask this module.
 */
