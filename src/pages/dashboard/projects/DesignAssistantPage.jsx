import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import AssistantComposer from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantComposer'
import AssistantConversation from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantConversation'
import AssistantHeader from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantHeader'
import KraiosDesignCanvas from '@/components/dashboard/projects/workflow/step-2/canvas/KraiosDesignCanvas'
import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import PageLoader from '@/components/ui/PageLoader'
import { dataUrlToFile } from '@/lib/api/files'
import { jobIdFromResponse, waitForJob } from '@/lib/api/jobs'
import {
  deleteConversationMessage,
  editThreeD,
  generateThreeD,
  generateThreeDAngle,
} from '@/lib/api/projects'
import { jobProgressText } from '@/lib/dashboard/workflow/apiShapes'
import {
  ASSISTANT_COPY,
  renderStyleById,
  viewAngleById,
} from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { renderStyleToApi, viewAngleToApi } from '@/lib/dashboard/workflow/step-2/designAdapters'
import {
  generationErrorMessage,
  isApproved,
  isGenerating,
  latestResult,
  refinementBase,
} from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import {
  useDesignAssistant,
  useFloorPlanSource,
  useProjects,
  useStep1Data,
  useStep2Data,
} from '@/lib/dashboard/projects/projectsContext'
import { CACHE_KEYS } from '@/lib/dashboard/projects/projectShape'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useResumedJob } from '@/hooks/useResumedJob'

/**
 * Design Assistant — /dashboard/projects/:projectId/rendering/assistant
 *
 * The same three-beat cycle as the other assistants — queue, watch the job,
 * refetch — over Step 2's three endpoints:
 *
 *   - `POST /step-2/generate/` for an instruction, carrying the chosen render
 *     style and the approved 2D plan,
 *   - `POST /step-2/edit/` for a canvas edit, carrying the annotation mask,
 *   - `POST /step-2/angle/` for a view angle, which is a REAL request producing
 *     a NEW version with `source: 'ANGLE'` — never a transform of the image on
 *     screen.
 *
 * Step 1's history is loaded too, because the header's 2D plan dropdown shows
 * the plan this render is built from and the generate request names it.
 */
