import { useCallback, useEffect, useRef, useState } from 'react'

import {
  cancelConversion,
  getConversion,
  startConversion,
} from '@/lib/api/floorplan3d'
import { conversionToView } from '@/lib/experiments/floorplan3d/adapters'

/**
 * Follow one conversion from queued to finished.
 *
 * POLLING, NOT SOCKETS. The rest of the dashboard uses Channels for job
 * progress, but this feature owns no consumer, and adding one would tie it to
 * `projects`' WebSocket routing — the exact coupling that makes a feature hard
 * to remove. The deployed Vercel proxy does not forward the existing socket
 * flow reliably either, so a poll is what actually works in production.
 *
 * Five things this has to get right, each a real bug if it is missing:
 *
 *   - **Stop on unmount.** A timer that outlives the page keeps polling a
 *     request whose `setState` targets a component that is gone.
 *   - **Stop on a terminal status.** QUEUED and PROCESSING are the only states
 *     worth asking about again.
 *   - **Pause while the tab is hidden.** A background tab polling every three
 *     seconds for ten minutes is thirty pointless requests, and browsers throttle
 *     the timer unpredictably anyway. It resumes with an immediate poll, so
 *     coming back to the tab shows the current state rather than the state from
 *     when it was hidden.
 *   - **Back off.** A conversion runs for minutes, and asking every three
 *     seconds for all of them is a load nobody needs. The interval grows to a
 *     ceiling; a failed poll backs off further, because a network that just
 *     refused is not helped by being asked again immediately.
 *   - **Give up.** A worker that dies mid-run leaves a row PROCESSING until the
 *     server's own stale-job recovery notices. A page that polls forever tells
 *     the user nothing, so past the ceiling the poll stops and says so.
 *
 * `abort` is exposed because leaving the workspace must stop the WATCH, not
 * the work: the conversion continues on the server, and returning re-attaches.
 */

// Grows from the first to the last as a conversion runs. The early polls are
// close together because the first thirty seconds are when the status actually
// changes (queued → processing), and the later ones are spread out because a
// geometry pass takes minutes.
const BACKOFF_MS = [1500, 2500, 4000, 6000, 8000]
const FAILURE_MULTIPLIER = 2

// Roughly fifteen minutes at the ceiling. Well past the slowest realistic
// conversion (three geometry attempts on a large sheet), and short enough that
// a dead worker surfaces as an answer rather than as a spinner.
const MAX_POLLS = 160

function intervalFor(pollCount) {
  return BACKOFF_MS[Math.min(pollCount, BACKOFF_MS.length - 1)]
}

export function useConversionPolling(initial = null) {
  const [conversion, setConversion] = useState(initial)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [stalled, setStalled] = useState(false)

  const timer = useRef(null)
  const polls = useRef(0)
  const alive = useRef(true)
  // The conversion the poll loop is following. Cleared on a terminal status.
  const watching = useRef(null)
  // The conversion on screen, whether or not it is still being polled.
  // `cancel` reads this rather than closing over state, so its identity is
  // stable and it is not re-created on every progress update.
  const currentId = useRef(initial?.id ?? null)

  const stop = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const abort = useCallback(() => {
    watching.current = null
    stop()
  }, [stop])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  /**
   * Schedule the next poll for `conversionId`.
   *
   * `tick` is a hoisted function DECLARATION rather than a `const` arrow, so
   * it can schedule itself without being referenced before it is initialised —
   * both a real temporal-dead-zone hazard and what
   * `react-hooks/immutability` flags.
   */
  const schedule = useCallback((conversionId, delay) => {
    async function tick() {
      if (!alive.current || watching.current !== conversionId) return

      // A hidden tab is not asked. The visibility listener below books an
      // immediate poll when it comes back, so nothing is missed — it is only
      // not asked for while nobody is looking.
      if (typeof document !== 'undefined' && document.hidden) {
        timer.current = setTimeout(tick, BACKOFF_MS[BACKOFF_MS.length - 1])
        return
      }

      if (polls.current >= MAX_POLLS) {
        setStalled(true)
        return
      }
      polls.current += 1

      try {
        const next = conversionToView(await getConversion(conversionId))
        if (!alive.current || watching.current !== conversionId) return
        setConversion(next)
        setError('')
        if (!next.isFinished) {
          timer.current = setTimeout(tick, intervalFor(polls.current))
        } else {
          watching.current = null
        }
      } catch (caught) {
        if (!alive.current || watching.current !== conversionId) return
        // A single failed poll is not a failed conversion — the network
        // hiccupped, or the session refreshed. Keep asking, more slowly; the
        // ceiling above is what ends this, not one bad response.
        setError(caught?.message || 'Lost contact with the server.')
        timer.current = setTimeout(
          tick,
          intervalFor(polls.current) * FAILURE_MULTIPLIER,
        )
      }
    }

    timer.current = setTimeout(tick, delay)
  }, [])

  // Coming back to the tab asks immediately rather than waiting out whatever
  // interval was pending when it was hidden.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const onVisible = () => {
      if (document.hidden || !watching.current) return
      stop()
      schedule(watching.current, 0)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [schedule, stop])

  /**
   * Pick up a conversion that already exists — on page load, or after a
   * refresh mid-run. Takes an ADAPTED conversion; every caller reads through
   * `adapters`.
   *
   * IT ALWAYS FETCHES THE DETAIL, even for a run that finished days ago.
   * Callers hand this a row from a LIST endpoint, and those return summaries —
   * no `model`, no `quality`, because a list of ten conversions carrying ten
   * full models would be a slow response nobody reads. A finished run is never
   * polled, so without this immediate fetch the page would show a completed
   * conversion with no model in it.
   */
  const track = useCallback(
    (existing) => {
      if (!existing) return
      setConversion(existing)
      setError('')
      setStalled(false)
      polls.current = 0
      currentId.current = existing.id
      watching.current = existing.id
      stop()
      schedule(existing.id, 0)
    },
    [schedule, stop],
  )

  /** Start a new conversion for a source and follow it. */
  const start = useCallback(
    async (sourceId) => {
      setStarting(true)
      setError('')
      setStalled(false)
      polls.current = 0
      stop()
      try {
        const created = conversionToView(await startConversion(sourceId))
        if (!alive.current) return null
        setConversion(created)
        currentId.current = created.id
        watching.current = created.id
        schedule(created.id, BACKOFF_MS[0])
        return created
      } catch (caught) {
        if (alive.current) {
          setError(caught?.message || 'The conversion could not be started.')
        }
        return null
      } finally {
        if (alive.current) setStarting(false)
      }
    },
    [schedule, stop],
  )

  /**
   * Ask a running conversion to stop.
   *
   * Best effort, and the UI says so: a queued run is cancelled outright, and a
   * running one is flagged and stops between stages — an HTTP call already in
   * flight cannot be interrupted. Polling continues either way, because the
   * row is what says when it actually stopped.
   */
  const cancel = useCallback(async () => {
    const conversionId = currentId.current
    if (!conversionId) return null
    setCancelling(true)
    try {
      const updated = conversionToView(await cancelConversion(conversionId))
      if (!alive.current) return null
      setConversion(updated)
      if (updated.isFinished) watching.current = null
      return updated
    } catch (caught) {
      if (alive.current) {
        setError(caught?.message || 'The conversion could not be cancelled.')
      }
      return null
    } finally {
      if (alive.current) setCancelling(false)
    }
  }, [])

  const running = Boolean(conversion?.isRunning) && !stalled

  return {
    conversion,
    setConversion,
    start,
    track,
    cancel,
    abort,
    starting,
    cancelling,
    running,
    stalled,
    error,
  }
}
