import { useCallback, useMemo, useRef, useState } from 'react'
import { ProjectsContext, nextProjectId } from '@/lib/dashboard/projectsContext'

/**
 * Mounted once in `DashboardLayout`, so the project list survives navigating
 * between Overview, Projects and a project workspace within one session.
 *
 * Genuinely empty until the user creates something — no seeded example
 * project. `/dashboard/projects` starts on its real empty state.
 */
export default function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([])

  // Ids come from a monotonic counter, never from `projects.length`: deleting
  // project-002 and creating another would otherwise mint a second
  // "project-002" and give the grid two identical React keys.
  const issued = useRef(0)

  const createProject = useCallback((name) => {
    issued.current += 1

    const created = {
      id: nextProjectId(issued.current - 1),
      name,
      createdAt: Date.now(),
      // Stage state lives on the project and starts false. Nothing flips these
      // yet — the Upload / Rendering / BoQ stages are still placeholders — but
      // the card reads them rather than assuming, so the moment a stage writes
      // its result the library reflects it with no UI change.
      has3DRender: false,
      hasBoQ: false,
    }

    setProjects((prev) => [created, ...prev])
    return created
  }, [])

  const deleteProject = useCallback((id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const getProject = useCallback(
    (id) => projects.find((p) => p.id === id),
    [projects],
  )

  const value = useMemo(
    () => ({ projects, createProject, deleteProject, getProject }),
    [projects, createProject, deleteProject, getProject],
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

