/**
 * Kraios notification helpers — the ONE way the product raises a toast.
 *
 * Plain `.js` on purpose: `KraiosToaster.jsx` exports ONLY a component, so
 * React Fast Refresh keeps working for every consumer. Mixing a component and
 * plain helpers in one module broke it before; the split is deliberate.
 *
 * Presentation — position, surface, icons, close control, motion — belongs to
 * `KraiosToaster`. Nothing here styles a toast. What lives here is the semantic
 * API (`showSuccessToast` / `showErrorToast` / `showInfoToast` /
 * `showLoadingToast` / `dismissToast`) and the durations that go with it, so a
 * caller never reaches for the library directly and timings cannot drift page
 * to page.
 *
 * Stable ids: pass `{ id: 'some-event' }` for anything a user can fire
 * repeatedly (a workflow gate, a rejected file, a blocked action). React Hot
 * Toast replaces the toast that already holds that id instead of stacking a
 * tenth copy of it.
 */

import hotToast from 'react-hot-toast'

/** Errors linger longest — an error the user missed is an error they repeat. */
export const TOAST_DURATION = {
  success: 3000,
  info: 3500,
  error: 4500,
}

const SEMANTIC_TYPES = ['success', 'error', 'loading']

/**
 * The semantic kind of a live toast: 'success' | 'error' | 'loading' | 'info'.
 *
 * React Hot Toast knows `success`, `error`, `loading` and `blank` — there is no
 * `info` type. `showInfoToast` is the only thing in the product that raises a
 * blank toast, so a blank toast IS the info toast, and the Toaster reads its
 * accent from here rather than from a second marker that could disagree.
 */
export function toastKind(toast) {
  return SEMANTIC_TYPES.includes(toast?.type) ? toast.type : 'info'
}

export function showSuccessToast(message, options) {
  return hotToast.success(message, { duration: TOAST_DURATION.success, ...options })
}

export function showErrorToast(message, options) {
  return hotToast.error(message, { duration: TOAST_DURATION.error, ...options })
}

export function showInfoToast(message, options) {
  return hotToast(message, { duration: TOAST_DURATION.info, ...options })
}

/**
 * Stays up until it is dismissed or replaced — that is the contract of a
 * loading toast, and the caller owns ending it. Resolve it by passing the same
 * id to `showSuccessToast` / `showErrorToast`, or by `dismissToast(id)`; never
 * leave one hanging.
 */
export function showLoadingToast(message, options) {
  return hotToast.loading(message, options)
}

/** Dismiss one toast by id, or every toast when called with nothing. */
export function dismissToast(id) {
  hotToast.dismiss(id)
}
