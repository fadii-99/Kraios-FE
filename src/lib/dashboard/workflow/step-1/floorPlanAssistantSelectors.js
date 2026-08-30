/**
 * Queries against the 2D Floor Plan Assistant state.
 */

import { GENERATION_STATUS, MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantState'
import { FLOOR_PLAN_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantConfig'

export function isApproved(state) {
  return Boolean(state?.approvedResultId)
}

export function isGenerating(state) {
  return state?.status === GENERATION_STATUS.generating
}

export function approvedResult(state) {
  if (!state?.approvedResultId) return null
  return state.results[state.approvedResultId] ?? null
}

export function latestResult(state) {
  if (!state?.messages) return null

  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    const msg = state.messages[i]
    if (msg.kind === MESSAGE_KINDS.result && msg.resultId) {
      return state.results[msg.resultId] ?? null
    }
  }

  return null
}

export function editingResult(state) {
  if (!state?.editingResultId) return null
  return state.results[state.editingResultId] ?? null
}

export function refinementBase(state) {
  return editingResult(state) ?? latestResult(state)
}

export function hasResults(state) {
  return Boolean(state?.results && Object.keys(state.results).length > 0)
}

export function floorPlanStatusNote(state) {
  if (isGenerating(state)) {
    return { kind: 'busy', text: FLOOR_PLAN_ASSISTANT_COPY.generating }
  }

  if (isApproved(state)) {
    return { kind: 'onward', text: FLOOR_PLAN_ASSISTANT_COPY.statusApproved }
  }

  return { kind: 'pending', text: FLOOR_PLAN_ASSISTANT_COPY.statusPending }
}
