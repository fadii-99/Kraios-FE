import { lazy } from 'react'

/**
 * `React.lazy`, but a failed chunk fetch reloads the page once instead of
 * crashing the route.
 *
 * Every deploy renames the hashed chunks under /assets, and the old ones are
 * gone. A tab opened before the deploy still holds the old entry bundle, so the
 * first lazy page it navigates to asks for a chunk that now 404s ("Failed to
 * fetch dynamically imported module"). A full reload picks up the new
 * index.html and its new chunk names, which is exactly what fixing it by hand
 * does.
 *
 * The sessionStorage stamp stops a reload loop: if the chunk is still missing
 * right after a reload (a genuinely broken build, or offline), the error is
 * rethrown and reaches the router's error UI as before.
 */
const RELOAD_KEY = 'kraios:chunk-reload-at'
const RELOAD_WINDOW_MS = 10_000

function readStamp() {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY)) || 0
  } catch {
    return 0
  }
}

function writeStamp(value) {
  try {
    if (value) sessionStorage.setItem(RELOAD_KEY, String(value))
    else sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    // Storage blocked: worst case one extra failed load surfaces the error.
  }
}

export default function lazyWithReload(importer) {
  return lazy(() =>
    importer().then(
      (module) => {
        writeStamp(0)
        return module
      },
      (error) => {
        if (Date.now() - readStamp() > RELOAD_WINDOW_MS) {
          writeStamp(Date.now())
          window.location.reload()
          // Keep Suspense showing its fallback until the reload takes over.
          return new Promise(() => {})
        }
        throw error
      },
    ),
  )
}
