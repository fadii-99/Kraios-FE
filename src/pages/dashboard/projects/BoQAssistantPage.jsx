import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import BoQAssistantHeader from '@/components/dashboard/projects/workflow/step-3/assistant/BoQAssistantHeader'
import BoQConversation from '@/components/dashboard/projects/workflow/step-3/assistant/BoQConversation'
import BoQComposer from '@/components/dashboard/projects/workflow/step-3/assistant/BoQComposer'
import PageLoader from '@/components/ui/PageLoader'
import { jobIdFromResponse, waitForJob } from '@/lib/api/jobs'
import {
  createManualBoqVersion,
  deleteBoqDocument,
  deleteConversationMessage,
  fetchBoqDocuments,
  generateBoq,
  uploadBoqDocument,
} from '@/lib/api/projects'
import { jobProgressText } from '@/lib/dashboard/workflow/apiShapes'
import {
  isBoqApproved,
  isBoqGenerating,
} from '@/lib/dashboard/workflow/step-3/boqAssistantSelectors'
import {
  documentTypeToApi,
  documentsToRecords,
  toStructuredData,
  withAddedRow,
  withDeletedRow,
} from '@/lib/dashboard/workflow/step-3/boqAdapters'
import {
  BOQ_ASSISTANT_COPY,
  slotDocumentTitle,
} from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import {
  useBoqAssistant,
  useDesignAssistant,
  useFloorPlanSource,
  useProjects,
  useStep1Data,
  useStep2Data,
  useStep3Data,
} from '@/lib/dashboard/projects/projectsContext'
import { approvedResult } from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import { CACHE_KEYS } from '@/lib/dashboard/projects/projectShape'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useResumedJob } from '@/hooks/useResumedJob'

/**
 * What a failed run says — to the transcript and to the toast alike. A thrown
 * error's own `message` is preferred, because API failures reach here already
 * normalized and a validation reason is more useful than a generic line.
 */
const GENERATION_FAILED_MESSAGE = 'Unable to generate the BoQ. Please try again.'

/**
 * BoQ Assistant — /dashboard/projects/:projectId/boq/assistant
 *
 * Backed by the Step 3 API throughout:
 *
 *   - `POST /step-3/generate/` queues a BOQ and answers a version with a job,
 *     watched and then refetched like every other stage,
 *   - `POST /step-3/versions/manual/` is how a table edit becomes a real
 *     version — Add Row and Delete Row post the amended rows rather than
 *     mutating a browser copy the backend would never agree with,
 *   - `POST/DELETE /step-3/documents/` back the attachment control, which is
 *     the first thing in the product that can actually add a supporting
 *     document. Documents are deliberately separate from conversation
 *     attachments: BOQ generation records the documents that exist when the job
 *     is submitted, so a file must be uploaded before it can inform a BOQ.
 */
