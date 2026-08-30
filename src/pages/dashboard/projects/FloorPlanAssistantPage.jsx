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
import {
  approvedResult,
  editingResult as selectEditingResult,
  isApproved,
  isGenerating,
  latestResult,
  refinementBase,
} from '@/lib/dashboard/workflow/step-1/floorPlanAssistantSelectors'
import {
  FloorPlanGenerationUnavailableError,
  GENERATION_FAILED_MESSAGE,
  requestFloorPlanGeneration,
} from '@/lib/dashboard/workflow/step-1/floorPlanGeneration'
import { createGeneratedSource } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { useFloorPlanAssistant, useFloorPlanSource } from '@/lib/dashboard/projects/projectsContext'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * 2D Floor Plan Assistant Page — /dashboard/projects/:projectId/upload/assistant
 */
export default function FloorPlanAssistantPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setSource] = useFloorPlanSource(projectId)
  const [state, dispatch] = useFloorPlanAssistant(projectId)

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
  const inFlightRef = useRef(false)

  const busy = isGenerating(state)
  const base = refinementBase(state)
  const activeApproved = isApproved(state)

  const backTo = location.pathname.includes('/generate')
    ? projectStagePath(projectId, 'generate')
    : projectStagePath(projectId, 'upload')

  const runGeneration = useCallback(
    async ({ text, pendingText, canvasSnapshotUrl }) => {
      const instruction = text.trim()
      if (!instruction || inFlightRef.current) return

      inFlightRef.current = true
      dispatch({
        type: 'startGeneration',
        prompt: instruction,
        pendingText,
        canvasSnapshotUrl,
      })

      try {
        const result = await requestFloorPlanGeneration({
          prompt: instruction,
          baseResult: selectEditingResult(state) ?? latestResult(state),
        })

        dispatch({
          type: 'generationSucceeded',
          result,
          prompt: instruction,
        })
      } catch (thrown) {
        const message =
          thrown instanceof FloorPlanGenerationUnavailableError
            ? thrown.message
            : GENERATION_FAILED_MESSAGE

        dispatch({
          type: 'generationFailed',
          message,
          prompt: instruction,
          pendingText,
        })
      } finally {
        inFlightRef.current = false
      }
    },
    [dispatch, state],
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
    (promptText, targetResult, canvasSnapshotUrl) => {
      setCanvasActive(false)
      runGeneration({ text: promptText, canvasSnapshotUrl })
    },
    [runGeneration],
  )

  const handleSelect = useCallback(
    (result) => {
      dispatch({ type: 'editResult', resultId: result.id })
    },
    [dispatch],
  )

  const handleApprove = useCallback(
    (targetResult) => {
      const active = targetResult || latestResult(state) || approvedResult(state)
      if (!active) return

      if (state.approvedResultId === active.id) {
        dispatch({ type: 'disapproveResult' })
        setSource(null)
      } else {
        dispatch({ type: 'approveResult', resultId: active.id })
        const generatedSource = createGeneratedSource({
          prompt: active.prompt,
          previewUrl: active.imageUrl,
          ownsPreviewUrl: Boolean(active.ownsImageUrl),
        })
        setSource(generatedSource)
        navigate(backTo)
      }
    },
    [backTo, dispatch, navigate, setSource, state],
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
          busy={busy}
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
                extension: 'SVG',
              }
            : null
        }
        open={Boolean(expanded)}
        onClose={() => setExpanded(null)}
      />
    </div>
  )
}
