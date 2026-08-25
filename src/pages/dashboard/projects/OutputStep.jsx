import { useParams } from 'react-router-dom'
import OutputStage from '@/components/dashboard/projects/workflow/step-4/OutputStage'
import StepPlaceholder from '@/components/dashboard/projects/workflow/shared/StepPlaceholder'

/** /dashboard/projects/:projectId/output — Step 4 of the project workflow. */
export default function OutputStep() {
  const { projectId } = useParams()

  return (
    <StepPlaceholder>
      <OutputStage projectId={projectId} />
    </StepPlaceholder>
  )
}

