import { Navigate, useParams } from 'react-router-dom'

import { useProjects } from '@/lib/dashboard/projects/projectsContext'

/**
 * The project-existence guard for every project-scoped route.
 *
 * Without it, `/dashboard/projects/anything-at-all/upload` mounted the whole
 * workflow: the stage hooks return a default state for an id they have never
 * seen — deliberately, so a real project does not have to be null-checked in
 * five places — which meant a typed or stale URL produced a working-looking
 * workspace attached to no project. Uploading a plan there wrote Step 1 state
 * under a project id that does not exist and never appears in the library.
 *
 * ONE guard, at the route boundary, is why the stages themselves stay free of
 * `if (!project)`. It wraps both shapes of project route:
 *
 *   - the four-stage workspace, where it is composed into `ProjectWorkspace`,
 *   - the two assistant routes, which are siblings of the workspace and would
 *     otherwise each need their own copy.
 *
 * A missing project is not an error worth a designed page — the library IS the
 * answer to "which project?" — so this redirects there, replacing the bad entry
 * so Back does not walk into it again.
 *
 * Note the session-memory caveat: projects live in `ProjectsProvider` and do
 * not survive a refresh, so refreshing ON a project workspace lands here and
 * returns to an empty library. That is the honest consequence of having no
 * persistence yet, not a bug in this guard.
 */
export default function RequireProject({ children }) {
  const { projectId } = useParams()
  const { getProject } = useProjects()

  if (!projectId || !getProject(projectId)) {
    return <Navigate to="/dashboard/projects" replace />
  }

  return children
}
