import { useParams } from 'react-router-dom'
import BoQStage from '@/components/dashboard/projects/workflow/step-3/BoQStage'
import StepPlaceholder from '@/components/dashboard/projects/workflow/shared/StepPlaceholder'

/** /dashboard/projects/:projectId/boq — Step 3 of the project workflow. */
export default function BoQStep() {
  const { projectId } = useParams()

  return (
    <StepPlaceholder>
      <BoQStage projectId={projectId} />
    </StepPlaceholder>
  )
}
