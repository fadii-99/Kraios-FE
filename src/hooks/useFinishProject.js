import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { canFinishProject } from '@/lib/dashboard/projects/projectShape'
import { useProject, useProjects } from '@/lib/dashboard/projects/projectsContext'
import { HISTORY_FLOOR_STATE } from '@/hooks/useHistoryFloor'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'

/** Why Finish is refused, in the words the user sees. */
export const FINISH_BLOCKED_MESSAGE =
  'Approve your 2D plan and 3D design — and approve or skip the BoQ — before finishing.'

/**
 * Finishing a project, in ONE place.
 *
 * `POST /finish/` succeeds only when a 2D plan and a 3D render are approved and
 * the BoQ is either approved or explicitly skipped. Those are the backend's
 * rules, so a Finish control asks the project whether they are met and explains
 * itself instead of firing a request it knows will 400.
 *
 * Two controls now offer it — the workflow's bottom navigation and the Output
 * stage's own action — and they must not be able to disagree about when it is
 * allowed, what it says when it is not, or where it goes afterwards. So the
 * gate, the request, the three toasts and the navigation live here, and each
 * control is only a button.
 */
export function useFinishProject(projectId) {
  const navigate = useNavigate()
  const { finishProject } = useProjects()
  const project = useProject(projectId)
  const [finishing, setFinishing] = useState(false)

  const blockedMessage = canFinishProject(project) ? null : FINISH_BLOCKED_MESSAGE

  const finish = useCallback(async () => {
    if (finishing) return

    if (blockedMessage) {
      showInfoToast(blockedMessage, { id: 'workflow-finish-gate' })
      return
    }

    setFinishing(true)
    try {
      await finishProject(projectId)
      showSuccessToast('Project finished.', { id: 'project-finished' })
      // Replace and floor: a finished project's Output stage is behind us, and
      // Back must not walk into it or into any earlier stage of it.
      navigate('/dashboard/projects', { replace: true, state: HISTORY_FLOOR_STATE })
    } catch (thrown) {
      showErrorToast(thrown?.message || 'This project could not be finished yet.', {
        id: 'project-finish-failed',
      })
    } finally {
      setFinishing(false)
    }
  }, [blockedMessage, finishProject, finishing, navigate, projectId])

  return {
    finish,
    finishing,
    blockedMessage,
    isFinished: Boolean(project?.isFinished),
  }
}
