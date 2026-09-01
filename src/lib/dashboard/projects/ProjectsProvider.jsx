import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  approveBoqVersion,
  approveFloorPlanVersion,
  approveThreeDVersion,
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  fetchBoqConversation,
  fetchBoqDocuments,
  fetchBoqVersions,
  fetchFloorPlanConversation,
  fetchFloorPlanHistory,
  fetchProject,
  fetchProjectOutput,
  fetchThreeDConversation,
  fetchThreeDHistory,
  finishProject as finishProjectRequest,
  listProjects,
  renameProject as renameProjectRequest,
  skipBoq as skipBoqRequest,
} from '@/lib/api/projects'
import { ProjectsContext } from '@/lib/dashboard/projects/projectsContext'
import { CACHE_KEYS, normalizeProject, normalizeProjects } from '@/lib/dashboard/projects/projectShape'
import { RESOURCE_STATUS, useResourceCache } from '@/lib/dashboard/projects/useResourceCache'
import { hydrateFloorPlanState } from '@/lib/dashboard/workflow/step-1/floorPlanAdapters'
import { hydrateDesignState } from '@/lib/dashboard/workflow/step-2/designAdapters'
import { hydrateBoqState } from '@/lib/dashboard/workflow/step-3/boqAdapters'
import {
  createFloorPlanAssistantState,
  floorPlanAssistantReducer,
} from '@/lib/dashboard/workflow/step-1/floorPlanAssistantState'
import {
  createDesignAssistantState,
  designAssistantReducer,
} from '@/lib/dashboard/workflow/step-2/designAssistantState'
import {
  createBoqAssistantState,
  boqAssistantReducer,
} from '@/lib/dashboard/workflow/step-3/boqAssistantState'

/**
 * The dashboard's project store, backed by the KRAIOS project API.
 *
 * Mounted once in `DashboardLayout`, so a project opened, a version approved
 * and a conversation read survive navigating between Overview, Projects and a
 * workspace — and, unlike the session-memory store this replaces, survive a
 * refresh, because the backend holds them.
 *
 * Three things live here and nowhere else:
 *
 *   1. **The project list**, loaded once when the dashboard mounts. Create,
 *      rename and delete are real requests whose responses are written straight
 *      back, so the library never has to refetch to show what just happened.
 *   2. **A keyed request cache** (`useResourceCache`) for everything a project
 *      owns — its detail, each step's conversation and history, and the Step 4
 *      output bundle. Two components asking for the same thing share one
 *      request; walking Upload → Rendering → Upload costs nothing the second
 *      time; a mutation invalidates exactly the keys it invalidated.
 *   3. **The three assistant view models**, still the same pure reducers. They
 *      are hydrated FROM the server rather than accumulated locally: a fetch
 *      replaces the transcript, and an optimistic pending block only ever
 *      covers the gap between sending a request and the refetch that answers
 *      it.
 *
 * What is deliberately NOT here: approval flags of its own. `selected_floor_plan`
 * `selected_three_d` and `selected_boq` on the project are the record of what
 * was approved, and `has3DRender` / `hasBoQ` are derived from them on read.
 */
