/**
 * Project workflow API services for KRAIOS.
 *
 * ONE module for every `/projects` endpoint in the backend contract, in the
 * same shape as `auth.js` and `profile.js`: an endpoint register, then a thin
 * service per call. Nothing here holds state, raises a toast or knows about
 * React — callers own feedback, and `apiClient` owns cookies, CSRF, the single
 * 401 refresh and error normalization.
 *
 * Two rules the whole workflow depends on:
 *
 *   - Generation / edit / archive endpoints answer `202 Accepted` and hand back
 *     a job. Nothing here waits on one; `jobs.js` does that.
 *   - `workflow_state` on the project is the backend's source of truth for
 *     progress. A view may render local state while a request is in flight, but
 *     it must not decide the stage from it.
 */

import { apiClient } from './client'

const ROOT = '/projects'

const scoped = (projectId) => `${ROOT}/${encodeURIComponent(projectId)}`

export const PROJECT_ENDPOINTS = {
  list: `${ROOT}/`,
  create: `${ROOT}/`,
  detail: (id) => `${scoped(id)}/`,
  output: (id) => `${scoped(id)}/output/`,
  finish: (id) => `${scoped(id)}/finish/`,

  // Step 1 — 2D floor plan
  step1Conversation: (id) => `${scoped(id)}/step-1/conversation/`,
  step1History: (id) => `${scoped(id)}/step-1/history/`,
  step1Upload: (id) => `${scoped(id)}/step-1/upload/`,
  step1Generate: (id) => `${scoped(id)}/step-1/generate/`,
  step1Edit: (id) => `${scoped(id)}/step-1/edit/`,
  step1Approve: (id, versionId) =>
    `${scoped(id)}/step-1/versions/${encodeURIComponent(versionId)}/approve/`,

  // Step 2 — 3D rendering
  step2Conversation: (id) => `${scoped(id)}/step-2/conversation/`,
  step2History: (id) => `${scoped(id)}/step-2/history/`,
  step2Generate: (id) => `${scoped(id)}/step-2/generate/`,
  step2Edit: (id) => `${scoped(id)}/step-2/edit/`,
  step2Angle: (id) => `${scoped(id)}/step-2/angle/`,
  step2Approve: (id, versionId) =>
    `${scoped(id)}/step-2/versions/${encodeURIComponent(versionId)}/approve/`,

  // Step 3 — BOQ
  step3Conversation: (id) => `${scoped(id)}/step-3/conversation/`,
  step3Generate: (id) => `${scoped(id)}/step-3/generate/`,
  step3Versions: (id) => `${scoped(id)}/step-3/versions/`,
  step3ManualVersion: (id) => `${scoped(id)}/step-3/versions/manual/`,
  step3Approve: (id, versionId) =>
    `${scoped(id)}/step-3/versions/${encodeURIComponent(versionId)}/approve/`,
  step3VersionCsv: (id, versionId) =>
    `${scoped(id)}/step-3/versions/${encodeURIComponent(versionId)}/download-csv/`,
  step3Skip: (id) => `${scoped(id)}/step-3/skip/`,
  step3Documents: (id) => `${scoped(id)}/step-3/documents/`,
  step3Document: (id, documentId) =>
    `${scoped(id)}/step-3/documents/${encodeURIComponent(documentId)}/`,

  // Messages, jobs, assets
  message: (id, messageId) =>
    `${scoped(id)}/conversations/messages/${encodeURIComponent(messageId)}/`,
  job: (jobId) => `${ROOT}/jobs/${encodeURIComponent(jobId)}/`,
  assets: (id) => `${scoped(id)}/assets/`,
  assetDownload: (id, assetId) =>
    `${scoped(id)}/assets/${encodeURIComponent(assetId)}/download/`,
  downloadAll: (id) => `${scoped(id)}/download-all/`,
}

/** Allowed `document_type` values, exactly as the backend spells them. */
export const DOCUMENT_TYPE_VALUES = [
  'GENERAL',
  'PROJECT_BRIEF',
  'STRUCTURAL_DRAWING',
  'ESTIMATION',
  'MATERIAL_SPECIFICATION',
  'THREE_D_MODEL',
  'OTHER',
]

/** Allowed `render_style` values. */
export const RENDER_STYLE_VALUES = ['SKETCHUP', 'PHOTOREALISTIC']

/** Allowed `angle` values. */
export const ANGLE_VALUES = ['ORIGINAL', 'ISOMETRIC_45']

/** Allowed `scope` values for the deliverables archive. */
export const ARCHIVE_SCOPES = ['ALL', 'FLOOR_PLANS', 'THREE_D', 'BOQ', 'DOCUMENTS']

/**
 * A list endpoint may answer either a bare array or a DRF page. Both shapes
 * reach the UI as an array, decided here rather than at a dozen call sites.
 */
