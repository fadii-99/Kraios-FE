import { useCallback, useEffect } from 'react'
import { useBlocker, useLocation } from 'react-router-dom'

/**
 * A history FLOOR: an entry the browser's Back button cannot walk past.
 *
 * Three transitions in this product are terminal — signing in, finishing a
 * project and signing out. Each already replaces the entry it came from, but
 * `replace` only removes ONE entry: after signing in, Back still reached the
 * landing page; after finishing, it still reached the Output stage of a project
 * that is now closed; after signing out, it still walked the dashboard
 * addresses of a session that no longer exists. What each of those needs is not
 * a shorter history but a floor under the destination.
 *
 * The floor is recorded in ROUTER STATE on the destination entry rather than in
 * a module flag, so it belongs to that history entry and survives a refresh, a
 * forward navigation and a return to it. Landing on a floor entry arms the
 * blocker; navigating deeper disarms it (that Back is a normal step back up to
 * the floor); returning to the floor arms it again.
 *
 * POP only. A blocked PUSH would break in-app navigation — the point is the
 * browser's Back/Forward buttons, not the product's own links.
 */
export const HISTORY_FLOOR_KEY = 'historyFloor'

/**
 * The router state that marks a destination as a floor. Pass it as `state` to
 * `navigate(..., { replace: true, state: HISTORY_FLOOR_STATE })` or to a Link.
 */
export const HISTORY_FLOOR_STATE = Object.freeze({ [HISTORY_FLOOR_KEY]: true })

/**
 * Arms the floor for the current entry. Called once per layout — AppLayout and
 * DashboardLayout are sibling routes, so exactly one is ever mounted and the
 * router only ever holds the one blocker it allows.
 */
export function useHistoryFloor() {
  const location = useLocation()
  const onFloor = Boolean(location.state?.[HISTORY_FLOOR_KEY])

  const blocker = useBlocker(
    useCallback(
      ({ historyAction }) => onFloor && historyAction === 'POP',
      [onFloor],
    ),
  )

  // The router has already restored the address by the time the blocker reports
  // `blocked` — it answers a blocked POP with the opposite `history.go`. All
  // that is left is to return the blocker to idle so it can catch the next one.
  // Nothing is announced: a toast on every Back press would be noise, and the
  // page not moving is the answer.
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])
}
