import { createContext, useContext } from 'react'

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

/** Sequential, human-readable ids: project-001, project-002, … */
export function nextProjectId(count) {
  return `project-${String(count + 1).padStart(3, '0')}`
}
