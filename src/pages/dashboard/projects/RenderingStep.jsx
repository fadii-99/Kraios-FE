import { useParams } from 'react-router-dom'
import RenderingStage from '@/components/dashboard/projects/workflow/step-2/RenderingStage'
import StepPlaceholder from '@/components/dashboard/projects/workflow/shared/StepPlaceholder'

/** /dashboard/projects/:projectId/rendering — Step 2 of the project workflow. */
export default function RenderingStep() {
  const { projectId } = useParams()

  return (
    <StepPlaceholder>
      <RenderingStage projectId={projectId} />
    </StepPlaceholder>
  )
}
