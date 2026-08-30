/**
 * Step 1 — 2D Floor Plan Assistant state model and transitions.
 */

import { GENERATION_FAILED_MESSAGE } from '@/lib/dashboard/workflow/step-1/floorPlanGeneration'
import { FLOOR_PLAN_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantConfig'

export const GENERATION_STATUS = {
  idle: 'idle',
  generating: 'generating',
  error: 'error',
}

export function createFloorPlanAssistantState() {
  return {
    /** Ordered conversation messages. */
    messages: [],
    /** id to generated result object. */
    results: {},
    status: GENERATION_STATUS.idle,
    error: null,
    /** The one result the user explicitly approved. */
    approvedResultId: null,
    /** The result currently selected for editing/refining. */
    editingResultId: null,
    /** Monotonic message counter. */
    issued: 0,
  }
}

const MESSAGE_ROLES = { user: 'user', assistant: 'assistant' }

export const MESSAGE_KINDS = {
  text: 'text',
  result: 'result',
  pending: 'pending',
  notice: 'notice',
}

function withMessage(state, message) {
  const issued = state.issued + 1

  return {
    ...state,
    issued,
    messages: [...state.messages, { id: `m-${issued}`, at: Date.now(), ...message }],
  }
}

function withoutPending(state) {
  if (!state.messages.some((m) => m.kind === MESSAGE_KINDS.pending)) return state

  return {
    ...state,
    messages: state.messages.filter((m) => m.kind !== MESSAGE_KINDS.pending),
  }
}

export function floorPlanAssistantReducer(state, action) {
  switch (action.type) {
    case 'editResult':
      return state.editingResultId === action.resultId
        ? state
        : { ...state, editingResultId: action.resultId }

    case 'clearEditing':
      return state.editingResultId === null ? state : { ...state, editingResultId: null }

    case 'startGeneration': {
      const withUser = withMessage(state, {
        role: MESSAGE_ROLES.user,
        kind: MESSAGE_KINDS.text,
        text: action.prompt,
        canvasSnapshotUrl: action.canvasSnapshotUrl ?? null,
      })

      const withPending = withMessage(withUser, {
        role: MESSAGE_ROLES.assistant,
        kind: MESSAGE_KINDS.pending,
        text: action.pendingText || FLOOR_PLAN_ASSISTANT_COPY.generating,
      })

      return {
        ...withPending,
        status: GENERATION_STATUS.generating,
        error: null,
      }
    }

    case 'generationSucceeded': {
      const settled = withoutPending(state)
      const issued = settled.issued + 1
      const resultId = `r2d-${issued}`

      const result = {
        id: resultId,
        imageUrl: action.result.imageUrl,
        ownsImageUrl: Boolean(action.result.ownsImageUrl),
        prompt: action.prompt,
        at: Date.now(),
      }

      return {
        ...settled,
        issued,
        results: { ...settled.results, [resultId]: result },
        messages: [
          ...settled.messages,
          {
            id: `m-${issued}`,
            at: result.at,
            role: MESSAGE_ROLES.assistant,
            kind: MESSAGE_KINDS.result,
            resultId,
            text: action.text ?? null,
          },
        ],
        status: GENERATION_STATUS.idle,
        error: null,
        // Creating a new generation explicitly clears prior approval
        approvedResultId: null,
        editingResultId: null,
      }
    }

    case 'generationFailed': {
      const settled = withoutPending(state)

      return {
        ...withMessage(settled, {
          role: MESSAGE_ROLES.assistant,
          kind: MESSAGE_KINDS.notice,
          text: action.message || GENERATION_FAILED_MESSAGE,
          retry: action.prompt
            ? {
                prompt: action.prompt,
                pendingText: action.pendingText ?? null,
              }
            : null,
        }),
        status: GENERATION_STATUS.idle,
        error: action.message || GENERATION_FAILED_MESSAGE,
      }
    }

    case 'generationCancelled': {
      const settled = withoutPending(state)

      return {
        ...withMessage(settled, {
          role: MESSAGE_ROLES.assistant,
          kind: MESSAGE_KINDS.notice,
          text: action.message,
        }),
        status: GENERATION_STATUS.idle,
        error: null,
      }
    }

    case 'approveResult':
      if (!state.results[action.resultId]) return state

      return state.approvedResultId === action.resultId
        ? state
        : { ...state, approvedResultId: action.resultId }

    case 'disapproveResult':
    case 'unapproveResult':
      return { ...state, approvedResultId: null }

    default:
      return state
  }
}