export default function ProjectsProvider({ children }) {
  const cache = useResourceCache()
  const { load, set: setCached, invalidate, invalidatePrefix, read } = cache

  const [projects, setProjects] = useState([])
  const [projectsStatus, setProjectsStatus] = useState(RESOURCE_STATUS.idle)
  const [projectsError, setProjectsError] = useState(null)

  /** Step 1's 2D Floor Plan Assistant view model, keyed by project id. */
  const [floorPlanAssistantStates, setFloorPlanAssistantStates] = useState({})

  /** Step 2's Design Assistant view model, keyed by project id. */
  const [designAssistantStates, setDesignAssistantStates] = useState({})

  /** Step 3's BoQ Assistant view model, keyed by project id. */
  const [boqAssistantStates, setBoqAssistantStates] = useState({})

  // The list request de-duplicates through a ref for the same reason
  // `verifySession` does: React's double effect invocation in development must
  // not produce a second GET.
  const projectsRequestRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    // React Strict Mode runs effect cleanup once during development before the
    // real mount. Reset this guard when the provider mounts again so a valid
    // API response can move the project list from loading to ready.
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  /* -------------------------------------------------------------------------
     The project list
     ------------------------------------------------------------------------- */

  const loadProjects = useCallback(
    () => {
      if (projectsRequestRef.current) return projectsRequestRef.current

      setProjectsStatus(RESOURCE_STATUS.loading)
      setProjectsError(null)

      const request = listProjects()
        .then((payload) => {
          const normalized = normalizeProjects(payload)
          if (!mountedRef.current) return normalized

          setProjects(normalized)
          setProjectsStatus(RESOURCE_STATUS.ready)
          // Every project the list carries seeds the detail cache, so opening
          // one does not wait on a request for what has just arrived. The list
          // is always the fresher read here — it is a GET that just completed —
          // so it overwrites rather than deferring to an older cached detail.
          normalized.forEach((project) => {
            setCached(CACHE_KEYS.project(project.id), project)
          })
          return normalized
        })
        .catch((error) => {
          if (mountedRef.current) {
            setProjectsStatus(RESOURCE_STATUS.error)
            setProjectsError(error)
          }
          throw error
        })
        .finally(() => {
          projectsRequestRef.current = null
        })

      projectsRequestRef.current = request
      return request
    },
    [setCached],
  )

  // The one list bootstrap. The dashboard boundary above has already settled
  // the session, so this cannot fire for an anonymous visitor.
  useEffect(() => {
    loadProjects().catch(() => {
      // The error is already on `projectsError`; the library renders it.
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, [])

  /** Writes one project into the list and the detail cache in one move. */
  const applyProject = useCallback(
    (payload) => {
      const project = normalizeProject(payload)
      if (!project) return null

      setCached(CACHE_KEYS.project(project.id), project)
      setProjects((prev) => {
        const index = prev.findIndex((item) => item.id === project.id)
        if (index === -1) return [project, ...prev]

        const next = [...prev]
        next[index] = project
        return next
      })

      return project
    },
    [setCached],
  )

  const createProject = useCallback(
    async (name) => {
      const created = await createProjectRequest({ name })
      return applyProject(created)
    },
    [applyProject],
  )

  const renameProject = useCallback(
    async (projectId, name) => {
      const updated = await renameProjectRequest(projectId, name)
      return applyProject(updated)
    },
    [applyProject],
  )

  const deleteProject = useCallback(
    async (projectId) => {
      await deleteProjectRequest(projectId)

      setProjects((prev) => prev.filter((project) => project.id !== projectId))
      invalidatePrefix(CACHE_KEYS.projectPrefix(projectId))

      const drop = (setter) =>
        setter((prev) => {
          if (!prev[projectId]) return prev
          const next = { ...prev }
          delete next[projectId]
          return next
        })

      drop(setFloorPlanAssistantStates)
      drop(setDesignAssistantStates)
      drop(setBoqAssistantStates)
    },
    [invalidatePrefix],
  )

  /* -------------------------------------------------------------------------
     One project
     ------------------------------------------------------------------------- */

  const loadProject = useCallback(
    (projectId, { force = false } = {}) =>
      load(
        CACHE_KEYS.project(projectId),
        async () => normalizeProject(await fetchProject(projectId)),
        { force },
      ),
    [load],
  )

  const projectEntry = useCallback(
    (projectId) => read(CACHE_KEYS.project(projectId)),
    [read],
  )

  const getProject = useCallback(
    (projectId) => {
      if (!projectId) return null
      const cached = read(CACHE_KEYS.project(projectId)).data
      if (cached) return cached
      return projects.find((project) => project.id === projectId) ?? null
    },
    [projects, read],
  )

  /**
   * Refetches the project after anything that can move `workflow_state`.
   *
   * The backend decides progress, so an upload, an approval, a skip and a
   * finish are all followed by this rather than by a local guess at what the
   * new step must be.
   */
  const refreshProject = useCallback(
    (projectId) => loadProject(projectId, { force: true }),
    [loadProject],
  )

  /* -------------------------------------------------------------------------
     The three assistant view models
     ------------------------------------------------------------------------- */

  const dispatchFloorPlanAssistant = useCallback((projectId, action) => {
    if (!projectId) return

    setFloorPlanAssistantStates((prev) => {
      const current = prev[projectId] ?? createFloorPlanAssistantState()
      const next = floorPlanAssistantReducer(current, action)

      if (next === current && prev[projectId]) return prev
      return { ...prev, [projectId]: next }
    })
  }, [])

  const dispatchDesignAssistant = useCallback((projectId, action) => {
    if (!projectId) return

    setDesignAssistantStates((prev) => {
      const current = prev[projectId] ?? createDesignAssistantState()
      const next = designAssistantReducer(current, action)

      if (next === current && prev[projectId]) return prev
      return { ...prev, [projectId]: next }
    })
  }, [])

  const dispatchBoqAssistant = useCallback((projectId, action) => {
    if (!projectId) return

    setBoqAssistantStates((prev) => {
      const current = prev[projectId] ?? createBoqAssistantState()
      const next = boqAssistantReducer(current, action)

      if (next === current && prev[projectId]) return prev
      return { ...prev, [projectId]: next }
    })
  }, [])

  /* -------------------------------------------------------------------------
     Per-step loaders
     ------------------------------------------------------------------------- */

  /**
   * Step 1's conversation and version history.
   *
   * Both calls go out together — they are independent, and the assistant needs
   * both before it can render a single turn.
   */
  const loadStep1 = useCallback(
    (projectId, { force = false } = {}) =>
      load(
        CACHE_KEYS.step1(projectId),
        async () => {
          const [conversation, history, project] = await Promise.all([
            fetchFloorPlanConversation(projectId),
            fetchFloorPlanHistory(projectId),
            loadProject(projectId),
          ])

          const hydrated = hydrateFloorPlanState({ conversation, history, project, projectId })
          // A version the backend is still working on keeps the workspace busy,
          // so the composer cannot queue a second request on top of a running
          // one just because this browser was not the one that started it.
          dispatchFloorPlanAssistant(projectId, {
            type: 'hydrate',
            ...hydrated,
            busy: Boolean(hydrated.pending),
          })

          return { conversation, history, hydrated }
        },
        { force },
      ),
    [dispatchFloorPlanAssistant, load, loadProject],
  )

  const loadStep2 = useCallback(
    (projectId, { force = false } = {}) =>
      load(
        CACHE_KEYS.step2(projectId),
        async () => {
          const [conversation, history, project] = await Promise.all([
            fetchThreeDConversation(projectId),
            fetchThreeDHistory(projectId),
            loadProject(projectId),
          ])

          const hydrated = hydrateDesignState({ conversation, history, project, projectId })
          dispatchDesignAssistant(projectId, {
            type: 'hydrate',
            ...hydrated,
            busy: Boolean(hydrated.pending),
          })

          return { conversation, history, hydrated }
        },
        { force },
      ),
    [dispatchDesignAssistant, load, loadProject],
  )

  /** Step 3 needs three lists — conversation, versions and documents. */
  const loadStep3 = useCallback(
    (projectId, { force = false } = {}) =>
      load(
        CACHE_KEYS.step3(projectId),
        async () => {
          const [conversation, versions, documents, project] = await Promise.all([
            fetchBoqConversation(projectId),
            fetchBoqVersions(projectId),
            fetchBoqDocuments(projectId),
            loadProject(projectId),
          ])

          const hydrated = hydrateBoqState({
            conversation,
            versions,
            documents,
            project,
            projectId,
          })
          dispatchBoqAssistant(projectId, {
            type: 'hydrate',
            ...hydrated,
            busy: Boolean(hydrated.pending),
          })

          return { conversation, versions, documents, hydrated }
        },
        { force },
      ),
    [dispatchBoqAssistant, load, loadProject],
  )

  /** Step 4's whole page, in one request. */
  const loadOutput = useCallback(
    (projectId, { force = false } = {}) =>
      load(
        CACHE_KEYS.output(projectId),
        async () => {
          const output = await fetchProjectOutput(projectId)
          if (output?.project) applyProject(output.project)
          return output
        },
        { force },
      ),
    [applyProject, load],
  )

  const stepEntry = useCallback(
    (projectId, key) => read(CACHE_KEYS[key](projectId)),
    [read],
  )

  /* -------------------------------------------------------------------------
     Approvals and stage transitions
     ------------------------------------------------------------------------- */

  /**
   * Approving is a request, never a local flag.
   *
   * Each of these answers the updated project, which is written straight back —
   * so `workflow_state` moves because the backend moved it, and the step's own
   * cache is invalidated because `selected` changed on one of its versions.
   */
  const approveFloorPlan = useCallback(
    async (projectId, versionId) => {
      const project = applyProject(await approveFloorPlanVersion(projectId, versionId))
      // A different 2D plan clears downstream approvals, so Steps 2 and 3 are
      // stale too — not just Step 1.
      invalidate(CACHE_KEYS.step1(projectId))
      invalidate(CACHE_KEYS.step2(projectId))
      invalidate(CACHE_KEYS.step3(projectId))
      invalidate(CACHE_KEYS.output(projectId))
      return project
    },
    [applyProject, invalidate],
  )

  const approveThreeD = useCallback(
    async (projectId, versionId) => {
      const project = applyProject(await approveThreeDVersion(projectId, versionId))
      // A different render clears an existing BOQ approval or skip.
      invalidate(CACHE_KEYS.step2(projectId))
      invalidate(CACHE_KEYS.step3(projectId))
      invalidate(CACHE_KEYS.output(projectId))
      return project
    },
    [applyProject, invalidate],
  )

  const approveBoq = useCallback(
    async (projectId, versionId) => {
      const project = applyProject(await approveBoqVersion(projectId, versionId))
      invalidate(CACHE_KEYS.step3(projectId))
      invalidate(CACHE_KEYS.output(projectId))
      return project
    },
    [applyProject, invalidate],
  )

  const skipBoq = useCallback(
    async (projectId) => {
      const project = applyProject(await skipBoqRequest(projectId))
      invalidate(CACHE_KEYS.step3(projectId))
      invalidate(CACHE_KEYS.output(projectId))
      return project
    },
    [applyProject, invalidate],
  )

  const finishProject = useCallback(
    async (projectId) => {
      const project = applyProject(await finishProjectRequest(projectId))
      invalidate(CACHE_KEYS.output(projectId))
      return project
    },
    [applyProject, invalidate],
  )

  const value = useMemo(
    () => ({
      // The list
      projects,
      projectsStatus,
      projectsError,
      loadProjects,
      createProject,
      renameProject,
      deleteProject,

      // One project
      getProject,
      loadProject,
      refreshProject,
      projectEntry,
      applyProject,

      // Step data
      floorPlanAssistantStates,
      dispatchFloorPlanAssistant,
      designAssistantStates,
      dispatchDesignAssistant,
      boqAssistantStates,
      dispatchBoqAssistant,
      loadStep1,
      loadStep2,
      loadStep3,
      loadOutput,
      stepEntry,
      invalidateStep: invalidate,

      // Stage transitions
      approveFloorPlan,
      approveThreeD,
      approveBoq,
      skipBoq,
      finishProject,
    }),
    [
      projects,
      projectsStatus,
      projectsError,
      loadProjects,
      createProject,
      renameProject,
      deleteProject,
      getProject,
      loadProject,
      refreshProject,
      projectEntry,
      applyProject,
      floorPlanAssistantStates,
      dispatchFloorPlanAssistant,
      designAssistantStates,
      dispatchDesignAssistant,
      boqAssistantStates,
      dispatchBoqAssistant,
      loadStep1,
      loadStep2,
      loadStep3,
      loadOutput,
      stepEntry,
      invalidate,
      approveFloorPlan,
      approveThreeD,
      approveBoq,
      skipBoq,
      finishProject,
    ],
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}
