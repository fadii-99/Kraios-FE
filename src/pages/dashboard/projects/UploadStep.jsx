import { useParams } from 'react-router-dom'
import FloorPlanInputStage from '@/components/dashboard/projects/workflow/step-1/FloorPlanInputStage'
import StepPlaceholder from '@/components/dashboard/projects/workflow/shared/StepPlaceholder'

/** /dashboard/projects/:projectId/upload — Step 1 of the project workflow. */
export default function UploadStep() {
  const { projectId } = useParams()

  return (
    <StepPlaceholder>
      <FloorPlanInputStage projectId={projectId} />
    </StepPlaceholder>
  )
}
