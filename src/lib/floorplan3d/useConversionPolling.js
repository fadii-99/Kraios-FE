import { useCallback, useEffect, useRef, useState } from 'react'

import { getProgress } from '@/lib/api/floorplan3d'
import { progressToView } from '@/lib/floorplan3d/adapters'

/**
 * Follow one conversion from queued to finished.
 *
 * POLLING, NOT SOCKETS. The rest of the dashboard uses Channels for job
 * progress, but this experiment owns no consumer and adding one would tie it to
 * `projects`' WebSocket routing — exactly the coupling that makes a feature hard
 * to remove. A conversion runs for a couple of minutes and one 200-byte GET
 * every few seconds is a cost nobody will measure.
 *
 * FOUR THINGS THIS HAS TO GET RIGHT, and each is a bug if it is missing:
 *
 *   - Stop on unmount. A timer that outlives the page keeps calling `setState`
 *     on a component that is gone.
 *   - Stop when the CALLER says the work is over. What "still running" means
 *     is not one thing: a conversion runs while `status` is QUEUED or
 *     PROCESSING, but a Blender rebuild never touches `status` at all and is
 *     visible only in `stage`. So the default answers the conversion question
 *     and `track` takes an `isRunning` override for the other one. Hard-coding
 *     the status check made a rebuild look finished on its first poll.
 *   - Back off. A conversion's first ten seconds are interesting and its third
 *     minute is not; a fixed one-second interval is a hundred requests for a
 *     job that took two minutes.
 *   - Give up. A worker that dies mid-run leaves a row PROCESSING forever, and
 *     a page that polls it forever tells the user nothing.
 */

// Back off as the job runs on. The first interval is short because the first
// stage is fast and the user is watching.
const INTERVALS_MS = [1200, 2000, 3500, 5000]

// Roughly twelve minutes at the final interval. Well past the slowest realistic
// conversion, and short enough that a dead worker surfaces as an answer rather
// than as a spinner.
const MAX_POLLS = 180

export function useConversionPolling({ onFinished, onStalled } = {}) {
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [stalled, setStalled] = useState(false)

  const timer = useRef(null)
  const polls = useRef(0)
  const alive = useRef(true)
  const finishedRef = useRef(onFinished)
  const stalledCallbackRef = useRef(onStalled)
  // The caller's "is it still running?" test for the CURRENT watch, or null to
  // use the conversion's own status. A ref, because changing it must not
  // restart the poll.
  const runningRef = useRef(null)

  // The callback is kept in a ref so a caller can pass an inline arrow without
  // restarting the poll on every render. Written in an effect rather than
  // during render, because a ref write during render is a side effect in a
  // function React may call twice - `react-hooks/refs` is right to object.
  useEffect(() => {
    finishedRef.current = onFinished
    stalledCallbackRef.current = onStalled
  }, [onFinished, onStalled])

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
   * Schedule the next poll.
   *
   * `tick` is a hoisted function DECLARATION rather than a `const` arrow, so it
   * can schedule itself without being referenced before initialisation — which
   * is both a real temporal-dead-zone hazard and what
   * `react-hooks/immutability` flags.
   */
  const schedule = useCallback(
    (conversionId, delay) => {
      async function tick() {
        if (!alive.current) return
        if (polls.current >= MAX_POLLS) {
          setStalled(true)
          // TOLD, not just recorded. `stalled` used to be state nobody outside
          // the list page read, so a caller watching a job that never finished
          // was left with a spinner that spun until the tab closed.
          stalledCallbackRef.current?.()
          return
        }
        polls.current += 1

        try {
          const next = progressToView(await getProgress(conversionId))
          if (!alive.current) return
          setProgress(next)
          setError('')

          const running = runningRef.current
            ? runningRef.current(next)
            : next.isRunning
          if (running) {
            const step = INTERVALS_MS[Math.min(polls.current, INTERVALS_MS.length - 1)]
            timer.current = setTimeout(tick, step)
          } else {
            finishedRef.current?.(next)
          }
        } catch (caught) {
          if (!alive.current) return
          // A single failed poll is not a failed conversion — the network
          // hiccupped, or the session refreshed. Keep asking, more slowly; the
          // ceiling above is what ends this, not one bad response.
          setError(caught?.message || 'Lost contact with the server.')
          timer.current = setTimeout(tick, INTERVALS_MS[INTERVALS_MS.length - 1] * 2)
        }
      }

      timer.current = setTimeout(tick, delay)
    },
    [],
  )

  /**
   * Start following a conversion. Polls immediately, then backs off.
   *
   * `isRunning` decides when to stop — pass one to watch something other than
   * the conversion's own status, such as a Blender rebuild.
   */
  const track = useCallback(
    (conversionId, { immediate = true, isRunning } = {}) => {
      if (!conversionId) return
      stop()
      polls.current = 0
      setStalled(false)
      setError('')
      runningRef.current = isRunning ?? null
      schedule(conversionId, immediate ? 0 : INTERVALS_MS[0])
    },
    [schedule, stop],
  )

  const reset = useCallback(() => {
    stop()
    polls.current = 0
    setProgress(null)
    setError('')
    setStalled(false)
  }, [stop])

  return { progress, error, stalled, track, stop, reset }
}
