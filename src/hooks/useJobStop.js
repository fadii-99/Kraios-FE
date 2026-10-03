import { useCallback, useEffect, useRef, useState } from 'react'

import { JOB_STATUS } from '@/lib/api/jobs'
import { cancelJob } from '@/lib/api/projects'
import { showErrorToast, showInfoToast } from '@/lib/toast'

const STOP_FAILED_MESSAGE = 'The request could not be stopped. Try again in a moment.'

/**
 * The STOP action for an assistant page: stops the running job on the server.
 *
 * One hook for Steps 1, 2 and 3, because the three differ only in which step
 * they refetch afterwards. It tracks which job is running from two sources:
 *
 *   - `attachJob(id)` — called by the page's own `runGeneration` the moment the
 *     generation endpoint answers with a job, and `releaseJob()` when it ends;
 *   - `resumedJobId` — a job that was already running when the page opened.
 *
 * A press that lands BEFORE the generation endpoint has answered (there is no
 * job id yet) is remembered and carried out as soon as `attachJob` delivers
 * one, so a quick Stop is never silently lost.
 *
 * Once the backend confirms, the page's own watch is aborted (`abortRef`) and
 * the step is refetched: the transcript is then rebuilt from the server, where
 * the turn now reads "You stopped this request" with its Retry. A stop that
 * raced the finish just refetches too — the result simply appears.
 *
 * @param {object} options
 * @param {string|null} options.resumedJobId
 * @param {{current: AbortController|null}} options.abortRef
 * @param {() => Promise<unknown>} options.reload
 * @param {string} options.toastId stable id for this page's stop toasts
 */
export function useJobStop({ resumedJobId, abortRef, reload, toastId }) {
  const jobIdRef = useRef(null)
  const pendingStopRef = useRef(false)
  const activeRef = useRef(true)
  const reloadRef = useRef(reload)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    reloadRef.current = reload
  })

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const stopJob = useCallback(
    async (jobId) => {
      pendingStopRef.current = false
      try {
        const job = await cancelJob(jobId)
        if (!activeRef.current) return
        abortRef?.current?.abort()
        await reloadRef.current?.()
        if (job?.status === JOB_STATUS.cancelled) {
          showInfoToast('Stopped. Nothing was generated.', { id: toastId })
        }
      } catch (error) {
        if (!activeRef.current) return
        showErrorToast(error?.message || STOP_FAILED_MESSAGE, { id: toastId })
      } finally {
        if (activeRef.current) setStopping(false)
      }
    },
    [abortRef, toastId],
  )

  const attachJob = useCallback(
    (jobId) => {
      jobIdRef.current = jobId || null
      if (jobId && pendingStopRef.current) stopJob(jobId)
    },
    [stopJob],
  )

  const releaseJob = useCallback(() => {
    jobIdRef.current = null
    // A stop asked for a request that never produced a job (it failed to
    // queue): there is nothing left to stop.
    if (pendingStopRef.current) {
      pendingStopRef.current = false
      setStopping(false)
    }
  }, [])

  const stop = useCallback(() => {
    if (stopping) return
    setStopping(true)
    const jobId = jobIdRef.current ?? resumedJobId
    if (!jobId) {
      pendingStopRef.current = true
      return
    }
    stopJob(jobId)
  }, [resumedJobId, stopJob, stopping])

  return { stop, stopping, attachJob, releaseJob }
}
