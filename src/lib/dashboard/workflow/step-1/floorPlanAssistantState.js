/**
 * Step 1 — 2D Floor Plan Assistant state model and transitions.
 */

import {
  FLOOR_PLAN_ASSISTANT_COPY,
  GENERATION_FAILED_MESSAGE,
} from '@/lib/dashboard/workflow/step-1/floorPlanAssistantConfig'

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
    /**
     * Whether the backend conversation and version history have been read at
     * least once. The workspace holds its loader on this rather than on
     * `messages.length`, so a project with no history yet shows its real empty
     * state instead of a spinner that never resolves.
     */
    hydrated: false,
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
    /**
     * Replaces the whole transcript with what the backend holds.
     *
     * The server is the record of what happened in this stage, so a fetch
     * REPLACES rather than merges: an optimistic pending block that the server
     * has since answered must not survive alongside the real result. Only the
     * two purely local pointers — what is being edited, and the monotonic
     * counter — are carried across.
     */
    case 'hydrate': {
      const results = action.results ?? {}

      return {
        ...state,
        messages: action.messages ?? [],
        results,
        approvedResultId: action.approvedResultId ?? null,
        editingResultId: results[state.editingResultId] ? state.editingResultId : null,
        status: action.busy ? GENERATION_STATUS.generating : GENERATION_STATUS.idle,
        error: null,
        hydrated: true,
      }
    }

    /**
     * A running job's own progress line, written onto the pending block.
     *
     * The backend reports `progress` and `message` while a job runs; without
     * this the workspace would show one frozen "Generating…" for the whole
     * wait. Nothing else changes — it is the same pending message, relabelled.
     */
    case 'generationProgress': {
      const index = state.messages.findIndex((m) => m.kind === MESSAGE_KINDS.pending)
      if (index === -1) return state

      const current = state.messages[index]
      if (current.text === action.text) return state

      const messages = [...state.messages]
      messages[index] = { ...current, text: action.text }

      return { ...state, messages }
    }

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
