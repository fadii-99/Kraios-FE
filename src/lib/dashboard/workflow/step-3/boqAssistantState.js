/**
 * Step 3 — the BoQ Assistant state shape and its transitions.
 *
 * ONE state object per project holds everything Step 3 knows: the conversation,
 * the generated BOQ table results, which result is approved, the uploaded supporting
 * documents, and the active document type.
 */

import {
  BOQ_ASSISTANT_COPY,
  DEFAULT_DOCUMENT_TYPE_ID,
} from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'

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
    documentTypeId: DEFAULT_DOCUMENT_TYPE_ID,
    /**
     * Uploaded supporting documents. Records are built by
     * `createBoqDocument` in `boqDocuments.js` — that module owns the shape,
     * and it is the shape Step 4 previews, downloads and packages.
     */
    uploadedDocuments: [],
    /** The one BoQ result the user explicitly approved. Never set implicitly. */
    approvedResultId: null,
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

/**
 * Writes an amended result back, and drops the approval if the amended result
 * was the approved one. Every table mutation goes through here so no future
 * edit action can quietly keep an approval it invalidated.
 */
function withRowEdit(state, resultId, updatedResult) {
  return {
    ...state,
    results: { ...state.results, [resultId]: updatedResult },
    approvedResultId: state.approvedResultId === resultId ? null : state.approvedResultId,
  }
}

export function boqAssistantReducer(state, action) {
  switch (action.type) {
    case 'setDocumentType':
      return state.documentTypeId === action.documentTypeId
        ? state
        : { ...state, documentTypeId: action.documentTypeId }

    /**
     * The caller hands over a finished record from `createBoqDocument`, which
     * is what keeps this reducer pure: minting an object URL is a side effect
     * and does not belong in a transition. Freeing it is a side effect too —
     * `ProjectsProvider` releases the URLs of documents that leave this list.
     */
    case 'uploadDocument': {
      if (!action.document) return state

      return {
        ...state,
        uploadedDocuments: [action.document, ...state.uploadedDocuments],
      }
    }

    case 'removeDocument':
      return {
        ...state,
        uploadedDocuments: state.uploadedDocuments.filter((d) => d.id !== action.documentId),
      }

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
     * Row edits are MATERIAL changes to the table.
     *
     * `withRowEdit` is what keeps that honest: it writes the amended result AND
     * clears the approval when the amended result is the approved one. Approval
     * belongs to a specific set of quantities, and a BoQ that gained or lost a
     * line is no longer the BoQ anybody signed off — Output reads
     * `approvedResultId` and nothing else, so leaving it pointing at a mutated
     * table would hand the deliverables stage an unreviewed cost schedule.
     *
     * There is exactly one approval flag in Step 3, this one; the user
     * re-approves explicitly, the same way they approved the first time.
     */
    case 'addRow': {
      const existing = state.results[action.resultId]
      if (!existing) return state

      const rows = existing.rows || []
      const nextIndex = rows.length + 1
      const itemNumber = String(nextIndex).padStart(2, '0')

      const newRow = action.row || {
        item: itemNumber,
        description: 'New BoQ specification / item',
        qty: '1',
        unit: 'm²',
        rate: '—',
        amount: '—',
      }

      const updatedRows = [...rows, { ...newRow, item: itemNumber }]

      return withRowEdit(state, action.resultId, {
        ...existing,
        rows: updatedRows,
        summary: `${updatedRows.length} Items · Preliminary BoQ`,
      })
    }

    case 'deleteRow': {
      const existing = state.results[action.resultId]
      if (!existing) return state

      const filtered = (existing.rows || []).filter((_, idx) => idx !== action.rowIndex)
      const updatedRows = filtered.map((row, idx) => ({
        ...row,
        item: String(idx + 1).padStart(2, '0'),
      }))

      return withRowEdit(state, action.resultId, {
        ...existing,
        rows: updatedRows,
        summary: `${updatedRows.length} Items · Preliminary BoQ`,
      })
    }

    default:
      return state
  }
}

