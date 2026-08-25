/**
 * Step 2 — derivations over the Design Assistant state.
 *
 * The questions the two Step 2 views ask, answered once: the normal
 * `/rendering` page and the `/rendering/assistant` workspace read the SAME
 * state through `useDesignAssistant`, so "is it approved", "what is being
 * refined" and "why is BoQ closed" belong here rather than in either view.
 *
 * Pure reads — nothing here mutates state or knows about React.
 */

import {
  GENERATION_FAILED_MESSAGE,
  ModelGenerationCancelledError,
  ModelGenerationUnavailableError,
} from '@/lib/dashboard/workflow/step-2/modelGeneration'
import { RENDERING_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import {
  GENERATION_STATUS,
  MESSAGE_KINDS,
} from '@/lib/dashboard/workflow/step-2/designAssistantState'

export function approvedResult(state) {
  return state?.approvedResultId ? (state.results[state.approvedResultId] ?? null) : null
}

export function isApproved(state) {
  return Boolean(approvedResult(state))
}

export function isGenerating(state) {
  return state?.status === GENERATION_STATUS.generating
}

export function editingResult(state) {
  return state?.editingResultId ? (state.results[state.editingResultId] ?? null) : null
}

/**
 * The render the NEXT instruction will change.
 *
 * "Edit image" points it at one render explicitly; otherwise a bare instruction
 * refines the most recent one. Both views need the same answer — the composer
 * shows it, the transcript marks it — and a conversational editor where you
 * cannot tell what you are editing is guesswork, so this is deliberately one
 * derivation rather than two component-local guesses.
 */
export function refinementBase(state) {
  return editingResult(state) ?? latestResult(state)
}

/** How many renders this session has produced. Counted, never estimated. */
export function resultCount(state) {
  return Object.keys(state?.results ?? {}).length
}

/** The most recent render, which is what a bare instruction refines. */
export function latestResult(state) {
  const messages = state?.messages ?? []

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].kind === MESSAGE_KINDS.result) {
      return state.results[messages[i].resultId] ?? null
    }
  }

  return null
}

export function hasAnyResult(state) {
  return Object.keys(state?.results ?? {}).length > 0
}

/**
 * The one line Step 2 shows under its sheet.
 *
 * Contextual rather than fixed: a stage that says "approve a design" while a
 * generation is running, or while three unapproved renders are already waiting,
 * is telling the user something they cannot act on. All three cases are read
 * from real state — the count is the number of renders this session actually
 * produced, not a metric.
 *
 * @returns {{ text: string, kind: 'busy' | 'pending' | 'idle' }}
 */
export function renderingStatusNote(state) {
  if (isGenerating(state)) {
    return { text: RENDERING_COPY.noteGenerating, kind: 'busy' }
  }

  const count = resultCount(state)

  if (count > 0) {
    return {
      text:
        count === 1
          ? RENDERING_COPY.noteOneUnapproved
          : RENDERING_COPY.noteManyUnapproved.replace('{count}', String(count)),
      kind: 'pending',
    }
  }

  return { text: RENDERING_COPY.statusPendingNote, kind: 'idle' }
}

/**
 * Why BoQ is not reachable yet, or `null` when it is.
 *
 * The bottom navigation is shared and untouched in its design; it simply asks
 * this question and, when it gets an answer, explains instead of navigating.
 */
export function renderingGateMessage(state) {
  return isApproved(state) ? null : RENDERING_COPY.boqGateMessage
}

/** The user-facing sentence for a thrown generation error. */
export function generationErrorMessage(thrown) {
  if (thrown instanceof ModelGenerationUnavailableError) return thrown.message
  if (thrown instanceof ModelGenerationCancelledError) return thrown.message

  return GENERATION_FAILED_MESSAGE
}
