import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'

import { CACHE_KEYS } from '@/lib/dashboard/projects/projectShape'
import { RESOURCE_STATUS } from '@/lib/dashboard/projects/useResourceCache'
import { createFloorPlanAssistantState } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantState'
import { createDesignAssistantState } from '@/lib/dashboard/workflow/step-2/designAssistantState'
import { createBoqAssistantState } from '@/lib/dashboard/workflow/step-3/boqAssistantState'
import { sourceFromApprovedVersion } from '@/lib/dashboard/workflow/step-1/floorPlanSource'

/**
 * The project store's public surface.
 *
 * `ProjectsProvider` talks to the KRAIOS project API and holds one keyed
 * request cache; these hooks are how the dashboard reads it. Two rules keep
 * that boundary honest:
 *
 *   - a component reads what it needs and asks for it to be loaded, rather than
 *     the shell prefetching everything a project might one day want,
 *   - nothing a component derives is written back into the store. Approval,
 *     progress and version lists come from the backend, and the questions asked
 *     of them are answered by selectors.
 *
 * The context and hooks live in this plain `.js` module, not beside the
 * provider component, so the provider file exports only a component.
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
 * The value an untouched project reads. Frozen and shared rather than built per
 * call: a fresh object every render would be a new dependency identity for
 * every consumer and re-run their effects on each render.
 */
const FALLBACK_FLOOR_PLAN_ASSISTANT_STATE = Object.freeze(createFloorPlanAssistantState())
const FALLBACK_ASSISTANT_STATE = Object.freeze(createDesignAssistantState())
const FALLBACK_BOQ_ASSISTANT_STATE = Object.freeze(createBoqAssistantState())

/* ---------------------------------------------------------------------------
   Assistant view models
   --------------------------------------------------------------------------- */

/** One project's 2D Floor Plan Assistant state, as a `[state, dispatch]` pair. */
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

/** One project's Design Assistant state, as a `[state, dispatch]` pair. */
export function useDesignAssistant(projectId) {
  const { designAssistantStates, dispatchDesignAssistant } = useProjects()

  const state = (projectId && designAssistantStates?.[projectId]) || FALLBACK_ASSISTANT_STATE

  const dispatch = useCallback(
    (action) => dispatchDesignAssistant(projectId, action),
    [projectId, dispatchDesignAssistant],
  )

  return [state, dispatch]
}

/** One project's BoQ Assistant state, as a `[state, dispatch]` pair. */
export function useBoqAssistant(projectId) {
  const { boqAssistantStates, dispatchBoqAssistant } = useProjects()

  const state = (projectId && boqAssistantStates?.[projectId]) || FALLBACK_BOQ_ASSISTANT_STATE

  const dispatch = useCallback(
    (action) => dispatchBoqAssistant?.(projectId, action),
    [projectId, dispatchBoqAssistant],
  )

  return [state, dispatch]
}

/* ---------------------------------------------------------------------------
   Derived reads
   --------------------------------------------------------------------------- */

/**
 * The project's active 2D floor-plan source.
 *
 * DERIVED from the approved Step 1 version rather than stored: the backend's
 * `selected_floor_plan` is the record of which plan this project is working
 * from, and a second local copy could only ever disagree with it. The returned
 * shape is the one Step 1 always used — `{ type, kind, previewUrl, … }` — so
 * `modeForSource`, `lockedModeForSource` and every preview read it unchanged.
 *
 * It is null until Step 1 has been loaded (`useStep1Data`), which is exactly
 * what "no plan yet" looks like, so no view has to distinguish the two.
 */
export function useFloorPlanSource(projectId) {
  const [state] = useFloorPlanAssistant(projectId)

  return useMemo(() => {
    const approved = state?.approvedResultId ? state.results?.[state.approvedResultId] : null
    return sourceFromApprovedVersion(approved)
  }, [state])
}

/** One project, from the detail cache or the list. */
export function useProject(projectId) {
  const { getProject } = useProjects()
  return getProject(projectId)
}

/* ---------------------------------------------------------------------------
   Loaders
   --------------------------------------------------------------------------- */

/**
 * Loads one resource when the component that needs it mounts, and reports its
 * status — the ONE pattern every stage and assistant uses.
 *
 * The cache behind it de-duplicates, so mounting two components that need the
 * same step costs one request, and returning to a stage already loaded costs
 * none. `reload` is the deliberate refetch a mutation asks for.
 */
function useResource(projectId, cacheKey, loader) {
  const { stepEntry } = useProjects()

  useEffect(() => {
    if (!projectId) return
    loader(projectId).catch(() => {
      // The failure is on the entry below; the view renders it.
    })
  }, [projectId, loader])

  const entry = stepEntry(projectId, cacheKey)

  const reload = useCallback(
    () => loader(projectId, { force: true }),
    [loader, projectId],
  )

  return {
    status: entry.status,
    error: entry.error,
    data: entry.data,
    isLoading: entry.status === RESOURCE_STATUS.loading && !entry.data,
    isReady: entry.status === RESOURCE_STATUS.ready,
    reload,
  }
}

/** Step 1's conversation and version history. */
export function useStep1Data(projectId) {
  const { loadStep1 } = useProjects()
  return useResource(projectId, 'step1', loadStep1)
}

/** Step 2's conversation and version history. */
export function useStep2Data(projectId) {
  const { loadStep2 } = useProjects()
  return useResource(projectId, 'step2', loadStep2)
}

/** Step 3's conversation, BOQ versions and supporting documents. */
export function useStep3Data(projectId) {
  const { loadStep3 } = useProjects()
  return useResource(projectId, 'step3', loadStep3)
}

/** Step 4's whole deliverables bundle, in one request. */
export function useProjectOutput(projectId) {
  const { loadOutput } = useProjects()
  return useResource(projectId, 'output', loadOutput)
}

export { CACHE_KEYS, RESOURCE_STATUS }
