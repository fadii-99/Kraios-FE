/**
 * Step 1 — backend payloads to the 2D Floor Plan Assistant view model.
 *
 * The transcript, the result blocks and the approval rules were built against
 * `{ messages, results, approvedResultId }`. The backend answers a conversation
 * and a version history. This module is the ONE translation between them, which
 * is why no component had to learn the API shape.
 *
 * Two deliberate properties:
 *
 *   - A result's `id` IS the backend version id. Approval therefore points at a
 *     real `FloorPlanVersion`, and approving is a request rather than a local
 *     flag that happens to match one.
 *   - Progress is rebuilt from the server, not remembered. A version that is
 *     still QUEUED / PROCESSING comes back as a pending block carrying its job,
 *     so reopening the page resumes watching real work instead of showing a
 *     finished-looking transcript.
 */

import { assetSrc } from '@/lib/api/files'
import {
  byCreatedAt,
  isVersionCompleted,
  isVersionFailed,
  isVersionPending,
  messageRole,
  pendingJobFromVersions,
  toEpoch,
  versionsByPromptMessage,
} from '@/lib/dashboard/workflow/apiShapes'
import { FLOOR_PLAN_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantConfig'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantState'

const FAILED_VERSION_MESSAGE =
  'That floor plan could not be generated. Try again in a moment.'

/** One `FloorPlanVersion` as a result the transcript can render. */
export function versionToResult(version, projectId) {
  if (!version) return null

  return {
    id: version.id,
    imageUrl: assetSrc(version.image, projectId),
    // Remote urls, so nothing here is a blob this app has to revoke.
    ownsImageUrl: false,
    prompt: version.prompt || version.instruction || '',
    source: version.source,
    status: version.status,
    assetId: version.image?.id ?? null,
    assetName: version.image?.original_name ?? null,
    at: toEpoch(version.completed_at || version.created_at),
  }
}

/** Every version that produced a usable image, keyed by version id. */
export function resultsFromHistory(history = [], projectId) {
  const results = {}

  byCreatedAt(history).forEach((version) => {
    if (!isVersionCompleted(version) || !version.image) return
    results[version.id] = versionToResult(version, projectId)
  })

  return results
}

/**
 * The completed 2D versions, newest first — what the "2D Floor Plans" dropdown
 * lists and what Step 2 may be generated from.
 */
export function completedVersions(history = [], projectId) {
  return byCreatedAt(history)
    .filter((version) => isVersionCompleted(version) && version.image)
    .map((version) => versionToResult(version, projectId))
    .reverse()
}

/**
 * Rebuilds the whole Step 1 assistant state from one conversation and one
 * history fetch.
 *
 * @param {object} payload
 * @param {Array}  payload.conversation ConversationMessage[]
 * @param {Array}  payload.history      FloorPlanVersion[]
 * @param {object} [payload.project]    the project, for the approved version id
 * @param {string} payload.projectId
 */
export function hydrateFloorPlanState({ conversation = [], history = [], project, projectId }) {
  const results = resultsFromHistory(history, projectId)
  const grouped = versionsByPromptMessage(history)
  const messages = []

  conversation.forEach((message) => {
    const role = messageRole(message)

    /* Only the USER's own turns are transcribed.
     *
     * The backend also stores a short assistant sentence beside each finished
     * version ("Your 2D floor plan is ready for review."). It restated what the
     * drawing directly under it already says, so the transcript carried a line
     * of copy for every result and the images stopped reading as the subject of
     * the workspace. The result block IS the assistant's answer here; failures
     * and running jobs still speak, from the version below. */
    if (role === 'user' && message.content) {
      messages.push({
        id: message.id,
        at: toEpoch(message.created_at),
        role,
        kind: MESSAGE_KINDS.text,
        text: message.content,
        canvasSnapshotUrl: null,
        serverMessageId: message.id,
      })
    }

    // Whatever this turn produced follows it directly, so a result always sits
    // under the instruction that asked for it.
    ;(grouped.get(message.id) ?? []).forEach((version) => {
      if (isVersionPending(version)) {
        messages.push({
          id: `pending-${version.id}`,
          at: toEpoch(version.created_at),
          role: 'assistant',
          kind: MESSAGE_KINDS.pending,
          text: version.job?.message || FLOOR_PLAN_ASSISTANT_COPY.generating,
          versionId: version.id,
          jobId: version.job?.id ?? null,
        })
        return
      }

      if (isVersionFailed(version)) {
        messages.push({
          id: `failed-${version.id}`,
          at: toEpoch(version.created_at),
          role: 'assistant',
          kind: MESSAGE_KINDS.notice,
          text: version.job?.error || FAILED_VERSION_MESSAGE,
          retry: message.content ? { prompt: message.content, pendingText: null } : null,
        })
        return
      }

      if (results[version.id]) {
        messages.push({
          id: `result-${version.id}`,
          at: toEpoch(version.completed_at || version.created_at),
          role: 'assistant',
          kind: MESSAGE_KINDS.result,
          resultId: version.id,
          text: null,
        })
      }
    })
  })

  const approvedResultId = approvedVersionId(history, project)

  return {
    messages,
    results,
    approvedResultId: approvedResultId && results[approvedResultId] ? approvedResultId : null,
    pending: pendingJobFromVersions(history),
  }
}

/**
 * The approved 2D version id.
 *
 * The project's `selected_floor_plan` is the authority; `selected` on a version
 * is read only as a fallback for a payload that did not carry the project.
 */
export function approvedVersionId(history = [], project) {
  if (project?.selected_floor_plan) return project.selected_floor_plan
  return history.find((version) => version?.selected)?.id ?? null
}
