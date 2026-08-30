import { useCallback, useRef, useState } from 'react'

/**
 * A small keyed request cache — the whole of KRAIOS's data-fetching machinery.
 *
 * The workflow reads the same few resources from many places: a project's
 * detail is wanted by the route guard, the stepper and Output; Step 2's history
 * is wanted by the gateway and by the assistant. Without a cache, every one of
 * those mounts is another request, and walking Upload → Rendering → Upload
 * refetches everything twice.
 *
 * What this gives, in about a hundred lines and with no dependency:
 *
 *   - **Dedupe.** Two components asking for the same key while a request is in
 *     flight share it. The second gets the same promise, not a second GET.
 *   - **Cache-first reads.** A key that already has data resolves immediately;
 *     `force` is how a mutation says "this is stale now".
 *   - **Per-key status.** `status`, `data` and `error` live together, so a view
 *     can hold a loader without inventing a second boolean.
 *   - **No leaks.** Nothing is subscribed to; the cache is plain state inside
 *     the provider and dies with it.
 *
 * It is deliberately NOT a general query library: no refetch-on-focus, no
 * garbage collection, no retries. Those are the parts that would need a real
 * dependency, and the workflow does not need them.
 */

export const RESOURCE_STATUS = {
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  error: 'error',
}

const EMPTY_ENTRY = Object.freeze({
  status: RESOURCE_STATUS.idle,
  data: null,
  error: null,
})

export function useResourceCache() {
  const [entries, setEntries] = useState({})

  // The state mirror. `load` has to read the current cache without depending on
  // it, or every consumer's effect would re-run on every unrelated write.
  const entriesRef = useRef(entries)
  const inFlight = useRef(new Map())

  const write = useCallback((key, entry) => {
    setEntries((prev) => {
      const next = { ...prev, [key]: entry }
      entriesRef.current = next
      return next
    })
  }, [])

  /**
   * Reads one key, fetching only when it has to.
   *
   * @param {string}   key
   * @param {Function} fetcher   called only on a real miss
   * @param {object}   [options]
   * @param {boolean}  [options.force] refetch even when the key is ready
   * @returns {Promise<any>}
   */
  const load = useCallback(
    (key, fetcher, { force = false } = {}) => {
      if (!key) return Promise.resolve(null)

      const existing = entriesRef.current[key]

      if (!force && existing?.status === RESOURCE_STATUS.ready) {
        return Promise.resolve(existing.data)
      }

      const pending = inFlight.current.get(key)

      // A plain read joins whatever is already in flight. A FORCED read must
      // not: "this is stale now" is said after a mutation, and a request that
      // was already running when the mutation happened may answer with the
      // state from before it. So a forced read waits for the in-flight one and
      // then goes again, which is the only ordering that cannot hand back a
      // pre-mutation result.
      if (pending && !force) return pending

      write(key, {
        status: RESOURCE_STATUS.loading,
        // A forced refetch keeps the current data on screen while it runs, so
        // a refresh after a mutation does not blank the view it is refreshing.
        data: existing?.data ?? null,
        error: null,
      })

      const request = (pending ? pending.catch(() => {}) : Promise.resolve())
        .then(fetcher)
        .then((data) => {
          write(key, { status: RESOURCE_STATUS.ready, data, error: null })
          return data
        })
        .catch((error) => {
          write(key, {
            status: RESOURCE_STATUS.error,
            data: existing?.data ?? null,
            error,
          })
          throw error
        })
        .finally(() => {
          // Only if this is still the current request for the key. A forced
          // read chains onto an in-flight one, so the older request settles
          // while the newer holds the slot — clearing it unconditionally would
          // drop the live entry and let the next reader start a third fetch.
          if (inFlight.current.get(key) === request) inFlight.current.delete(key)
        })

      inFlight.current.set(key, request)
      return request
    },
    [write],
  )

  /** Writes a known value straight in — a mutation's own response. */
  const set = useCallback(
    (key, data) => {
      if (!key) return
      write(key, { status: RESOURCE_STATUS.ready, data, error: null })
    },
    [write],
  )

  /** Drops one key, so the next read fetches. */
  const invalidate = useCallback((key) => {
    if (!key) return
    inFlight.current.delete(key)
    setEntries((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      entriesRef.current = next
      return next
    })
  }, [])

  /** Drops every key whose name starts with a prefix — one project's data. */
  const invalidatePrefix = useCallback((prefix) => {
    if (!prefix) return
    setEntries((prev) => {
      const keys = Object.keys(prev).filter((key) => key.startsWith(prefix))
      if (keys.length === 0) return prev

      const next = { ...prev }
      keys.forEach((key) => {
        delete next[key]
        inFlight.current.delete(key)
      })
      entriesRef.current = next
      return next
    })
  }, [])

  const read = useCallback((key) => entries[key] ?? EMPTY_ENTRY, [entries])

  return { entries, read, load, set, invalidate, invalidatePrefix }
}
