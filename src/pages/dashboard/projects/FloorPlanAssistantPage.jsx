import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import AssistantComposer from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantComposer'
import FloorPlanAssistantConversation from '@/components/dashboard/projects/workflow/step-1/assistant/FloorPlanAssistantConversation'
import FloorPlanAssistantHeader from '@/components/dashboard/projects/workflow/step-1/assistant/FloorPlanAssistantHeader'
import KraiosDesignCanvas from '@/components/dashboard/projects/workflow/step-2/canvas/KraiosDesignCanvas'
import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import PageLoader from '@/components/ui/PageLoader'
import { dataUrlToFile } from '@/lib/api/files'
import { jobIdFromResponse, waitForJob } from '@/lib/api/jobs'
import { jobProgressText } from '@/lib/dashboard/workflow/apiShapes'
import { editFloorPlan, generateFloorPlan } from '@/lib/api/projects'
import {
  isApproved,
  isGenerating,
  latestResult,
  refinementBase,
} from '@/lib/dashboard/workflow/step-1/floorPlanAssistantSelectors'
import { FLOOR_PLAN_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantConfig'
import {
  useFloorPlanAssistant,
  useProjects,
  useStep1Data,
} from '@/lib/dashboard/projects/projectsContext'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast, showInfoToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useResumedJob } from '@/hooks/useResumedJob'

const GENERATION_FAILED_MESSAGE =
  'That floor plan could not be generated. Try again in a moment.'

/**
 * 2D Floor Plan Assistant Page — /dashboard/projects/:projectId/upload/assistant
 *
 * Every turn here is a real backend round trip:
 *
 *   1. `POST /step-1/generate/` (or `/edit/` with the canvas mask) answers 202
 *      with a version and a nested job.
 *   2. The job is polled to completion, its progress written onto the pending
 *      block so the wait is legible.
 *   3. The step is refetched, and the transcript is REPLACED with what the
 *      server holds. The optimistic pending block only ever covers the gap
 *      between sending and that refetch.
 *
 * Approval is `POST /versions/{id}/approve/`, which is what makes the plan the
 * project's `selected_floor_plan` and moves Step 1 to complete. There is no
 * local approval flag, and no un-approve: the way to change the approved plan
 * is to approve a different version.
 */
