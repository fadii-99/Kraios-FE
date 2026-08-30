import { useParams } from 'react-router-dom'
import FloorPlanInputStage from '@/components/dashboard/projects/workflow/step-1/FloorPlanInputStage'
import StepPlaceholder from '@/components/dashboard/projects/workflow/shared/StepPlaceholder'
import { FLOOR_PLAN_MODES } from '@/lib/dashboard/workflow/step-1/floorPlanSource'

/** /dashboard/projects/:projectId/generate — Step 1 Generate mode of the project workflow. */
export default function GenerateStep() {
  const { projectId } = useParams()

  return (
    <StepPlaceholder>
      <FloorPlanInputStage projectId={projectId} defaultMode={FLOOR_PLAN_MODES.generate} />
    </StepPlaceholder>
  )
}
