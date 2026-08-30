import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import BoQAssistantGateway from '@/components/dashboard/projects/workflow/step-3/BoQAssistantGateway'
import Modal from '@/components/ui/Modal'
import PageLoader from '@/components/ui/PageLoader'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { approvedResult } from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import { isBoqApproved } from '@/lib/dashboard/workflow/step-3/boqAssistantSelectors'
import {
  useBoqAssistant,
  useDesignAssistant,
  useFloorPlanSource,
  useProjects,
  useStep1Data,
  useStep2Data,
  useStep3Data,
} from '@/lib/dashboard/projects/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { boqAssistantPath, projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 3 — Kraios BoQ Stage.
 *
 * Serves as the central gateway to Kraios BoQ Assistant for automated
 * quantity takeoff, material scheduling, and cost estimation.
 */
export default function BoQStage({ projectId }) {
  const step1 = useStep1Data(projectId)
  const step2 = useStep2Data(projectId)
  const step3 = useStep3Data(projectId)

  const source = useFloorPlanSource(projectId)
  const [assistant] = useDesignAssistant(projectId)
  const [boqState] = useBoqAssistant(projectId)
  const { skipBoq } = useProjects()

  const navigate = useNavigate()
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [skipping, setSkipping] = useState(false)
  const [skipModalOpen, setSkipModalOpen] = useState(false)

  const approvedRender = approvedResult(assistant)
  const boqApproved = isBoqApproved(boqState)
  const assistantPath = boqAssistantPath(projectId)
  const outputPath = projectStagePath(projectId, 'output')
  const loading = step1.isLoading || step2.isLoading || step3.isLoading

  /**
   * Skipping is a real transition, not a link.
   *
   * `POST /step-3/skip/` clears any selected BOQ, records `boq_skipped_at` and
   * makes Step 4 the current step — so Output is reached because the backend
   * agrees the stage was skipped, not because the browser navigated past it.
   * The gateway asks for confirmation before calling this.
   */
  const handleSkipConfirm = useCallback(async () => {
    if (skipping) return

    setSkipping(true)
    try {
      await skipBoq(projectId)
      setSkipModalOpen(false)
      showSuccessToast('BoQ skipped.', { id: 'boq-skipped' })
      navigate(outputPath)
    } catch (thrown) {
      showErrorToast(thrown?.message || 'The BoQ stage could not be skipped.', {
        id: 'boq-skip-failed',
      })
    } finally {
      setSkipping(false)
    }
  }, [navigate, outputPath, projectId, skipBoq, skipping])

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
        {loading ? (
          <PageLoader variant="inline" label="Loading BoQ Stage" className="min-h-56" />
        ) : (
          <div data-stage-reveal>
            <BoQAssistantGateway
              source={source}
              approvedRender={approvedRender}
              isBoqApproved={boqApproved}
              to={assistantPath}
              outputPath={outputPath}
              onSkipRequest={() => setSkipModalOpen(true)}
              skipping={skipping}
            />
          </div>
        )}
      </div>

      {/* Skipping clears any selected BoQ on the backend, so it is confirmed
          first — a modal, because a toast cannot ask a question. */}
      <Modal
        open={skipModalOpen}
        onClose={() => {
          if (!skipping) setSkipModalOpen(false)
        }}
        title="SKIP THE BOQ?"
        labelledBy="skip-boq-title"
      >
        <p className="mt-4.5 sm:mt-5 mb-7 sm:mb-8 text-[0.9375rem] leading-[1.65] text-[var(--tone-muted)]">
          The BoQ stage is optional. Skipping takes you to Output and clears any
          Bill of Quantities currently selected for this project. You can come
          back and generate one at any time.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={() => setSkipModalOpen(false)}
            className="label-ui min-h-11 cursor-pointer px-1 text-[var(--tone-muted)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]"
          >
            Cancel
          </button>

          <PrimaryButton
            type="button"
            onClick={handleSkipConfirm}
            loading={skipping}
            loadingLabel="Skipping BoQ"
            withArrow={false}
            align="center"
            className="w-full sm:w-auto"
          >
            Skip to Output
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  )
}


