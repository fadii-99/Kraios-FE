/**
 * Step 2 — backend payloads to the Design Assistant view model, and the two
 * enum translations Step 2 owns.
 *
 * The assistant's own ids are lowercase and hyphenated because they are also
 * DOM ids and option keys; the backend's are uppercase enums. Both spellings
 * are legitimate in their own layer, and this module is the ONE place they
 * meet — a component never types `'PHOTOREALISTIC'`, and a request never
 * carries `'photo-realistic'`.
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
import { ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-2/designAssistantState'

const FAILED_VERSION_MESSAGE = 'That 3D model could not be generated. Try again in a moment.'

/* ---------------------------------------------------------------------------
   Enum translation
   --------------------------------------------------------------------------- */

const RENDER_STYLE_TO_API = {
  sketchup: 'SKETCHUP',
  'photo-realistic': 'PHOTOREALISTIC',
}

const RENDER_STYLE_FROM_API = {
  SKETCHUP: 'sketchup',
  PHOTOREALISTIC: 'photo-realistic',
}

const VIEW_ANGLE_TO_API = {
  'isometric-45': 'ISOMETRIC_45',
}

const VIEW_ANGLE_FROM_API = {
  ISOMETRIC_45: 'isometric-45',
  // The backend's ORIGINAL is Step 2's "no angle chosen", which the UI spells
  // as null — see DEFAULT_VIEW_ANGLE_ID.
  ORIGINAL: null,
}

export function renderStyleToApi(id) {
  return RENDER_STYLE_TO_API[id] ?? 'SKETCHUP'
}

export function renderStyleFromApi(value) {
  return RENDER_STYLE_FROM_API[value] ?? 'sketchup'
}

export function viewAngleToApi(id) {
  return VIEW_ANGLE_TO_API[id] ?? 'ORIGINAL'
}

export function viewAngleFromApi(value) {
  return value in VIEW_ANGLE_FROM_API ? VIEW_ANGLE_FROM_API[value] : null
}

/* ---------------------------------------------------------------------------
   Versions and transcript
   --------------------------------------------------------------------------- */

/** One `ThreeDVersion` as a result the transcript can render. */
export function versionToResult(version, projectId) {
  if (!version) return null

  return {
    id: version.id,
    imageUrl: assetSrc(version.image, projectId),
    // The contract carries no DWG asset on a 3D version, so the DWG action —
    // which renders only when this is present — stays absent rather than
    // pointing at a file that does not exist.
    dwgUrl: null,
    ownsImageUrl: false,
    renderStyleId: renderStyleFromApi(version.render_style),
    viewAngleId: viewAngleFromApi(version.angle),
    prompt: version.instruction || version.prompt_message?.content || '',
    source: version.source,
    status: version.status,
    floorPlanVersionId: version.floor_plan ?? null,
    assetId: version.image?.id ?? null,
    assetName: version.image?.original_name ?? null,
    at: toEpoch(version.completed_at || version.created_at),
  }
}

/** Every completed render, keyed by version id. */
export function resultsFromHistory(history = [], projectId) {
  const results = {}

  byCreatedAt(history).forEach((version) => {
    if (!isVersionCompleted(version) || !version.image) return
    results[version.id] = versionToResult(version, projectId)
  })

  return results
}

/** The completed renders, newest first. */
export function completedVersions(history = [], projectId) {
  return byCreatedAt(history)
    .filter((version) => isVersionCompleted(version) && version.image)
    .map((version) => versionToResult(version, projectId))
    .reverse()
}

/**
 * The approved 3D version id — `selected_three_d` on the project, with the
 * version's own `selected` flag as the fallback.
 */
export function approvedVersionId(history = [], project) {
  if (project?.selected_three_d) return project.selected_three_d
  return history.find((version) => version?.selected)?.id ?? null
}

/** Rebuilds the whole Step 2 assistant transcript and result set. */
export function hydrateDesignState({ conversation = [], history = [], project, projectId }) {
  const results = resultsFromHistory(history, projectId)
  const grouped = versionsByPromptMessage(history)
  const messages = []

  conversation.forEach((message) => {
    const role = messageRole(message)

    if (message.content) {
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

    ;(grouped.get(message.id) ?? []).forEach((version) => {
      if (isVersionPending(version)) {
        messages.push({
          id: `pending-${version.id}`,
          at: toEpoch(version.created_at),
          role: 'assistant',
          kind: MESSAGE_KINDS.pending,
          text: version.job?.message || ASSISTANT_COPY.generating,
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
          retry: message.content
            ? {
                prompt: message.content,
                viewAngleId: viewAngleFromApi(version.angle),
                pendingText: null,
              }
            : null,
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

  const approved = approvedVersionId(history, project)
  const latest = byCreatedAt(history).filter(isVersionCompleted).pop()

  return {
    messages,
    results,
    approvedResultId: approved && results[approved] ? approved : null,
    // The working settings follow the most recent render, so reopening the
    // workspace shows the style and angle the user last actually produced.
    renderStyleId: latest ? renderStyleFromApi(latest.render_style) : undefined,
    viewAngleId: latest ? viewAngleFromApi(latest.angle) : undefined,
    pending: pendingJobFromVersions(history),
  }
}
