import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import PageLoader from '@/components/ui/PageLoader'
import {
  RESOURCE_STATUS,
  useProjects,
} from '@/lib/dashboard/projects/projectsContext'
import { showErrorToast } from '@/lib/toast'

/**
 * The project-existence guard for every project-scoped route.
 *
 * Without it, `/dashboard/projects/anything-at-all/upload` mounted the whole
 * workflow against an id the backend has never heard of: every stage would then
 * fire its own request, get a 404, and show four separate failures for one
 * missing project.
 *
 * ONE guard, at the route boundary, is why the stages themselves stay free of
 * `if (!project)`. It wraps both shapes of project route:
 *
 *   - the four-stage workspace, where it is composed into `ProjectWorkspace`,
 *   - the four assistant routes, which are siblings of the workspace and would
 *     otherwise each need their own copy.
 *
 * It asks the store to load the project, which is a cache read when the library
 * has already listed it and a single `GET /projects/{id}/` when the user opened
 * the address directly. That is what makes a refresh ON a project workspace
 * work now: the project is fetched again, not lost with the tab.
 *
 * The three outcomes are read from the store's own request state rather than
 * mirrored into local state — one source of truth for "is this project real",
 * and no setState inside an effect to keep a copy of it in step.
 *
 * A missing project is not an error worth a designed page — the library IS the
 * answer to "which project?" — so this redirects there, replacing the bad entry
 * so Back does not walk into it again.
 */
export default function RequireProject({ children }) {
  const { projectId } = useParams()
  const { getProject, loadProject, projectEntry } = useProjects()

  const project = getProject(projectId)
  const entry = projectEntry(projectId)
  const missing = entry.status === RESOURCE_STATUS.error && !project

  useEffect(() => {
    if (!projectId) return

    loadProject(projectId).catch(() => {
      // The failure is on the cache entry above, which is what decides the
      // redirect; the toast below announces it once.
    })
  }, [loadProject, projectId])

  // One toast per rejected id, not one per render of a failing route.
  const announced = useRef(null)

  useEffect(() => {
    if (!missing || announced.current === projectId) return

    announced.current = projectId
    showErrorToast(
      entry.error?.status === 404
        ? 'That project could not be found.'
        : entry.error?.message || 'That project could not be opened.',
      { id: 'project-not-found' },
    )
  }, [entry.error, missing, projectId])

  if (!projectId || missing) {
    return <Navigate to="/dashboard/projects" replace />
  }

  // Held rather than rendered: mounting a stage against a project that has not
  // arrived would start its own requests with nothing to scope them to.
  if (!project) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <PageLoader variant="inline" label="Loading Project" />
      </div>
    )
  }

  return children
}