function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/* ---------------------------------------------------------------------------
   Project and workflow state
   --------------------------------------------------------------------------- */

export async function listProjects(options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.list, options))
}

export async function createProject({ name, workflow } = {}, options = {}) {
  // The current UI offers no workflow choice, so only `name` is sent unless a
  // caller deliberately passes one. Workflow is immutable after creation.
  const body = workflow ? { name, workflow } : { name }

  return apiClient(PROJECT_ENDPOINTS.create, { method: 'POST', body, ...options })
}

export async function fetchProject(projectId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.detail(projectId), options)
}

export async function renameProject(projectId, name, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.detail(projectId), {
    method: 'PATCH',
    body: { name },
    ...options,
  })
}

export async function deleteProject(projectId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.detail(projectId), { method: 'DELETE', ...options })
}

export async function fetchProjectOutput(projectId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.output(projectId), options)
}

export async function finishProject(projectId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.finish(projectId), { method: 'POST', ...options })
}

/* ---------------------------------------------------------------------------
   Step 1 — 2D floor plan
   --------------------------------------------------------------------------- */

export async function fetchFloorPlanConversation(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step1Conversation(projectId), options))
}

export async function fetchFloorPlanHistory(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step1History(projectId), options))
}

/**
 * Uploads the user's own 2D plan. A successful upload creates a COMPLETED
 * version, approves it, and moves the backend to Step 2 — so the caller must
 * refetch the project rather than assume.
 */
export async function uploadFloorPlan(projectId, file, options = {}) {
  const form = new FormData()
  form.append('file', file)

  // No Content-Type: the browser has to write the multipart boundary itself.
  return apiClient(PROJECT_ENDPOINTS.step1Upload(projectId), {
    method: 'POST',
    body: form,
    ...options,
  })
}

/**
 * Queues a 2D generation, or a text-only revision of an existing version.
 * Answers `202` with a FloorPlanVersion carrying a nested job.
 */
export async function generateFloorPlan(
  projectId,
  { prompt, parentVersionId } = {},
  options = {},
) {
  const body = { prompt }
  if (parentVersionId) body.parent_version_id = parentVersionId

  return apiClient(PROJECT_ENDPOINTS.step1Generate(projectId), {
    method: 'POST',
    body,
    ...options,
  })
}

/** Queues a traced-mask edit of one completed 2D version. */
export async function editFloorPlan(
  projectId,
  { originalVersionId, instruction, mask },
  options = {},
) {
  const form = new FormData()
  form.append('original_version_id', originalVersionId)
  form.append('instruction', instruction)
  form.append('mask', mask)

  return apiClient(PROJECT_ENDPOINTS.step1Edit(projectId), {
    method: 'POST',
    body: form,
    ...options,
  })
}

/** Approves one 2D version. Answers the updated project. */
export async function approveFloorPlanVersion(projectId, versionId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step1Approve(projectId, versionId), {
    method: 'POST',
    ...options,
  })
}

/* ---------------------------------------------------------------------------
   Step 2 — 3D rendering
   --------------------------------------------------------------------------- */

export async function fetchThreeDConversation(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step2Conversation(projectId), options))
}

export async function fetchThreeDHistory(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step2History(projectId), options))
}

/**
 * Queues one 3D render.
 *
 * `floorPlanVersionId` is optional — omitted, the backend uses the approved or
 * latest completed plan, which is the right default for the COMPLETE workflow.
 */
export async function generateThreeD(
  projectId,
  { prompt, floorPlanVersionId, renderStyle } = {},
  options = {},
) {
  const body = { prompt }
  if (floorPlanVersionId) body.floor_plan_version_id = floorPlanVersionId
  if (renderStyle) body.render_style = renderStyle

  return apiClient(PROJECT_ENDPOINTS.step2Generate(projectId), {
    method: 'POST',
    body,
    ...options,
  })
}

/** Queues a traced-mask edit of one completed 3D version. */
export async function editThreeD(
  projectId,
  { originalVersionId, instruction, mask },
  options = {},
) {
  const form = new FormData()
  form.append('original_version_id', originalVersionId)
  form.append('instruction', instruction)
  form.append('mask', mask)

  return apiClient(PROJECT_ENDPOINTS.step2Edit(projectId), {
    method: 'POST',
    body: form,
    ...options,
  })
}

/**
 * Queues an angle conversion. This creates ANOTHER version with
 * `source: 'ANGLE'`; the original is untouched.
 */
export async function generateThreeDAngle(
  projectId,
  { originalVersionId, angle } = {},
  options = {},
) {
  return apiClient(PROJECT_ENDPOINTS.step2Angle(projectId), {
    method: 'POST',
    body: { original_version_id: originalVersionId, angle },
    ...options,
  })
}

