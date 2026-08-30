import { useEffect, useRef } from 'react'

import { waitForJob } from '@/lib/api/jobs'

/**
 * Re-attaches to a job that was already running when this view mounted.
 *
 * Generation happens on the server, so closing the tab, refreshing, or walking
 * to another stage does not stop it — but nothing was watching it either, and
 * the workspace would sit on a pending block that never resolved until the user
 * reloaded by hand.
 *
 * The version history is what makes recovery possible: a version still QUEUED
 * or PROCESSING comes back carrying its job, the adapters surface it, and this
 * picks the watch back up. It is the same shared poll the original request
 * used, so re-attaching costs a subscription rather than a second poll loop.
 *
 * Callbacks are held in refs, so a caller does not have to memoize them to
 * avoid restarting the watch on every render — the watch restarts only when the
 * job it is watching changes.
 *
 * @param {string|null} jobId
 * @param {object}  [handlers]
 * @param {(job: object) => void} [handlers.onProgress]
 * @param {(error: Error|null) => void} [handlers.onSettled] null on success
 */
export function useResumedJob(jobId, { onProgress, onSettled } = {}) {
  const progressRef = useRef(onProgress)
  const settledRef = useRef(onSettled)

  // Updated after each render rather than during it: a ref written mid-render
  // is a render side effect, and the watch below only ever reads these later,
  // from a poll callback.
  useEffect(() => {
    progressRef.current = onProgress
    settledRef.current = onSettled
  })

  useEffect(() => {
    if (!jobId) return undefined

    const controller = new AbortController()

    waitForJob(jobId, {
      signal: controller.signal,
      onProgress: (job) => progressRef.current?.(job),
    })
      .then(() => settledRef.current?.(null))
      .catch((error) => {
        // Unmounting is not a failure — it is this hook letting go.
        if (error?.name === 'AbortError') return
        settledRef.current?.(error)
      })

    return () => controller.abort()
  }, [jobId])
}
