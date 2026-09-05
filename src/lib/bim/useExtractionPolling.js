import { useCallback, useEffect, useRef, useState } from 'react'

import { getExtraction, startExtraction } from '@/lib/api/bim'
import { extractionToView } from '@/lib/bim/bimAdapters'

/**
 * Track one extraction from queued to finished.
 *
 * POLLING, NOT SOCKETS. The rest of the dashboard uses Channels for job
 * progress, but this app owns no consumer and adding one would tie it to
 * `projects`' WebSocket routing — which is exactly the coupling that makes a
 * feature hard to remove. An extraction runs for well under two minutes and one
 * small GET every three seconds is a cost nobody will measure.
 *
 * Three things this has to get right, and each is a bug if it is missing:
 *
 *   - Stop on unmount. A timer that outlives the page keeps polling a request
 *     whose `setState` targets a component that is gone.
 *   - Stop on a terminal status. QUEUED and PROCESSING are the only states
 *     worth asking about again.
 *   - Give up after a while. A worker that dies mid-run leaves a row PROCESSING
 *     forever, and a page that polls it forever tells the user nothing. After
 *     the ceiling below, the poll stops and says so.
 */

const POLL_INTERVAL_MS = 3000

// Roughly ten minutes. Well past the slowest realistic extraction (three
// geometry attempts on a large sheet), and short enough that a dead worker
// surfaces as an answer rather than as a spinner.
const MAX_POLLS = 200

export function useExtractionPolling(initialExtraction = null) {
  const [extraction, setExtraction] = useState(initialExtraction)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [stalled, setStalled] = useState(false)

  const timer = useRef(null)
  const polls = useRef(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const stop = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  /**
   * Schedule the next poll for `extractionId`.
   *
   * `tick` is a hoisted function DECLARATION rather than a `const` arrow, so it
   * can schedule itself without being referenced before it is initialised —
   * which is both a real temporal-dead-zone hazard and what
   * `react-hooks/immutability` flags. The recursion is the loop: each answer
   * either ends it or books the next one.
   */
  const schedule = useCallback((extractionId, delay = POLL_INTERVAL_MS) => {
    async function tick() {
      if (!alive.current) return

      if (polls.current >= MAX_POLLS) {
        setStalled(true)
        return
      }
      polls.current += 1

      try {
        const next = extractionToView(await getExtraction(extractionId))
        if (!alive.current) return
        setExtraction(next)
        if (!next.isFinished) {
          timer.current = setTimeout(tick, POLL_INTERVAL_MS)
        }
      } catch (caught) {
        if (!alive.current) return
        // A single failed poll is not a failed extraction — the network
        // hiccupped, or the session refreshed. Keep asking, more slowly; the
        // ceiling above is what ends this, not one bad response.
        setError(caught?.message || 'Lost contact with the server.')
        timer.current = setTimeout(tick, POLL_INTERVAL_MS * 2)
      }
    }

    timer.current = setTimeout(tick, delay)
  }, [])

  /**
   * Pick up an extraction that already exists — on page load, or after a
   * refresh mid-run. Takes an ADAPTED extraction; every caller reads through
   * `bimAdapters`.
   *
   * IT ALWAYS FETCHES THE DETAIL, even for a run that finished days ago.
   * Callers hand this a row from the LIST endpoint, and that endpoint returns
   * summaries — no `plan`, no `quality`, because a list of ten extractions
   * carrying ten full plans would be a slow response nobody reads. A finished
   * run is never polled, so without this immediate fetch the page would show a
   * completed extraction with no model in it and invite the user to build one
   * they already have.
   *
   * The summary is set first so the status and grade render immediately rather
   * than after the round trip.
   */
  const track = useCallback(
    (existing) => {
      if (!existing) return
      setExtraction(existing)
      setError('')
      setStalled(false)
      polls.current = 0
      stop()
      schedule(existing.id, 0)
    },
    [schedule, stop],
  )

  /** Start a new extraction for a source and follow it. */
  const start = useCallback(
    async (sourceId) => {
      setStarting(true)
      setError('')
      setStalled(false)
      polls.current = 0
      stop()
      try {
        const created = extractionToView(await startExtraction(sourceId))
        if (!alive.current) return null
        setExtraction(created)
        schedule(created.id)
        return created
      } catch (caught) {
        if (alive.current) {
          setError(caught?.message || 'The extraction could not be started.')
        }
        return null
      } finally {
        if (alive.current) setStarting(false)
      }
    },
    [schedule, stop],
  )

  const running = Boolean(extraction?.isRunning) && !stalled

  return { extraction, setExtraction, start, track, starting, running, stalled, error }
}