export default function FloorPlanAssistantPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const step1 = useStep1Data(projectId)
  const reloadStep1 = step1.reload
  const { approveFloorPlan } = useProjects()
  const [state, dispatch] = useFloorPlanAssistant(projectId)

  const [prompt, setPrompt] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [approving, setApproving] = useState(false)

  // Canvas Mode and Loader Transition states
  const [isOpeningCanvas, setIsOpeningCanvas] = useState(false)
  const [canvasActive, setCanvasActive] = useState(false)
  const [canvasTargetResult, setCanvasTargetResult] = useState(null)
  const canvasTimeoutRef = useRef(null)

  const composerRef = useRef(null)
  const inFlightRef = useRef(false)
  const abortRef = useRef(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    return () => {
      activeRef.current = false
      if (canvasTimeoutRef.current) clearTimeout(canvasTimeoutRef.current)
      // Leaving the workspace stops the poll. The job keeps running on the
      // server, and reopening the page picks it back up from the version list.
      abortRef.current?.abort()
    }
  }, [])

  const busy = isGenerating(state)
  const base = refinementBase(state)
  const activeApproved = isApproved(state)

  const backTo = location.pathname.includes('/generate')
    ? projectStagePath(projectId, 'generate')
    : projectStagePath(projectId, 'upload')

  /**
   * One run, whatever started it — a typed instruction, an opener, a retry or a
   * canvas edit. They differ in the request they send and in nothing else.
   */
  const runGeneration = useCallback(
    async ({ text, pendingText, canvasSnapshotUrl, maskDataUrl, originalVersionId }) => {
      const instruction = text?.trim()
      if (!instruction || inFlightRef.current) return

      inFlightRef.current = true
      const controller = new AbortController()
      abortRef.current = controller

      dispatch({
        type: 'startGeneration',
        prompt: instruction,
        pendingText,
        canvasSnapshotUrl,
      })

      try {
        const mask = maskDataUrl ? dataUrlToFile(maskDataUrl, 'mask.png') : null

        // A mask plus a version to apply it to is an edit; anything else is a
        // generation, optionally anchored to the version being refined.
        const queued =
          mask && originalVersionId
            ? await editFloorPlan(projectId, {
                originalVersionId,
                instruction,
                mask,
              })
            : await generateFloorPlan(projectId, {
                prompt: instruction,
                parentVersionId: originalVersionId ?? null,
              })

        const jobId = jobIdFromResponse(queued)

        if (jobId) {
          await waitForJob(jobId, {
            signal: controller.signal,
            onProgress: (job) => {
              if (!activeRef.current) return
              dispatch({
                type: 'generationProgress',
                text: jobProgressText(job, FLOOR_PLAN_ASSISTANT_COPY.generating),
              })
            },
          })
        }

        if (!activeRef.current) return

        // The server is the record of what happened; the transcript is replaced
        // with it rather than patched with a guess at the result.
        await reloadStep1()
      } catch (thrown) {
        if (!activeRef.current || thrown?.name === 'AbortError') return

        dispatch({
          type: 'generationFailed',
          message: thrown?.message || GENERATION_FAILED_MESSAGE,
          prompt: instruction,
          pendingText,
        })
      } finally {
        inFlightRef.current = false
        abortRef.current = null
      }
    },
    [dispatch, projectId, reloadStep1],
  )

  const handleSubmit = useCallback(() => {
    const instruction = prompt.trim()
    if (!instruction) return

    setPrompt('')
    // A bare instruction refines whatever the transcript says is being edited.
    runGeneration({ text: instruction, originalVersionId: base?.id ?? null })
  }, [base, prompt, runGeneration])

  const handleQuickPrompt = useCallback(
    (text) => {
      runGeneration({ text })
    },
    [runGeneration],
  )

  const handleRetry = useCallback(
    (retry) => {
      if (!retry?.prompt) return
      runGeneration({
        text: retry.prompt,
        pendingText: retry.pendingText ?? undefined,
      })
    },
    [runGeneration],
  )

  const handleEdit = useCallback(
    (result) => {
      dispatch({ type: 'editResult', resultId: result.id })
      setCanvasTargetResult(result)
      setIsOpeningCanvas(true)

      if (canvasTimeoutRef.current) clearTimeout(canvasTimeoutRef.current)
      canvasTimeoutRef.current = setTimeout(() => {
        setIsOpeningCanvas(false)
        setCanvasActive(true)
      }, 1800)
    },
    [dispatch],
  )

  const handleCanvasRegenerate = useCallback(
    (promptText, targetResult, canvasSnapshotUrl, maskSnapshotUrl) => {
      setCanvasActive(false)
      runGeneration({
        text: promptText,
        canvasSnapshotUrl,
        maskDataUrl: maskSnapshotUrl,
        originalVersionId: targetResult?.id ?? base?.id ?? null,
      })
    },
    [base, runGeneration],
  )

  const handleSelect = useCallback(
    (result) => {
      dispatch({ type: 'editResult', resultId: result.id })
    },
    [dispatch],
  )

  /**
   * Approval is a request, and it is one-way.
   *
   * `POST /approve/` sets `selected_floor_plan` and completes Step 1. There is
   * no endpoint that un-approves, so the control no longer toggles: approving
   * the plan that is already approved simply returns to the stage rather than
   * pretending to clear an approval the backend still holds.
   */
  const handleApprove = useCallback(
    async (targetResult) => {
      const active = targetResult || latestResult(state)
      if (!active || approving) return

      if (state.approvedResultId === active.id) {
        showInfoToast('This floor plan is already approved.', { id: 'plan-already-approved' })
        navigate(backTo)
        return
      }

      setApproving(true)
      try {
        await approveFloorPlan(projectId, active.id)
        if (!activeRef.current) return
        navigate(backTo)
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That floor plan could not be approved.', {
          id: 'plan-approve-failed',
        })
      } finally {
        if (activeRef.current) setApproving(false)
      }
    },
    [approveFloorPlan, approving, backTo, navigate, projectId, state],
  )

  /**
   * A version the backend was already working on when this page opened.
   *
   * Generation runs on the server, so a refresh or a walk to another stage
   * does not stop it — but nothing would be watching it either, and the
   * restored pending block would never resolve. The version history carries
   * the job, so the watch is simply picked back up, and the step is
   * refetched when it settles.
   */
  const resumedJobId = step1.data?.hydrated?.pending?.job?.id ?? null

  useResumedJob(resumedJobId, {
    onProgress: (job) => {
      if (!activeRef.current) return
      dispatch({ type: 'generationProgress', text: jobProgressText(job, FLOOR_PLAN_ASSISTANT_COPY.generating) })
    },
    onSettled: () => {
      if (!activeRef.current) return
      reloadStep1().catch(() => {
        // The transcript keeps what it has; the stage reports its own
        // failure state on the next read.
      })
    },
  })

  const pageContainerRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        '[data-assistant-header]',
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45 },
      )
        .fromTo(
          '[data-assistant-body]',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 },
          '-=0.25',
        )
        .fromTo(
          '[data-assistant-composer]',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          '-=0.35',
        )
    },
    { scope: pageContainerRef, dependencies: [reduced] },
  )

  if (canvasActive) {
    return (
      <KraiosDesignCanvas
        result={canvasTargetResult || base}
        onBack={() => setCanvasActive(false)}
        onRegenerate={handleCanvasRegenerate}
        title="Kraios 2D Floor Plan Canvas"
        subtitle="Mark regions & annotate spatial adjustments directly on the 2D floor plan"
        prompt="Refine 2D floor plan based on marked canvas annotations."
        helpText="Click & drag to draw adjustments on the 2D plan, then click"
      />
    )
  }

  if (isOpeningCanvas) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white">
        <PageLoader
          label="Opening Kraios Design Canvas..."
          variant="inline"
          className="my-auto"
        />
      </div>
    )
  }

  // The transcript is server state, so the workspace holds until it has been
  // read once. Without this the empty state would flash for a project that has
  // a conversation the moment it is opened.
  if (!state.hydrated && step1.isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white">
        <PageLoader label="Loading Assistant" variant="inline" className="my-auto" />
      </div>
    )
  }

  return (
    <div ref={pageContainerRef} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div data-assistant-header className="relative z-40 shrink-0">
        <FloorPlanAssistantHeader
          backTo={backTo}
          approved={activeApproved}
        />
      </div>

      <div data-assistant-body className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <FloorPlanAssistantConversation
          state={state}
          busy={busy || approving}
          approvedResultId={state.approvedResultId}
          baseResultId={base?.id ?? null}
          onQuickPrompt={handleQuickPrompt}
          onExpand={setExpanded}
          onEdit={handleEdit}
          onSelect={handleSelect}
          onApprove={handleApprove}
          onRetry={handleRetry}
        />
      </div>

      <div data-assistant-composer className="shrink-0">
        <AssistantComposer
          ref={composerRef}
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          busy={busy}
          placeholder="Describe changes to the 2D floor plan..."
        />
      </div>

      {/* Full Page View Modal */}
      <FloorPlanFullscreenModal
        source={
          expanded
            ? {
                imageUrl: expanded.imageUrl,
                name: '2D Architectural Floor Plan',
                extension: (expanded.assetName?.split('.').pop() || 'PNG').toUpperCase(),
              }
            : null
        }
        open={Boolean(expanded)}
        onClose={() => setExpanded(null)}
      />
    </div>
  )
}

