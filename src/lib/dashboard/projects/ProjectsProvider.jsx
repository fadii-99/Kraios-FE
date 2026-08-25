import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProjectsContext, nextProjectId } from '@/lib/dashboard/projects/projectsContext'
import { releaseFloorPlanSource } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import {
  createDesignAssistantState,
  designAssistantReducer,
} from '@/lib/dashboard/workflow/step-2/designAssistantState'
import {
  createBoqAssistantState,
  boqAssistantReducer,
} from '@/lib/dashboard/workflow/step-3/boqAssistantState'
import { releaseBoqDocuments } from '@/lib/dashboard/workflow/step-3/boqDocuments'

/**
 * Mounted once in `DashboardLayout`, so the project list survives navigating
 * between Overview, Projects and a project workspace within one session.
 *
 * Genuinely empty until the user creates something — no seeded example
 * project. `/dashboard/projects` starts on its real empty state.
 */
export default function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([])

  /**
   * Step 1's active 2D floor-plan source, keyed by project id.
   */
  const [floorPlanSources, setFloorPlanSources] = useState({})
  const sourcesRef = useRef({})

  /**
   * Step 2's Design Assistant state, keyed by project id.
   */
  const [designAssistantStates, setDesignAssistantStates] = useState({})

  /**
   * Step 3's BoQ Assistant state, keyed by project id.
   *
   * Mirrored into a ref for the same reason `floorPlanSources` is: supporting
   * documents hold object URLs, and freeing them on delete and on unmount needs
   * the current list without making those callbacks depend on it.
   */
  const [boqAssistantStates, setBoqAssistantStates] = useState({})
  const boqStatesRef = useRef({})

  // Ids come from a monotonic counter, never from `projects.length`
  const issued = useRef(0)

  const createProject = useCallback((name) => {
    issued.current += 1

    const created = {
      id: nextProjectId(issued.current - 1),
      name,
      createdAt: Date.now(),
      has3DRender: false,
      hasBoQ: false,
    }

    setProjects((prev) => [created, ...prev])
    return created
  }, [])

  /** Sets, replaces or (with `null`) clears one project's floor-plan source. */
  const setFloorPlanSource = useCallback((projectId, source) => {
    if (!projectId) return

    const previous = sourcesRef.current[projectId]
    if (previous && previous !== source) {
      releaseFloorPlanSource(previous)
    }

    const next = { ...sourcesRef.current }
    if (source) next[projectId] = source
    else delete next[projectId]

    sourcesRef.current = next
    setFloorPlanSources(next)
  }, [])

  const getFloorPlanSource = useCallback(
    (projectId) => (projectId ? floorPlanSources[projectId] ?? null : null),
    [floorPlanSources],
  )

  /** Applies one Design Assistant action to one project's state. */
  const dispatchDesignAssistant = useCallback((projectId, action) => {
    if (!projectId) return

    setDesignAssistantStates((prev) => {
      const current = prev[projectId] ?? createDesignAssistantState()
      const next = designAssistantReducer(current, action)

      if (next === current && prev[projectId]) return prev
      return { ...prev, [projectId]: next }
    })
  }, [])

  /**
   * Applies one BoQ Assistant action to one project's state.
   *
   * The reducer is pure, so the blob URLs of any document that LEAVES the list
   * are freed here — removal, and replacement, in one place rather than at each
   * call site that might drop a document.
   */
  const dispatchBoqAssistant = useCallback((projectId, action) => {
    if (!projectId) return

    setBoqAssistantStates((prev) => {
      const current = prev[projectId] ?? createBoqAssistantState()
      const next = boqAssistantReducer(current, action)

      if (next === current && prev[projectId]) return prev

      if (next.uploadedDocuments !== current.uploadedDocuments) {
        const kept = new Set(next.uploadedDocuments.map((doc) => doc.id))
        releaseBoqDocuments(current.uploadedDocuments.filter((doc) => !kept.has(doc.id)))
      }

      const updated = { ...prev, [projectId]: next }
      boqStatesRef.current = updated
      return updated
    })
  }, [])

  /**
   * Stage state, DERIVED on read rather than written back into the project.
   */
  const projectsWithStageState = useMemo(
    () =>
      projects.map((project) => {
        const has3DRender = Boolean(designAssistantStates[project.id]?.approvedResultId)
        const hasBoQ = Boolean(boqAssistantStates[project.id]?.approvedResultId)

        if (project.has3DRender === has3DRender && project.hasBoQ === hasBoQ) {
          return project
        }

        return { ...project, has3DRender, hasBoQ }
      }),
    [projects, designAssistantStates, boqAssistantStates],
  )

  const deleteProject = useCallback(
    (id) => {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setFloorPlanSource(id, null)
      setDesignAssistantStates((prev) => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      setBoqAssistantStates((prev) => {
        if (!prev[id]) return prev
        releaseBoqDocuments(prev[id].uploadedDocuments)
        const next = { ...prev }
        delete next[id]
        boqStatesRef.current = next
        return next
      })
    },
    [setFloorPlanSource],
  )

  // Last line of defence against leaking blob URLs — floor-plan sources AND
  // Step 3 supporting documents, both of which mint object URLs.
  useEffect(
    () => () => {
      Object.values(sourcesRef.current).forEach(releaseFloorPlanSource)
      sourcesRef.current = {}

      Object.values(boqStatesRef.current).forEach((boqState) =>
        releaseBoqDocuments(boqState?.uploadedDocuments),
      )
      boqStatesRef.current = {}
    },
    [],
  )

  const getProject = useCallback(
    (id) => projectsWithStageState.find((p) => p.id === id),
    [projectsWithStageState],
  )

  const value = useMemo(
    () => ({
      projects: projectsWithStageState,
      createProject,
      deleteProject,
      getProject,
      floorPlanSources,
      setFloorPlanSource,
      getFloorPlanSource,
      designAssistantStates,
      dispatchDesignAssistant,
      boqAssistantStates,
      dispatchBoqAssistant,
    }),
    [
      projectsWithStageState,
      createProject,
      deleteProject,
      getProject,
      floorPlanSources,
      setFloorPlanSource,
      getFloorPlanSource,
      designAssistantStates,
      dispatchDesignAssistant,
      boqAssistantStates,
      dispatchBoqAssistant,
    ],
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}


