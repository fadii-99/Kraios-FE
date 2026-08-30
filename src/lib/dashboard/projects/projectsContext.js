import { createContext, useCallback, useContext } from 'react'

import { createFloorPlanAssistantState } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantState'
import { createDesignAssistantState } from '@/lib/dashboard/workflow/step-2/designAssistantState'
import { createBoqAssistantState } from '@/lib/dashboard/workflow/step-3/boqAssistantState'

/**
 * Session-scoped project store.
 *
 * Context + `useState` in `ProjectsProvider` — no state library, no backend, no
 * localStorage. Projects created in this session live in memory and are gone on
 * refresh, which is the honest behaviour until an API exists: persisting them
 * locally would fake durability the product does not have yet.
 *
 * The context value is shaped like the API that will replace it —
 * `{ projects, createProject, getProject }` — so swapping the provider for a
 * data-fetching one needs no change in any consuming component.
 *
 * The context and hook live in this plain `.js` module (not beside the
 * provider component) so the provider file exports only a component.
 */
export const ProjectsContext = createContext(null)

export function useProjects() {
  const value = useContext(ProjectsContext)

  if (!value) {
    throw new Error('useProjects must be used inside <ProjectsProvider>')
  }

  return value
}

/**
 * One project's active 2D floor-plan source, as a `useState`-shaped pair.
 *
 * Step 1 reads and writes exactly one value through this — there is no second
 * copy of the source anywhere, which is what keeps "upload OR generated, never
 * both" true by construction rather than by discipline.
 */
export function useFloorPlanSource(projectId) {
  const { floorPlanSources, setFloorPlanSource } = useProjects()

  const source = projectId ? floorPlanSources[projectId] ?? null : null

  const setSource = useCallback(
    (next) => setFloorPlanSource(projectId, next),
    [projectId, setFloorPlanSource],
  )

  return [source, setSource]
}

/**
 * One project's 2D Floor Plan Assistant state, as a `[state, dispatch]` pair.
 */
export function useFloorPlanAssistant(projectId) {
  const { floorPlanAssistantStates, dispatchFloorPlanAssistant } = useProjects()

  const state =
    (projectId && floorPlanAssistantStates?.[projectId]) || FALLBACK_FLOOR_PLAN_ASSISTANT_STATE

  const dispatch = useCallback(
    (action) => dispatchFloorPlanAssistant?.(projectId, action),
    [projectId, dispatchFloorPlanAssistant],
  )

  return [state, dispatch]
}

/**
 * One project's Design Assistant state, as a `[state, dispatch]` pair.
 *
 * Step 2's two views — the normal `/rendering` page and the full-screen
 * `/rendering/assistant` workspace — both read Step 2 through this hook and
 * nothing else, which is what keeps them operating on the SAME state instead of
 * two component-local copies. A default state is returned for a project that
 * has not been touched yet, so neither view has to null-check.
 */
export function useDesignAssistant(projectId) {
  const { designAssistantStates, dispatchDesignAssistant } = useProjects()

  const state = (projectId && designAssistantStates[projectId]) || FALLBACK_ASSISTANT_STATE

  const dispatch = useCallback(
    (action) => dispatchDesignAssistant(projectId, action),
    [projectId, dispatchDesignAssistant],
  )

  return [state, dispatch]
}

/**
 * One project's BoQ Assistant state, as a `[state, dispatch]` pair.
 *
 * Step 3's two views — the normal `/boq` page and the full-screen
 * `/boq/assistant` workspace — both read Step 3 through this hook.
 */
export function useBoqAssistant(projectId) {
  const { boqAssistantStates, dispatchBoqAssistant } = useProjects()

  const state = (projectId && boqAssistantStates?.[projectId]) || FALLBACK_BOQ_ASSISTANT_STATE

  const dispatch = useCallback(
    (action) => dispatchBoqAssistant?.(projectId, action),
    [projectId, dispatchBoqAssistant],
  )

  return [state, dispatch]
}

/**
 * The value an untouched project reads. Frozen and shared rather than built per
 * call: a fresh object every render would be a new dependency identity for
 * every consumer and re-run their effects on each render.
 *
 * This fallback is for a project that EXISTS but has not been touched — not for
 * an id that does not exist at all. That case is settled before any of these
 * hooks run, by `RequireProject` at the route boundary, so a made-up project id
 * cannot reach a stage and start writing state against it.
 */
const FALLBACK_FLOOR_PLAN_ASSISTANT_STATE = Object.freeze(createFloorPlanAssistantState())
const FALLBACK_ASSISTANT_STATE = Object.freeze(createDesignAssistantState())
const FALLBACK_BOQ_ASSISTANT_STATE = Object.freeze(createBoqAssistantState())

/** Sequential, human-readable ids: project-001, project-002, … */
export function nextProjectId(count) {
  return `project-${String(count + 1).padStart(3, '0')}`
}

