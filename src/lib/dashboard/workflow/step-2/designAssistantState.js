/**
 * Step 2 — the Design Assistant state shape and its transitions.
 *
 * ONE state object per project holds everything Step 2 knows: the conversation,
 * the generated results, which result is approved, the working settings and the
 * generation status. Both views read it — the normal `/rendering` page and the
 * full-screen `/rendering/assistant` workspace — so there is no second copy to
 * fall out of step, and walking between the two routes changes nothing but
 * which component is mounted.
 *
 * It lives in `ProjectsProvider` for the same reason the Step 1 source does:
 * a route change must not discard it. Session memory only, no localStorage —
 * persisting it locally would fake a durability the product does not have.
 *
 * The reducer is pure and lives here rather than in a component, which is what
 * makes the approval rules readable in one place:
 *
 *   - approval is ALWAYS explicit; nothing auto-approves,
 *   - a new result clears the approval, because approval belongs to one render
 *     and must never silently transfer to a different one.
 *
 * Configuration and copy live in `designAssistantConfig.js`; the questions
 * asked of this state live in `designAssistantSelectors.js`.
 */

import {
  ASSISTANT_COPY,
  DEFAULT_RENDER_STYLE_ID,
  DEFAULT_VIEW_ANGLE_ID,
  GENERATION_FAILED_MESSAGE,
} from '@/lib/dashboard/workflow/step-2/designAssistantConfig'

export const GENERATION_STATUS = {
  idle: 'idle',
  generating: 'generating',
  error: 'error',
}

export function createDesignAssistantState() {
  return {
    /** Ordered conversation. Result blocks reference `results` by id. */
    messages: [],
    /** id to result. Kept keyed so approval can point at one render for life. */
    results: {},
    status: GENERATION_STATUS.idle,
    error: null,
    renderStyleId: DEFAULT_RENDER_STYLE_ID,
    viewAngleId: DEFAULT_VIEW_ANGLE_ID,
    /** The one render the user explicitly approved. Never set implicitly. */
    approvedResultId: null,
    /** The render "Edit image" pointed the next instruction at. */
    editingResultId: null,
    /** Whether the backend conversation and history have been read once. */
    hydrated: false,
    /** Monotonic — never `messages.length`, which repeats after a removal. */
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

/** Drops the transient "Generating…" block once a request settles. */
function withoutPending(state) {
  if (!state.messages.some((m) => m.kind === MESSAGE_KINDS.pending)) return state

  return {
    ...state,
    messages: state.messages.filter((m) => m.kind !== MESSAGE_KINDS.pending),
  }
}

/**
 * @param {ReturnType<typeof createDesignAssistantState>} state
 * @param {{ type: string }} action
 */
export function designAssistantReducer(state, action) {
  switch (action.type) {
    /**
     * Replaces the transcript with the server's record of Step 2.
     *
     * The working settings follow the most recent real render when the payload
     * carries them, so reopening the workspace shows the style and angle the
     * user last actually produced rather than the defaults.
     */
    case 'hydrate': {
      const results = action.results ?? {}

      return {
        ...state,
        messages: action.messages ?? [],
        results,
        approvedResultId: action.approvedResultId ?? null,
        editingResultId: results[state.editingResultId] ? state.editingResultId : null,
        renderStyleId: action.renderStyleId ?? state.renderStyleId,
        viewAngleId: action.viewAngleId !== undefined ? action.viewAngleId : state.viewAngleId,
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

    case 'setRenderStyle':
      return state.renderStyleId === action.renderStyleId
        ? state
        : { ...state, renderStyleId: action.renderStyleId }

    case 'setViewAngle':
      return state.viewAngleId === action.viewAngleId
        ? state
        : { ...state, viewAngleId: action.viewAngleId }

    case 'editResult':
      return state.editingResultId === action.resultId
        ? state
        : { ...state, editingResultId: action.resultId }

    case 'clearEditing':
      return state.editingResultId === null ? state : { ...state, editingResultId: null }

    /** One turn: the user's instruction, then the pending assistant block. */
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
        text: action.pendingText || ASSISTANT_COPY.generating,
      })

      return {
        ...withPending,
        status: GENERATION_STATUS.generating,
        error: null,
      }
    }

    /**
     * A finished render.
     *
     * The approval is cleared here and nowhere else: the user is looking at a
     * different model now, and carrying "approved" across to it would hand BoQ
     * a design nobody signed off.
     */
    case 'generationSucceeded': {
      const settled = withoutPending(state)
      const issued = settled.issued + 1
      const resultId = `r-${issued}`

      const result = {
        id: resultId,
        imageUrl: action.result.imageUrl,
        dwgUrl: action.result.dwgUrl ?? null,
        ownsImageUrl: Boolean(action.result.ownsImageUrl),
        renderStyleId: action.renderStyleId,
        viewAngleId: action.viewAngleId,
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
            // The sentence the assistant says alongside the render. Copy, not
            // data: it is chosen by the caller from `ASSISTANT_COPY` and says
            // nothing about the render it introduces.
            text: action.text ?? null,
          },
        ],
        status: GENERATION_STATUS.idle,
        error: null,
        approvedResultId: null,
        editingResultId: null,
      }
    }

    /**
     * A failed run, carrying the instruction that failed.
     *
     * `retry` is what makes the notice actionable rather than a dead end: the
     * exact prompt and view angle are kept on the message, so Retry re-sends
     * the same request instead of asking the user to retype it. It matters
     * more than it looks — with no generation service connected yet, this is
     * the state the workspace reaches on every attempt.
     */
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
                viewAngleId: action.viewAngleId ?? null,
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

    /** Explicit, always. There is no path that reaches this on its own. */
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

