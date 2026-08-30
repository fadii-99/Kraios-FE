/**
 * Step 3 — pure questions asked of BoQ Assistant state.
 *
 * `boqGateMessage`, `latestBoqResult` and `boqStatusNote` were removed: the
 * stage gate is `stageGateMessage` in `projectWorkflow.js` (read from the
 * project's `workflow_state`), and nothing rendered the other two.
 */

import { GENERATION_STATUS } from '@/lib/dashboard/workflow/step-3/boqAssistantState'

export function isBoqApproved(state) {
  return Boolean(state?.approvedResultId)
}

export function approvedBoqResult(state) {
  if (!state?.approvedResultId) return null
  return state.results?.[state.approvedResultId] ?? null
}

export function isBoqGenerating(state) {
  return state?.status === GENERATION_STATUS.generating
}