export default function BoQAssistantPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  // The header shows the 2D plan and the approved 3D render this BOQ is built
  // from, so both upstream steps are read here as well as Step 3's own data.
  useStep1Data(projectId)
  useStep2Data(projectId)
  const step3 = useStep3Data(projectId)
  const reloadStep3 = step3.reload

  const { approveBoq, invalidateStep, refreshProject } = useProjects()
  const [state, dispatch] = useBoqAssistant(projectId)
  const source = useFloorPlanSource(projectId)
  const [designAssistant] = useDesignAssistant(projectId)

  const approvedRender = approvedResult(designAssistant)

  const [prompt, setPrompt] = useState('')
  const [approving, setApproving] = useState(false)
  const [deletingTurnId, setDeletingTurnId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editingTable, setEditingTable] = useState(false)

  const composerRef = useRef(null)
  const abortRef = useRef(null)
  const inFlightRef = useRef(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    return () => {
      activeRef.current = false
      // Leaving stops the poll, not the job. The version list carries it back.
      abortRef.current?.abort()
    }
  }, [])

  const busy = isBoqGenerating(state)
  const approved = isBoqApproved(state)

  /** One BoQ generation run. */
  const runGeneration = useCallback(
    async ({ text, pendingText }) => {
      const instruction = text?.trim()
      if (!instruction || inFlightRef.current) return

      inFlightRef.current = true
      const controller = new AbortController()
      abortRef.current = controller

      dispatch({ type: 'startGeneration', prompt: instruction, pendingText })

      try {
        const queued = await generateBoq(projectId, { prompt: instruction })
        const jobId = jobIdFromResponse(queued)

        if (jobId) {
          await waitForJob(jobId, {
            signal: controller.signal,
            onProgress: (job) => {
              if (!activeRef.current) return
              dispatch({
                type: 'generationProgress',
                text: jobProgressText(job, pendingText || BOQ_ASSISTANT_COPY.generating),
              })
            },
          })
        }

        if (!activeRef.current) return
        await reloadStep3()
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
    [dispatch, projectId, reloadStep3],
  )

  const handleSubmit = useCallback(() => {
    const text = prompt
    setPrompt('')
    runGeneration({ text })
  }, [prompt, runGeneration])

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
        await Promise.all([reloadStep3(), refreshProject(projectId)])
        if (!activeRef.current) return

        showSuccessToast('Request deleted.', { id: 'boq-turn-deleted' })
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That request could not be deleted.', {
          id: 'boq-turn-delete-failed',
        })
      } finally {
        if (activeRef.current) setDeletingTurnId(null)
      }
    },
    [deletingTurnId, invalidateStep, projectId, refreshProject, reloadStep3],
  )

  const handleRetry = useCallback(
    ({ prompt: retryPrompt, pendingText }) => {
      runGeneration({ text: retryPrompt, pendingText })
    },
    [runGeneration],
  )

  /* -------------------------------------------------------------------------
     Supporting documents
     ------------------------------------------------------------------------- */

  /**
   * One document, uploaded from the slot the user dropped it on.
   *
   * The slot IS the classification now — the composer's separate document-type
   * menu is gone — so it travels with the file instead of being read from
   * whatever the menu happened to be left on. It reaches the backend twice
   * over: as `document_type`, which is the contract's enum, and as a tag in
   * front of the `title`, which is what lets the panel put the file back in the
   * slot it came from when three slots share one enum value.
   */
  const handleUploadDocument = useCallback(
    async (file, slot) => {
      if (uploading || !slot) return

      setUploading(true)
      try {
        await uploadBoqDocument(projectId, {
          file,
          title: slotDocumentTitle(slot, file.name),
          documentType: documentTypeToApi(slot.typeId),
        })

        // The list is refetched rather than appended to: the backend decides
        // the title, the stored asset and its url.
        const documents = await fetchBoqDocuments(projectId)
        if (!activeRef.current) return

        dispatch({ type: 'setDocuments', documents: documentsToRecords(documents, projectId) })
        showSuccessToast('Document uploaded.', { id: 'boq-document-uploaded' })
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That document could not be uploaded.', {
          id: 'boq-document-upload-failed',
        })
      } finally {
        if (activeRef.current) setUploading(false)
      }
    },
    [dispatch, projectId, uploading],
  )

  const handleRemoveDocument = useCallback(
    async (documentId) => {
      try {
        await deleteBoqDocument(projectId, documentId)
        const documents = await fetchBoqDocuments(projectId)
        if (!activeRef.current) return

        dispatch({ type: 'setDocuments', documents: documentsToRecords(documents, projectId) })
        showSuccessToast('Document removed.', { id: 'boq-document-removed' })
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That document could not be removed.', {
          id: 'boq-document-remove-failed',
        })
      }
    },
    [dispatch, projectId],
  )

  /* -------------------------------------------------------------------------
     Approval and table edits
     ------------------------------------------------------------------------- */

  const handleApprove = useCallback(
    async (result) => {
      if (!result || approving) return

      if (state.approvedResultId === result.id) {
        showInfoToast('This Bill of Quantities is already approved.', {
          id: 'boq-already-approved',
        })
        navigate(projectStagePath(projectId, 'boq'))
        return
      }

      setApproving(true)
      try {
        await approveBoq(projectId, result.id)
        if (!activeRef.current) return
        navigate(projectStagePath(projectId, 'boq'))
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That Bill of Quantities could not be approved.', {
          id: 'boq-approve-failed',
        })
      } finally {
        if (activeRef.current) setApproving(false)
      }
    },
    [approveBoq, approving, navigate, projectId, state.approvedResultId],
  )

  /**
   * A table edit creates a NEW version.
   *
   * A BOQ version is immutable on the backend, and approval belongs to one set
   * of quantities — so a row added or removed is a different BOQ, saved as a
   * `MANUAL` version parented on the one it was edited from. The new version
   * arrives unapproved, which preserves the old rule (an edited table is not
   * the table anybody signed off) without a browser-only copy.
   */
  const saveRowEdit = useCallback(
    async (resultId, rows) => {
      if (editingTable) return

      setEditingTable(true)
      try {
        await createManualBoqVersion(projectId, {
          structuredData: toStructuredData(rows),
          parentVersionId: resultId,
        })
        if (!activeRef.current) return
        await reloadStep3()
      } catch (thrown) {
        if (!activeRef.current) return
        showErrorToast(thrown?.message || 'That BoQ change could not be saved.', {
          id: 'boq-manual-version-failed',
        })
      } finally {
        if (activeRef.current) setEditingTable(false)
      }
    },
    [editingTable, projectId, reloadStep3],
  )

  const handleAddRow = useCallback(
    (resultId) => {
      const result = state.results[resultId]
      if (!result) return
      saveRowEdit(resultId, withAddedRow(result.rows))
    },
    [saveRowEdit, state.results],
  )

  const handleDeleteRow = useCallback(
    (resultId, rowIndex) => {
      const result = state.results[resultId]
      if (!result) return
      saveRowEdit(resultId, withDeletedRow(result.rows, rowIndex))
    },
    [saveRowEdit, state.results],
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
  const resumedJobId = step3.data?.hydrated?.pending?.job?.id ?? null

  useResumedJob(resumedJobId, {
    onProgress: (job) => {
      if (!activeRef.current) return
      dispatch({ type: 'generationProgress', text: jobProgressText(job, BOQ_ASSISTANT_COPY.generating) })
    },
    onSettled: () => {
      if (!activeRef.current) return
      reloadStep3().catch(() => {
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

  if (!state.hydrated && step3.isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white">
        <PageLoader label="Loading BoQ Assistant" variant="inline" className="my-auto" />
      </div>
    )
  }

  return (
    <div ref={pageContainerRef} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div data-boq-header className="relative z-40 shrink-0">
        <BoQAssistantHeader
          backTo={projectStagePath(projectId, 'boq')}
          uploadedDocuments={state.uploadedDocuments || []}
          onUploadDocument={handleUploadDocument}
          onRemoveDocument={handleRemoveDocument}
          uploading={uploading}
          approved={approved}
          busy={busy}
          source={source}
          approvedRender={approvedRender}
        />
      </div>

      <div data-boq-body className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BoQConversation
          state={state}
          busy={busy || approving || editingTable}
          approvedResultId={state.approvedResultId}
          onApprove={handleApprove}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onRetry={handleRetry}
          onDeleteTurn={handleDeleteTurn}
          deletingTurnId={deletingTurnId}
        />
      </div>


      <div data-boq-composer className="shrink-0">
        <BoQComposer
          ref={composerRef}
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          busy={busy}
        />
      </div>
    </div>
  )
}
