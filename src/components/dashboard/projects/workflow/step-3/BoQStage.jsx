import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import BoQAssistantGateway from '@/components/dashboard/projects/workflow/step-3/BoQAssistantGateway'
import { approvedResult } from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import { isBoqApproved } from '@/lib/dashboard/workflow/step-3/boqAssistantSelectors'
import {
  useBoqAssistant,
  useDesignAssistant,
  useFloorPlanSource,
} from '@/lib/dashboard/projects/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { boqAssistantPath, projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 3 — Kraios BoQ Stage.
 *
 * Serves as the central gateway to Kraios BoQ Assistant for automated
 * quantity takeoff, material scheduling, and cost estimation.
 */
export default function BoQStage({ projectId }) {
  const [source] = useFloorPlanSource(projectId)
  const [assistant] = useDesignAssistant(projectId)
  const [boqState] = useBoqAssistant(projectId)

  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const approvedRender = approvedResult(assistant)
  const boqApproved = isBoqApproved(boqState)
  const assistantPath = boqAssistantPath(projectId)
  const outputPath = projectStagePath(projectId, 'output')

  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-stage-reveal]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        {
          opacity: 1,
          y: 0,
          duration: DASHBOARD_MOTION.duration,
          ease: DASHBOARD_MOTION.ease,
          stagger: DASHBOARD_MOTION.stagger,
        },
      )
    },
    { scope, dependencies: [reduced, approvedRender?.id ?? 'none', boqApproved] },
  )

  return (
    <div
      ref={scope}
      className="flex w-full flex-1 flex-col justify-center py-2 sm:py-3.5"
    >
      <div className="mx-auto w-full max-w-[64rem] lg:max-w-[68rem] pt-2 sm:pt-3 pb-4 sm:pb-8">
        <div data-stage-reveal>

          <BoQAssistantGateway
            source={source}
            approvedRender={approvedRender}
            isBoqApproved={boqApproved}
            to={assistantPath}
            outputPath={outputPath}
          />
        </div>
      </div>
    </div>
  )
}