export default function DesignAssistantPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  useStep1Data(projectId)
  const step2 = useStep2Data(projectId)
  const reloadStep2 = step2.reload

  const source = useFloorPlanSource(projectId)
  const { approveThreeD, invalidateStep, refreshProject } = useProjects()
  const [state, dispatch] = useDesignAssistant(projectId)

  const [prompt, setPrompt] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [approving, setApproving] = useState(false)
  const [deletingTurnId, setDeletingTurnId] = useState(null)

  // Canvas Mode and Loader Transition states
  const [isOpeningCanvas, setIsOpeningCanvas] = useState(false)
  const [canvasActive, setCanvasActive] = useState(false)
  const [canvasTargetResult, setCanvasTargetResult] = useState(null)
  const canvasTimeoutRef = useRef(null)

  const composerRef = useRef(null)
  const abortRef = useRef(null)
  // Belt and braces against a double-fire (a fast second Enter, an opener tap
  // that lands before the state update paints).
  const inFlightRef = useRef(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    return () => {
      activeRef.current = false
      if (canvasTimeoutRef.current) clearTimeout(canvasTimeoutRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const busy = isGenerating(state)

  /**
   * The render the next instruction will change — the selected one if "Edit
   * image" pointed at one, otherwise the most recent. Both the composer and the
   * transcript are handed the same answer so they cannot disagree about what is
   * being refined.
   */
  const base = refinementBase(state)

  /**
   * One generation, whatever started it — a typed instruction, an opener, a
   * canvas edit or a view-angle choice. They differ in the request they send
   * and in nothing else: same conversation turns, same job watch, same refetch.
   */
  const runGeneration = useCallback(
    async ({ text, viewAngleId, pendingText, canvasSnapshotUrl, maskDataUrl, angleOf }) => {
      const instruction = text?.trim()
      if (!instruction || inFlightRef.current) return

      // Captured before the first await: the request must carry the settings as
      // they were when the user pressed send.
      const renderStyleId = state.renderStyleId
      const angleId = viewAngleId ?? state.viewAngleId
      const baseResult = base

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
        let queued

        if (angleOf) {
          queued = await generateThreeDAngle(projectId, {
            originalVersionId: angleOf,
            angle: viewAngleToApi(angleId),
          })
        } else if (mask && baseResult?.id) {
          queued = await editThreeD(projectId, {
            originalVersionId: baseResult.id,
            instruction,
            mask,
          })
        } else {
          queued = await generateThreeD(projectId, {
            prompt: instruction,
            // Optional by contract; naming it makes the render's provenance
            // explicit rather than leaving it to the backend's default.
            floorPlanVersionId: source?.versionId ?? null,
            renderStyle: renderStyleToApi(renderStyleId),
          })
        }

        const jobId = jobIdFromResponse(queued)

        if (jobId) {
          await waitForJob(jobId, {
            signal: controller.signal,
            onProgress: (job) => {
              if (!activeRef.current) return
              dispatch({
                type: 'generationProgress',
                text: jobProgressText(job, pendingText || ASSISTANT_COPY.generating),
              })
            },
          })
        }

        if (!activeRef.current) return
        await reloadStep2()
      } catch (thrown) {
        if (!activeRef.current || thrown?.name === 'AbortError') return

        dispatch({
          type: 'generationFailed',
          message: generationErrorMessage(thrown),
          prompt: instruction,
          viewAngleId: angleId,
          pendingText,
        })
      } finally {
        inFlightRef.current = false
        abortRef.current = null
      }
    },
    [base, dispatch, projectId, reloadStep2, source, state.renderStyleId, state.viewAngleId],
  )

  const handleSubmit = useCallback(() => {
    const instruction = prompt.trim()
    if (!instruction) return

    setPrompt('')
    runGeneration({ text: instruction })
  }, [prompt, runGeneration])

  const handleQuickPrompt = useCallback(
    (text) => {
      runGeneration({ text })
    },
    [runGeneration],
  )

  /**
   * Re-send a failed instruction exactly as it was sent — same words, same view
   * angle, same pending line. The notice carries them, so nothing is retyped
   * and nothing is guessed.
   */
  /**
   * Deleting one whole turn.
   *
   * `DELETE /projects/{id}/conversations/messages/{messageId}/` removes the
   * user message AND the version, job and files it produced — the backend
   * deletes the block, so nothing here deletes an image separately. The id is
   * the prompt's own `serverMessageId`, which only a hydrated (server-backed)
   * message carries; an optimistic local turn is still pending, and a pending
   * turn offers no delete control.
   *
   * Afterwards the step is refetched and the project reloaded, because deleting
   * the selected version clears that selection on the backend and the header's
   * approval state has to follow. Step 4's bundle is invalidated for the same
   * reason: a deliverable just stopped existing.
   */
  const handleDeleteTurn = useCallback(
    async (turn) => {
      const message = turn?.prompt
      const messageId = message?.serverMessageId
      if (!messageId || deletingTurnId) return

      setDeletingTurnId(message.id)
      try {
        await deleteConversationMessage(projectId, messageId)
        if (!activeRef.current) return

        invalidateStep(CACHE_KEYS.output(projectId))
        await Promise.all([reloadStep2(), refreshProject(projectId)])
        if (!activeRef.current) return

        showSuccessToast('Request deleted.', { id: 'design-turn-deleted' })
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That request could not be deleted.', {
          id: 'design-turn-delete-failed',
        })
      } finally {
        if (activeRef.current) setDeletingTurnId(null)
      }
    },
    [deletingTurnId, invalidateStep, projectId, refreshProject, reloadStep2],
  )

  const handleRetry = useCallback(
    (retry) => {
      if (!retry?.prompt) return

      runGeneration({
        text: retry.prompt,
        viewAngleId: retry.viewAngleId ?? undefined,
        pendingText: retry.pendingText ?? undefined,
      })
    },
    [runGeneration],
  )

  /**
   * A view angle is a REAL request, not a setting: `POST /step-2/angle/` makes
   * a new version with `source: 'ANGLE'` from a completed one, and the original
   * is untouched. It needs a version to convert, so an angle chosen before
   * anything has been rendered explains itself rather than failing.
   *
   * The header is moved to the chosen angle first so the control reflects the
   * choice while the request is in flight; like every new version, the result
   * lands UNAPPROVED.
   */
  const handleViewAngleSelect = useCallback(
    (angleOrId) => {
      const angle = viewAngleById(typeof angleOrId === 'string' ? angleOrId : angleOrId.id)
      if (!angle) return

      const target = base ?? latestResult(state)
      if (!target) {
        showInfoToast('Generate a 3D model first, then choose a view angle.', {
          id: 'angle-needs-render',
        })
        return
      }

      dispatch({ type: 'setViewAngle', viewAngleId: angle.id })
      runGeneration({
        text: angle.prompt,
        viewAngleId: angle.id,
        angleOf: target.id,
        pendingText: ASSISTANT_COPY.generatingAngle.replace('{angle}', angle.label),
      })
    },
    [base, dispatch, runGeneration, state],
  )

  /**
   * Opening Kraios Design Canvas:
   * Sets the target render, triggers the brand PageLoader with
   * "Opening Kraios Design Canvas..." for ~2.2s, then renders the full-featured canvas.
   */
  const handleEdit = useCallback(
    (result) => {
      dispatch({ type: 'editResult', resultId: result.id })
      setCanvasTargetResult(result)
      setIsOpeningCanvas(true)

      if (canvasTimeoutRef.current) clearTimeout(canvasTimeoutRef.current)
      canvasTimeoutRef.current = setTimeout(() => {
        setIsOpeningCanvas(false)
        setCanvasActive(true)
      }, 2200)
    },
    [dispatch],
  )

  const handleCanvasRegenerate = useCallback(
    (promptText, targetResult, canvasSnapshotUrl, maskSnapshotUrl) => {
      setCanvasActive(false)
      runGeneration({
        text: promptText,
        viewAngleId: targetResult?.viewAngleId,
        canvasSnapshotUrl,
        maskDataUrl: maskSnapshotUrl,
      })
    },
    [runGeneration],
  )

  /**
   * Clicking a render makes it the one the next instruction changes — the same
   * pointer "Edit image" sets, and deliberately the same state: two ways to say
   * "this one" must not become two competing notions of which one.
   */
  const handleSelect = useCallback(
    (result) => {
      dispatch({ type: 'editResult', resultId: result.id })
    },
    [dispatch],
  )

  /**
   * Approval is `POST /step-2/versions/{id}/approve/`: it sets
   * `selected_three_d` and completes Step 2. There is no un-approve endpoint,
   * so approving the render that is already approved returns to the stage
   * instead of pretending to clear a record the backend still holds.
   */
  const handleApprove = useCallback(
    async (result) => {
      if (!result || approving) return

      if (state.approvedResultId === result.id) {
        showInfoToast('This 3D design is already approved.', { id: 'render-already-approved' })
        navigate(projectStagePath(projectId, 'rendering'))
        return
      }

      setApproving(true)
      try {
        await approveThreeD(projectId, result.id)
        if (!activeRef.current) return
        navigate(projectStagePath(projectId, 'rendering'))
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That 3D design could not be approved.', {
          id: 'render-approve-failed',
        })
      } finally {
        if (activeRef.current) setApproving(false)
      }
    },
    [approveThreeD, approving, navigate, projectId, state.approvedResultId],
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
  const resumedJobId = step2.data?.hydrated?.pending?.job?.id ?? null

  useResumedJob(resumedJobId, {
    onProgress: (job) => {
      if (!activeRef.current) return
      dispatch({ type: 'generationProgress', text: jobProgressText(job, ASSISTANT_COPY.generating) })
    },
    onSettled: () => {
      if (!activeRef.current) return
      reloadStep2().catch(() => {
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

  if (!state.hydrated && step2.isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white">
        <PageLoader label="Loading Assistant" variant="inline" className="my-auto" />
      </div>
    )
  }

  return (
    <div ref={pageContainerRef} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div data-assistant-header className="relative z-40 shrink-0">
        <AssistantHeader
          backTo={projectStagePath(projectId, 'rendering')}
          approved={isApproved(state)}
          source={source}
        />
      </div>

      <div data-assistant-body className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AssistantConversation
          state={state}
          busy={busy || approving}
          approvedResultId={state.approvedResultId}
          onQuickPrompt={handleQuickPrompt}
          onExpand={setExpanded}
          onEdit={handleEdit}
          onSelect={handleSelect}
          onApprove={handleApprove}
          onRetry={handleRetry}
          onDeleteTurn={handleDeleteTurn}
          deletingTurnId={deletingTurnId}
          onViewAngleChange={handleViewAngleSelect}
          baseResultId={base?.id ?? null}
        />
      </div>

      <div data-assistant-composer className="shrink-0">
        <AssistantComposer
          ref={composerRef}
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          busy={busy}
          renderStyleId={state.renderStyleId}
          onRenderStyleChange={(renderStyleId) =>
            dispatch({ type: 'setRenderStyle', renderStyleId })
          }
        />
      </div>

      {/* Full Page View Modal / Lightbox — exactly identical to Step 1 */}
      <FloorPlanFullscreenModal
        source={
          expanded
            ? {
                imageUrl: expanded.imageUrl,
                name: `3D Floor Model — ${viewAngleById(expanded.viewAngleId)?.label ?? 'Original'}`,
                extension: renderStyleById(expanded.renderStyleId).label.toUpperCase(),
              }
            : null
        }
        open={Boolean(expanded)}
        onClose={() => setExpanded(null)}
      />
    </div>
  )
}
