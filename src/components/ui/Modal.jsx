import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { X } from '@phosphor-icons/react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog used by every success state.
 *
 * Handles the four things a hand-rolled modal usually gets wrong: Escape to
 * close, focus moved in on open and restored to the trigger on close, Tab
 * cycled inside the panel, and the background locked from scrolling.
 */
export default function Modal({ open, onClose, title, children, labelledBy = 'modal-title' }) {
  const scope = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const returnFocusRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!open) return

    // remember what to hand focus back to
    returnFocusRef.current = document.activeElement

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      // keep Tab inside the panel
      const items = panelRef.current?.querySelectorAll(FOCUSABLE)
      if (!items?.length) return

      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // focus the close button rather than the panel, so Escape/Tab work at once
    const raf = requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
      returnFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  useGSAP(
    () => {
      if (!open || reduced) return

      gsap
        .timeline()
        .fromTo('[data-modal-scrim]', { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' })
        .fromTo(
          '[data-modal-panel]',
          { opacity: 0, y: 24, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'expo.out' },
          '-=0.16',
        )
    },
    { scope, dependencies: [open, reduced] },
  )

  if (!open) return null

  return (
    <div ref={scope} className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      {/* scrim: strong enough to isolate the panel, and click-to-close */}
      <button
        data-modal-scrim
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-navy/70 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        data-modal-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="tone-light relative w-full max-w-lg border border-[var(--tone-line-strong)] p-8 shadow-[0_30px_80px_-40px_rgba(7,20,38,0.5)] sm:p-10"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--tone-muted)] transition-colors duration-300 hover:text-[var(--tone-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]"
        >
          <X size={20} weight="light" aria-hidden="true" />
        </button>

        {/* `display-sm` — the same tier the auth page titles use, so the dialog
            heading reads in the same display voice as the "LOGIN" behind it.
            Both dialogs render through this one heading, so they cannot drift. */}
        {title && (
          <h2 id={labelledBy} className="display-sm pr-12 text-[var(--tone-ink)]">
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  )
}
