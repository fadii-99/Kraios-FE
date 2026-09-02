/**
 * Step 3 — the BoQ Assistant state shape and its transitions.
 *
 * ONE state object per project holds everything Step 3 knows: the conversation,
 * the BOQ versions, which one is approved, the supporting documents, and the
 * active document type.
 *
 * It is a VIEW MODEL over backend state, not a store of its own: `hydrate`
 * replaces it with what `/step-3/conversation/`, `/step-3/versions/` and
 * `/step-3/documents/` hold, and the optimistic transitions below only cover
 * the gap between sending a request and the refetch that answers it.
 */

import { BOQ_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'

export const GENERATION_STATUS = {
  idle: 'idle',
  generating: 'generating',
  error: 'error',
}

const MESSAGE_ROLES = { user: 'user', assistant: 'assistant' }

export const MESSAGE_KINDS = {
  text: 'text',
  result: 'result',
  pending: 'pending',
  notice: 'notice',
}

export function createBoqAssistantState() {
  return {
    /** Ordered conversation. Starts empty so workspace shows centered onboarding state. */
    messages: [],
    /** id to BoQ result object. Kept keyed so approval can point at one result for life. */
    results: {},
    status: GENERATION_STATUS.idle,
    error: null,
    /**
     * Supporting documents, as `ProjectDocument` records mapped by
     * `boqAdapters.documentToRecord`. Backend records with backend urls — the
     * shape Step 4 lists, previews and downloads.
     */
    uploadedDocuments: [],
    /** The one BoQ result the user explicitly approved. Never set implicitly. */
    approvedResultId: null,
    /** Whether the backend conversation, versions and documents were read. */
    hydrated: false,
    /** Monotonic id counter. */
    issued: 0,
  }
}


function withMessage(state, message) {
  const issued = state.issued + 1

  return {
    ...state,
    issued,
    messages: [...state.messages, { id: `m-${issued}`, at: Date.now(), ...message }],
  }
}

/** Drops the transient "Analyzing..." pending block once a request settles. */
function withoutPending(state) {
  if (!state.messages.some((m) => m.kind === MESSAGE_KINDS.pending)) return state

  return {
    ...state,
    messages: state.messages.filter((m) => m.kind !== MESSAGE_KINDS.pending),
  }
}

export function boqAssistantReducer(state, action) {
  switch (action.type) {
    /**
     * Replaces the transcript, the versions AND the document list with what the
     * backend holds. Documents are part of this because they are backend
     * records now, not browser blobs: the document API is the register, and a
     * refetch is what a page trusts after an upload or a delete.
     */
    case 'hydrate': {
      const results = action.results ?? {}

      return {
        ...state,
        messages: action.messages ?? [],
        results,
        approvedResultId: action.approvedResultId ?? null,
        uploadedDocuments: action.uploadedDocuments ?? state.uploadedDocuments,
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

    /** Just the document list, after an upload or a delete. */
    case 'setDocuments':
      return { ...state, uploadedDocuments: action.documents ?? [] }

    /** One turn: the user's instruction, then the pending assistant block. */
    case 'startGeneration': {
      const withUser = withMessage(state, {
        role: MESSAGE_ROLES.user,
        kind: MESSAGE_KINDS.text,
        text: action.prompt,
      })

      const withPending = withMessage(withUser, {
        role: MESSAGE_ROLES.assistant,
        kind: MESSAGE_KINDS.pending,
        text: action.pendingText || BOQ_ASSISTANT_COPY.generating,
      })

      return {
        ...withPending,
        status: GENERATION_STATUS.generating,
        error: null,
      }
    }

    /**
     * A finished BoQ result.
     * The previous approval is cleared: a new BoQ version is created and must be approved anew.
     */
    case 'generationSucceeded': {
      const settled = withoutPending(state)
      const issued = settled.issued + 1
      const resultId = `boq-${issued}`

      const result = {
        id: resultId,
        title: action.title || 'Bill of Quantities',
        summary: action.summary || `${action.rows?.length ?? 0} Items · Preliminary BoQ`,
        rows: action.rows || [],
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
            text: action.text || "I've prepared the structured Bill of Quantities based on your project floor plan, 3D design, and instructions.",
          },
        ],
        status: GENERATION_STATUS.idle,
        error: null,
        approvedResultId: null,
      }
    }

    case 'generationFailed': {
      const settled = withoutPending(state)

      return {
        ...withMessage(settled, {
          role: MESSAGE_ROLES.assistant,
          kind: MESSAGE_KINDS.notice,
          text: action.message || 'Unable to generate BoQ. Please check your project inputs and try again.',
          retry: action.prompt
            ? {
                prompt: action.prompt,
                pendingText: action.pendingText ?? null,
              }
            : null,
        }),
        status: GENERATION_STATUS.idle,
        error: action.message,
      }
    }

    case 'generationCancelled': {
      const settled = withoutPending(state)

      return {
        ...withMessage(settled, {
          role: MESSAGE_ROLES.assistant,
          kind: MESSAGE_KINDS.notice,
          text: action.message || 'BoQ generation was cancelled.',
        }),
        status: GENERATION_STATUS.idle,
        error: null,
      }
    }

    /** Explicit approval toggle. */
    case 'approveResult':
      if (!state.results[action.resultId]) return state

      return state.approvedResultId === action.resultId
        ? state
        : { ...state, approvedResultId: action.resultId }

    case 'disapproveResult':
    case 'unapproveResult':
      return { ...state, approvedResultId: null }

    /**
     * Row edits are MATERIAL changes to the table, and they are not made here.
     *
     * `addRow` and `deleteRow` used to mutate the result in place and clear the
     * approval when they touched the approved one. A BOQ version is immutable
     * on the backend, so an edit is now `POST /step-3/versions/manual/`: it
     * creates a NEW version with the amended rows, and the transcript is
     * refetched. That keeps the same rule — an edited table is not the table
     * anybody approved — without a browser-only copy that the server would
     * never agree with. The row arithmetic lives in `boqAdapters.js`.
     */

    default:
      return state
  }
}

