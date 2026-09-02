/**
 * The genuinely generic half of translating backend workflow payloads into the
 * view models the three assistants already render.
 *
 * Only what is identical across Steps 1, 2 and 3 lives here — timestamps,
 * version status, the conversation-message role map, and the "is this version
 * still being worked on" question. Everything a step actually differs about
 * (render style, view angle, BOQ rows, which asset is the image) stays in that
 * step's own adapter, so this never becomes a switch on the step number.
 */

/** Backend `JobStatus`, reused as the version status. */
export const VERSION_STATUS = {
  queued: 'QUEUED',
  processing: 'PROCESSING',
  completed: 'COMPLETED',
  failed: 'FAILED',
}

/** ISO string to epoch ms, falling back to now rather than to NaN. */
export function toEpoch(iso) {
  if (!iso) return Date.now()
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

export function isVersionPending(version) {
  return (
    version?.status === VERSION_STATUS.queued ||
    version?.status === VERSION_STATUS.processing
  )
}

export function isVersionCompleted(version) {
  return version?.status === VERSION_STATUS.completed
}

export function isVersionFailed(version) {
  return version?.status === VERSION_STATUS.failed
}

/** The conversation role, in the spelling the transcript components expect. */
export function messageRole(message) {
  return message?.role === 'USER' ? 'user' : 'assistant'
}

/**
 * Versions grouped by the user message that produced them.
 *
 * A version's `prompt_message` is the USER turn that asked for it, which is
 * what lets a rebuilt transcript put each result directly under its own
 * instruction instead of appending every version at the end.
 */
export function versionsByPromptMessage(versions = []) {
  const grouped = new Map()

  versions.forEach((version) => {
    const messageId = version?.prompt_message?.id
    if (!messageId) return

    const existing = grouped.get(messageId)
    if (existing) existing.push(version)
    else grouped.set(messageId, [version])
  })

  return grouped
}

/**
 * The single in-flight job across a set of versions, or null.
 *
 * This is what lets a reopened page re-attach to work that is still running:
 * the version list says a render is PROCESSING and carries its job, so the page
 * resumes watching rather than showing a finished-looking empty state.
 */
export function pendingJobFromVersions(versions = []) {
  for (let i = versions.length - 1; i >= 0; i -= 1) {
    const version = versions[i]
    if (isVersionPending(version) && version.job?.id) {
      return { versionId: version.id, job: version.job }
    }
  }

  return null
}

/** Sorts versions oldest-first, which is the order a transcript reads in. */
export function byCreatedAt(versions = []) {
  return [...versions].sort((a, b) => toEpoch(a?.created_at) - toEpoch(b?.created_at))
}

/**
 * The pending block's line while a job runs.
 *
 * The backend's own `message` is preferred — it says what the pipeline is
 * actually doing — and nothing is invented: a job without one falls back to the
 * stage's own copy.
 *
 * The percentage is deliberately NOT shown. The pipeline's `progress` is a
 * simulated ramp rather than measured work, so a number on screen read as a
 * precise estimate the backend cannot make. The animated pending block already
 * says the same thing honestly: something is running.
 */
export function jobProgressText(job, fallback) {
  return job?.message || fallback
}
