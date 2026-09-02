import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Debounced autosave for an edit surface that persists on its own.
 *
 * This is the first debounce in the codebase, and it exists for one reason:
 * every BoQ table edit is a `POST /step-3/versions/manual/` that mints a new
 * immutable backend version (CLAUDE.md §25). Saving per keystroke would mint a
 * version per character, so keystrokes are coalesced and only the settled row
 * set is sent.
 *
 * `schedule` replaces any pending payload rather than queueing it — the last
 * edit is the whole truth, so an older one has nothing to contribute.
 *
 * `flush` is what a close button calls: it sends the pending payload
 * immediately and resolves when the write is done, so the caller can reload
 * afterwards. Unmount also fires a pending payload, deliberately without
 * awaiting it, because losing a typed edit is worse than a request outliving
 * the component that started it.
 */
export function useDebouncedSave(save, { delay = 800 } = {}) {
  const saveRef = useRef(save)
  const timerRef = useRef(null)
  const pendingRef = useRef(null)
  const activeRef = useRef(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const run = useCallback(async () => {
    const payload = pendingRef.current
    if (payload === null) return

    pendingRef.current = null
    if (activeRef.current) setSaving(true)
    try {
      await saveRef.current?.(payload)
    } finally {
      if (activeRef.current) setSaving(false)
    }
  }, [])

  const schedule = useCallback(
    (payload) => {
      pendingRef.current = payload
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        run()
      }, delay)
    },
    [delay, run],
  )

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current)
    await run()
  }, [run])

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current)
    pendingRef.current = null
  }, [])

  useEffect(
    () => () => {
      activeRef.current = false
      clearTimeout(timerRef.current)
      const payload = pendingRef.current
      pendingRef.current = null
      if (payload !== null) saveRef.current?.(payload)
    },
    [],
  )

  return { schedule, flush, cancel, saving }
}
