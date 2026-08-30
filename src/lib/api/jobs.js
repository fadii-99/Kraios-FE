/**
 * Background job monitoring for the KRAIOS project workflow.
 *
 * Every generation, edit and archive endpoint answers `202 Accepted` and hands
 * back a `ProcessingJob`; the work itself finishes later. This module is the
 * ONE place that waits for it, so no page grows its own `setInterval`.
 *
 * Three things make it cheap enough to leave running:
 *
 *   - **One loop per job, however many watchers.** Two components watching the
 *     same job (a stage and its assistant, a reopened page) share a single
 *     in-flight request through `activeJobs`. Watching costs a subscription,
 *     not a second poll.
 *   - **A backing-off interval.** A job that has just been queued is polled
 *     quickly; one that has been processing for a while is polled less often,
 *     to a ceiling. A slow AI render therefore does not cost one request per
 *     1.5s for its whole life.
 *   - **It stops.** The loop ends on COMPLETED / FAILED, when the last watcher
 *     unsubscribes, or when the tab is hidden long enough to make polling
 *     pointless — and resumes on return.
 *
 * REST polling is the contract; the optional WebSocket channel is not used
 * here, because the Vercel proxy in front of this app forwards HTTP only.
 */

import { fetchJob } from './projects'

export const JOB_STATUS = {
  queued: 'QUEUED',
  processing: 'PROCESSING',
  completed: 'COMPLETED',
  failed: 'FAILED',
}

export const JOB_FAILED_MESSAGE = 'Processing failed. Please try again.'

/** Terminal states — the loop stops on either. */
export function isJobSettled(job) {
  return job?.status === JOB_STATUS.completed || job?.status === JOB_STATUS.failed
}

/** Thrown when a watched job reports FAILED. Carries the job for context. */
export class JobFailedError extends Error {
  constructor(job) {
    super(job?.error || job?.message || JOB_FAILED_MESSAGE)
    this.name = 'JobFailedError'
    this.job = job
  }
}

/**
 * How long to wait before the next poll, given how many have already run.
 *
 * Fast while the answer is plausibly imminent, then progressively slower. The
 * ceiling is deliberately short enough that a completed job is still noticed
 * promptly — this paces requests, it does not defer the result.
 */
function pollDelay(attempt) {
  if (attempt < 4) return 1200
  if (attempt < 10) return 2000
  if (attempt < 25) return 3500
  return 5000
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Job polling cancelled.', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException('Job polling cancelled.', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })

/**
 * Whether polling should pause right now.
 *
 * A hidden tab cannot show progress, so continuing to poll it spends the user's
 * network on nothing. The loop waits for `visibilitychange` instead and picks
 * straight back up — no work is lost, because the job runs on the server.
 */
function waitUntilVisible(signal) {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const onVisible = () => {
      if (document.visibilityState === 'hidden') return
      cleanup()
      resolve()
    }

    const onAbort = () => {
      cleanup()
      reject(new DOMException('Job polling cancelled.', 'AbortError'))
    }

    function cleanup() {
      document.removeEventListener('visibilitychange', onVisible)
      signal?.removeEventListener('abort', onAbort)
    }

    document.addEventListener('visibilitychange', onVisible)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Every job currently being polled, keyed by job id.
 *
 * @type {Map<string, { promise: Promise<object>, listeners: Set<Function>, controller: AbortController, latest: object | null }>}
 */
const activeJobs = new Map()

/**
 * Polls one job to completion.
 *
 * Resolves with the COMPLETED job. Rejects with `JobFailedError` on FAILED, and
 * with an `AbortError` when every watcher has left. `onProgress` receives each
 * poll's job object, which is what carries `progress` and `message` to the UI.
 *
 * @param {string} jobId
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {(job: object) => void} [options.onProgress]
 * @returns {Promise<object>}
 */
export function waitForJob(jobId, { signal, onProgress } = {}) {
  if (!jobId) return Promise.reject(new Error('A job id is required.'))

  let entry = activeJobs.get(jobId)

  if (!entry) {
    const controller = new AbortController()

    entry = {
      controller,
      listeners: new Set(),
      latest: null,
      promise: null,
    }

    entry.promise = runJobLoop(jobId, entry).finally(() => {
      activeJobs.delete(jobId)
    })

    activeJobs.set(jobId, entry)
  }

  if (onProgress) {
    entry.listeners.add(onProgress)
    // A late subscriber should not have to wait a whole interval to learn where
    // the job already is.
    if (entry.latest) onProgress(entry.latest)
  }

  const detach = () => {
    if (onProgress) entry.listeners.delete(onProgress)
    // The shared loop belongs to its watchers. When the last one leaves — a
    // page unmounts, a request is cancelled — it stops rather than polling on
    // behalf of nobody.
    if (entry.listeners.size === 0) entry.controller.abort()
  }

  if (!signal) return entry.promise.finally(detach)

  if (signal.aborted) {
    detach()
    return Promise.reject(new DOMException('Job polling cancelled.', 'AbortError'))
  }

  // One caller leaving must not settle the shared loop for the others, so the
  // caller's abort races its own promise rather than the loop's.
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Job polling cancelled.', 'AbortError'))
    }

    function cleanup() {
      signal.removeEventListener('abort', onAbort)
      detach()
    }

    signal.addEventListener('abort', onAbort, { once: true })

    entry.promise.then(
      (job) => {
        cleanup()
        resolve(job)
      },
      (error) => {
        cleanup()
        reject(error)
      },
    )
  })
}

async function runJobLoop(jobId, entry) {
  const { signal } = entry.controller
  let attempt = 0

  for (;;) {
    if (signal.aborted) {
      throw new DOMException('Job polling cancelled.', 'AbortError')
    }

    await waitUntilVisible(signal)

    const job = await fetchJob(jobId)
    entry.latest = job
    entry.listeners.forEach((listener) => listener(job))

    if (job?.status === JOB_STATUS.completed) return job
    if (job?.status === JOB_STATUS.failed) throw new JobFailedError(job)

    attempt += 1
    await sleep(pollDelay(attempt), signal)
  }
}

/**
 * The job carried by a queued version, whatever the endpoint nested it under.
 *
 * The archive endpoint answers the job directly while every generation endpoint
 * nests it under `job`; this reads both so no call site has to remember which.
 */
export function jobFromResponse(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.job && typeof payload.job === 'object') return payload.job
  // A bare job object — it has a status and a job_type, a version does not.
  if (payload.status && payload.job_type) return payload
  return null
}

/** The job id carried by a queued version or a bare job. */
export function jobIdFromResponse(payload) {
  return jobFromResponse(payload)?.id ?? null
}