/** Approves one 3D version. Answers the updated project. */
export async function approveThreeDVersion(projectId, versionId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step2Approve(projectId, versionId), {
    method: 'POST',
    ...options,
  })
}

/* ---------------------------------------------------------------------------
   Step 3 — BOQ
   --------------------------------------------------------------------------- */

export async function fetchBoqConversation(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step3Conversation(projectId), options))
}

/** Stores a text-only user message. Queues no assistant response. */
export async function postBoqMessage(projectId, content, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step3Conversation(projectId), {
    method: 'POST',
    body: { content },
    ...options,
  })
}

/** Queues BOQ generation. Answers `202` with a BOQVersion carrying a job. */
export async function generateBoq(projectId, { prompt } = {}, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step3Generate(projectId), {
    method: 'POST',
    body: { prompt },
    ...options,
  })
}

export async function fetchBoqVersions(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step3Versions(projectId), options))
}

/**
 * Saves table edits as a NEW immutable version. A browser-only edit is not a
 * BOQ — the backend holds every version, and this is how an edit becomes one.
 */
export async function createManualBoqVersion(
  projectId,
  { structuredData, parentVersionId } = {},
  options = {},
) {
  const body = { structured_data: structuredData }
  if (parentVersionId) body.parent_version_id = parentVersionId

  return apiClient(PROJECT_ENDPOINTS.step3ManualVersion(projectId), {
    method: 'POST',
    body,
    ...options,
  })
}

/** Approves one BOQ version. Clears a previous skip. Answers the project. */
export async function approveBoqVersion(projectId, versionId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step3Approve(projectId, versionId), {
    method: 'POST',
    ...options,
  })
}

/** Skips the optional BOQ stage. Always confirm with the user first. */
export async function skipBoq(projectId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step3Skip(projectId), { method: 'POST', ...options })
}

export async function fetchBoqDocuments(projectId, options = {}) {
  return asList(await apiClient(PROJECT_ENDPOINTS.step3Documents(projectId), options))
}

/**
 * Uploads one supporting document.
 *
 * Documents are deliberately separate from conversation attachments: BOQ
 * generation records the document ids available when the job is submitted, so
 * a file has to exist as a document before it can inform a BOQ.
 */
export async function uploadBoqDocument(
  projectId,
  { file, title, documentType } = {},
  options = {},
) {
  const form = new FormData()
  form.append('file', file)
  if (title) form.append('title', title)
  if (documentType) form.append('document_type', documentType)

  return apiClient(PROJECT_ENDPOINTS.step3Documents(projectId), {
    method: 'POST',
    body: form,
    ...options,
  })
}

/**
 * Updates document metadata, or replaces its file.
 *
 * A `file` switches the request to multipart, because that is the only way the
 * replacement can be sent; metadata alone stays JSON.
 */
export async function updateBoqDocument(
  projectId,
  documentId,
  { title, documentType, file } = {},
  options = {},
) {
  const endpoint = PROJECT_ENDPOINTS.step3Document(projectId, documentId)

  if (file) {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    if (documentType) form.append('document_type', documentType)

    return apiClient(endpoint, { method: 'PATCH', body: form, ...options })
  }

  const body = {}
  if (title !== undefined) body.title = title
  if (documentType !== undefined) body.document_type = documentType

  return apiClient(endpoint, { method: 'PATCH', body, ...options })
}

export async function deleteBoqDocument(projectId, documentId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.step3Document(projectId, documentId), {
    method: 'DELETE',
    ...options,
  })
}

/* ---------------------------------------------------------------------------
   Messages, jobs, assets
   --------------------------------------------------------------------------- */

/** Deletes one conversation message — 2D, 3D or BOQ, user or assistant. */
export async function deleteConversationMessage(projectId, messageId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.message(projectId, messageId), {
    method: 'DELETE',
    ...options,
  })
}

export async function fetchJob(jobId, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.job(jobId), options)
}

export async function fetchProjectAssets(projectId, { kind } = {}, options = {}) {
  const endpoint = kind
    ? `${PROJECT_ENDPOINTS.assets(projectId)}?kind=${encodeURIComponent(kind)}`
    : PROJECT_ENDPOINTS.assets(projectId)

  return asList(await apiClient(endpoint, options))
}

/**
 * Queues a full or scoped deliverables ZIP.
 *
 * Unlike every other queued operation this answers the job DIRECTLY rather than
 * nesting it under a version. Re-queuing an active scope returns that same job
 * instead of a duplicate.
 */
export async function queueProjectArchive(projectId, { scope = 'ALL' } = {}, options = {}) {
  return apiClient(PROJECT_ENDPOINTS.downloadAll(projectId), {
    method: 'POST',
    body: { scope },
    ...options,
  })
}
