import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import BoQAssistantHeader from '@/components/dashboard/projects/workflow/step-3/assistant/BoQAssistantHeader'
import BoQConversation from '@/components/dashboard/projects/workflow/step-3/assistant/BoQConversation'
import BoQComposer from '@/components/dashboard/projects/workflow/step-3/assistant/BoQComposer'
import {
  isBoqApproved,
  isBoqGenerating,
} from '@/lib/dashboard/workflow/step-3/boqAssistantSelectors'
import { requestBoqGeneration } from '@/lib/dashboard/workflow/step-3/boqGeneration'
import {
  useBoqAssistant,
  useDesignAssistant,
  useFloorPlanSource,
} from '@/lib/dashboard/projects/projectsContext'
import { approvedResult } from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * What a failed run says — to the transcript and to the toast alike. A thrown
 * error's own `message` is internal text and never reaches the user.
 */
const GENERATION_FAILED_MESSAGE = 'Unable to generate the BoQ. Please try again.'

/**
 * BoQ Assistant — /dashboard/projects/:projectId/boq/assistant
 *
 * Dedicated conversational workspace for Bill of Quantities generation,
 * itemized material schedules, quantity takeoffs, and project costing.
 */
export default function BoQAssistantPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [state, dispatch] = useBoqAssistant(projectId)
  const [source] = useFloorPlanSource(projectId)
  const [designAssistant] = useDesignAssistant(projectId)

  const approvedRender = approvedResult(designAssistant)

  const [prompt, setPrompt] = useState('')
  const composerRef = useRef(null)
  const abortRef = useRef(null)
  const inFlightRef = useRef(false)

  const busy = isBoqGenerating(state)
  const approved = isBoqApproved(state)

  /**
   * One BoQ generation run.
   */
  const runGeneration = useCallback(
    async ({ text, pendingText }) => {
      const instruction = text.trim()
      if (!instruction || inFlightRef.current) return

      inFlightRef.current = true
      const controller = new AbortController()
      abortRef.current = controller

      dispatch({ type: 'startGeneration', prompt: instruction, pendingText })

      try {
        const result = await requestBoqGeneration({
          prompt: instruction,
          signal: controller.signal,
        })

        dispatch({
          type: 'generationSucceeded',
          title: result.title,
          summary: result.summary,
          rows: result.rows,
          text: result.text,
          prompt: instruction,
        })
      } catch (thrown) {
        if (thrown?.name === 'AbortError') {
          dispatch({ type: 'generationCancelled', message: 'BoQ generation cancelled.' })
        } else {
          dispatch({
            type: 'generationFailed',
            message: GENERATION_FAILED_MESSAGE,
            prompt: instruction,
          })
        }
      } finally {
        inFlightRef.current = false
        abortRef.current = null
      }
    },
    [dispatch],
  )

  const handleSubmit = useCallback(() => {
    const text = prompt
    setPrompt('')
    runGeneration({ text })
  }, [prompt, runGeneration])

  const handleRetry = useCallback(
    ({ prompt: retryPrompt, pendingText }) => {
      runGeneration({ text: retryPrompt, pendingText })
    },
    [runGeneration],
  )

  const handleRemoveDocument = useCallback(
    (documentId) => {
      dispatch({ type: 'removeDocument', documentId })
    },
    [dispatch],
  )

  const handleApprove = useCallback(
    (result) => {
      if (state.approvedResultId === result.id) {
        dispatch({ type: 'disapproveResult' })
      } else {
        dispatch({ type: 'approveResult', resultId: result.id })
        navigate(projectStagePath(projectId, 'boq'))
      }
    },
    [dispatch, navigate, projectId, state.approvedResultId],
  )

  const handleAddRow = useCallback(
    (resultId) => {
      dispatch({ type: 'addRow', resultId })
    },
    [dispatch],
  )

  const handleDeleteRow = useCallback(
    (resultId, rowIndex) => {
      dispatch({ type: 'deleteRow', resultId, rowIndex })
    },
    [dispatch],
  )

  const pageContainerRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        '[data-boq-header]',
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45 },
      )
        .fromTo(
          '[data-boq-body]',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 },
          '-=0.25',
        )
        .fromTo(
          '[data-boq-composer]',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          '-=0.35',
        )
    },
    { scope: pageContainerRef, dependencies: [reduced] },
  )

  return (
    <div ref={pageContainerRef} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div data-boq-header className="relative z-40 shrink-0">
        <BoQAssistantHeader
          backTo={projectStagePath(projectId, 'boq')}
          uploadedDocuments={state.uploadedDocuments || []}
          onRemoveDocument={handleRemoveDocument}
          approved={approved}
          busy={busy}
          source={source}
          approvedRender={approvedRender}
        />
      </div>

      <div data-boq-body className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BoQConversation
          state={state}
          busy={busy}
          approvedResultId={state.approvedResultId}
          onApprove={handleApprove}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onRetry={handleRetry}
        />
      </div>


      <div data-boq-composer className="shrink-0">
        <BoQComposer
          ref={composerRef}
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          busy={busy}
          documentTypeId={state.documentTypeId}
          onDocumentTypeChange={(documentTypeId) =>
            dispatch({ type: 'setDocumentType', documentTypeId })
          }
        />
      </div>
    </div>
  )
}

