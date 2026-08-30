/**
 * The one translation between a backend `Project` and what the library and the
 * workflow shell render.
 *
 * The API answers snake_case with a `workflow_state` block; the cards, the
 * stepper and the guard read `id`, `name`, `createdAt`, `has3DRender` and
 * `hasBoQ`. Both spellings are kept on the same object — the normalized fields
 * for the views, the raw ones for anything that talks to the API — so nothing
 * has to hold two copies of a project or guess which shape it was handed.
 *
 * `has3DRender` and `hasBoQ` stay DERIVED, as they always were. They are read
 * from `selected_three_d` / `selected_boq`, which is the backend's approval
 * record: a card can no more claim an approval than a component could before.
 */

import { WORKFLOW_STAGES } from '@/lib/dashboard/workflow/projectWorkflow'

/** Cache keys. One naming scheme, so a project's data can be dropped by prefix. */
export const CACHE_KEYS = {
  projects: 'projects',
  projectPrefix: (id) => `project:${id}`,
  project: (id) => `project:${id}:detail`,
  step1: (id) => `project:${id}:step-1`,
  step2: (id) => `project:${id}:step-2`,
  step3: (id) => `project:${id}:step-3`,
  output: (id) => `project:${id}:output`,
}

const EMPTY_WORKFLOW_STATE = Object.freeze({
  current_step: 1,
  step_1_complete: false,
  step_2_complete: false,
  step_3_complete: false,
  boq_skipped: false,
  is_finished: false,
})

/**
 * A backend project in the shape the dashboard renders.
 *
 * Returns null for a missing payload rather than a hollow object: "no project"
 * is a real answer the guard acts on, and a placeholder would hide it.
 */
export function normalizeProject(project) {
  if (!project || !project.id) return null

  const workflowState = project.workflow_state ?? EMPTY_WORKFLOW_STATE

  return {
    ...project,
    id: project.id,
    name: project.name ?? 'Untitled project',
    createdAt: project.created_at ? Date.parse(project.created_at) : Date.now(),
    updatedAt: project.updated_at ? Date.parse(project.updated_at) : null,
    has3DRender: Boolean(project.selected_three_d),
    hasBoQ: Boolean(project.selected_boq),
    workflowState,
    isFinished: Boolean(workflowState.is_finished),
    boqSkipped: Boolean(workflowState.boq_skipped),
  }
}

export function normalizeProjects(projects = []) {
  return projects.map(normalizeProject).filter(Boolean)
}

/**
 * Where opening this project should land.
 *
 * The backend's `current_step` is the authority on progress, so resuming reads
 * it rather than guessing from whatever the browser happens to remember. The
 * mapping goes through `WORKFLOW_STAGES` so a stage renamed there is renamed
 * here too.
 */
export function projectResumeSegment(project) {
  const step = project?.workflowState?.current_step ?? project?.workflow_state?.current_step ?? 1
  const index = Math.min(Math.max(Number(step) || 1, 1), WORKFLOW_STAGES.length) - 1
  return WORKFLOW_STAGES[index].segment
}

/** The full address the project card links to. */
export function projectResumePath(project) {
  if (!project?.id) return '/dashboard/projects'
  return `/dashboard/projects/${project.id}/${projectResumeSegment(project)}`
}

/** Whether `POST /finish/` can succeed for this project yet. */
export function canFinishProject(project) {
  const state = project?.workflowState ?? project?.workflow_state
  if (!state) return false

  return Boolean(
    state.step_1_complete &&
      state.step_2_complete &&
      (state.step_3_complete || state.boq_skipped),
  )
}
