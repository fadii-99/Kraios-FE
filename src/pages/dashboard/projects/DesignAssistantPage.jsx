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
import {
  ASSISTANT_COPY,
  renderStyleById,
  viewAngleById,
} from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import {
  editingResult as selectEditingResult,
  generationErrorMessage,
  isApproved,
  isGenerating,
  latestResult,
  refinementBase,
} from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import {
  MODEL_GENERATION_SUPPORTS_CANCEL,
  ModelGenerationCancelledError,
  requestModelGeneration,
} from '@/lib/dashboard/workflow/step-2/modelGeneration'
import { useDesignAssistant, useFloorPlanSource } from '@/lib/dashboard/projects/projectsContext'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Design Assistant — /dashboard/projects/:projectId/rendering/assistant
 */
export default function DesignAssistantPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [source] = useFloorPlanSource(projectId)
  const [state, dispatch] = useDesignAssistant(projectId)

  const [prompt, setPrompt] = useState('')
  const [expanded, setExpanded] = useState(null)

  // Canvas Mode and Loader Transition states
  const [isOpeningCanvas, setIsOpeningCanvas] = useState(false)
  const [canvasActive, setCanvasActive] = useState(false)
  const [canvasTargetResult, setCanvasTargetResult] = useState(null)
  const canvasTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (canvasTimeoutRef.current) clearTimeout(canvasTimeoutRef.current)
    }
  }, [])

  const composerRef = useRef(null)
  const abortRef = useRef(null)
  // Belt and braces against a double-fire (a fast second Enter, an opener tap
  // that lands before the state update paints).
  const inFlightRef = useRef(false)

  const busy = isGenerating(state)

  /**
   * The render the next instruction will change — the selected one if "Edit
   * image" pointed at one, otherwise the most recent. Both the composer and the
   * transcript are handed the same answer so they cannot disagree about what is
   * being refined.
   */
  const base = refinementBase(state)

  /**
   * One generation, whatever started it — a typed instruction, an opener or a
   * view-angle choice. They differ in the words they send and nothing else:
   * same request, same conversation turns, same result handling.
   */
  const runGeneration = useCallback(
    async ({ text, viewAngleId, pendingText, canvasSnapshotUrl }) => {
      const instruction = text.trim()
      if (!instruction || inFlightRef.current) return

      // Captured before the first await: the request must carry the settings as
      // they were when the user pressed send.
      const renderStyleId = state.renderStyleId
      const angleId = viewAngleId ?? state.viewAngleId
      const baseResult = selectEditingResult(state) ?? latestResult(state)

      inFlightRef.current = true
      const controller = MODEL_GENERATION_SUPPORTS_CANCEL ? new AbortController() : null
      abortRef.current = controller

      dispatch({
        type: 'startGeneration',
        prompt: instruction,
        pendingText,
        canvasSnapshotUrl,
      })

      try {
        const result = await requestModelGeneration({
          prompt: instruction,
          renderStyleId,
          viewAngleId: angleId,
          source,
          baseResult,
          signal: controller?.signal,
        })

        dispatch({
          type: 'generationSucceeded',
          result,
          renderStyleId,
          viewAngleId: angleId,
          prompt: instruction,
        })
      } catch (thrown) {
        const message = generationErrorMessage(thrown)

        dispatch(
          thrown instanceof ModelGenerationCancelledError
            ? { type: 'generationCancelled', message }
            : {
                type: 'generationFailed',
                message,
                prompt: instruction,
                viewAngleId: angleId,
                pendingText,
              },
        )
      } finally {
        inFlightRef.current = false
        abortRef.current = null
      }
    },
    [dispatch, source, state],
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
   * A view angle is a REAL request, not a setting: the conversation shows the
   * user's turn and "Generating <angle> view…", and the generation pipeline
   * returns a NEW render. The current image is never transformed in CSS to fake
   * a second viewpoint.
   *
   * It goes through `runGeneration` — the SAME path a typed instruction takes —
   * so an angle choice cannot drift into a second generation implementation.
   * The header is moved to the chosen angle first so the control reflects the
   * choice while the request is in flight; the result carries the same angle,
   * and like every new result it lands UNAPPROVED.
   */
  const handleViewAngleSelect = useCallback(
    (angleOrId) => {
      const angle = viewAngleById(typeof angleOrId === 'string' ? angleOrId : angleOrId.id)

      dispatch({ type: 'setViewAngle', viewAngleId: angle.id })
      runGeneration({
        text: angle.prompt,
        viewAngleId: angle.id,
        pendingText: ASSISTANT_COPY.generatingAngle.replace('{angle}', angle.label),
      })
    },
    [dispatch, runGeneration],
  )


  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

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
    (promptText, targetResult, canvasSnapshotUrl) => {
      setCanvasActive(false)
      runGeneration({
        text: promptText,
        viewAngleId: targetResult?.viewAngleId,
        canvasSnapshotUrl,
      })
    },
    [runGeneration],
  )

  /**
   * Clicking a render makes it the one the next instruction changes — the same
   * pointer "Edit image" sets, and deliberately the same state: two ways to say
   * "this one" must not become two competing notions of which one.
   *
   * Unlike "Edit image" it does NOT move focus to the composer. Selecting a
   * render is often just comparing two of them, and yanking the caret down to
   * the prompt field mid-comparison scrolls away the thing being compared.
   */
  const handleSelect = useCallback(
    (result) => {
      dispatch({ type: 'editResult', resultId: result.id })
    },
    [dispatch],
  )

  const handleApprove = useCallback(
    (result) => {
      if (state.approvedResultId === result.id) {
        dispatch({ type: 'disapproveResult' })
      } else {
        dispatch({ type: 'approveResult', resultId: result.id })
        navigate(projectStagePath(projectId, 'rendering'))
      }
    },
    [dispatch, navigate, projectId, state.approvedResultId],
  )


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
          busy={busy}
          approvedResultId={state.approvedResultId}
          onQuickPrompt={handleQuickPrompt}
          onExpand={setExpanded}
          onEdit={handleEdit}
          onSelect={handleSelect}
          onApprove={handleApprove}
          onRetry={handleRetry}
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
          onCancel={handleCancel}
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
                name: `3D Floor Model — ${viewAngleById(expanded.viewAngleId).label}`,
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
