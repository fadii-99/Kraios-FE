/**
 * Step 3 — pure questions asked of BoQ Assistant state.
 */

import { GENERATION_STATUS } from '@/lib/dashboard/workflow/step-3/boqAssistantState'

export function isBoqApproved(state) {
  return Boolean(state?.approvedResultId)
}

export function approvedBoqResult(state) {
  if (!state?.approvedResultId) return null
  return state.results?.[state.approvedResultId] ?? null
}

export function latestBoqResult(state) {
  if (!state?.results) return null
  const keys = Object.keys(state.results)
  if (keys.length === 0) return null
  return state.results[keys[keys.length - 1]] ?? null
}

export function isBoqGenerating(state) {
  return state?.status === GENERATION_STATUS.generating
}

export function boqGateMessage() {
  // BoQ is optional — users can skip BoQ to Output and return anytime.
  return null
}


export function boqStatusNote(state) {
  if (isBoqApproved(state)) {
    return 'Bill of Quantities approved. You can proceed to the Output stage.'
  }
  if (isBoqGenerating(state)) {
    return 'Compiling Bill of Quantities in BoQ Assistant…'
  }
  if (latestBoqResult(state)) {
    return 'Review and approve your Bill of Quantities in BoQ Assistant.'
  }
  return 'Open BoQ Assistant to generate your initial Bill of Quantities.'
}
