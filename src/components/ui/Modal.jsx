import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { X } from '@phosphor-icons/react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog used by every modal state.
 *
 * Rendered via createPortal into document.body so the scrim covers the entire
 * viewport (including the sidebar and header) without being trapped in child
 * stacking contexts.
 */
export default function Modal({ open, onClose, title, children, labelledBy = 'modal-title' }) {
  const scope = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const returnFocusRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  // `onClose` is usually an inline arrow in the parent, so a new identity every
  // parent render. Kept in a ref so the effect below depends on `open` alone.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    // remember what to hand focus back to
    returnFocusRef.current = document.activeElement

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE)
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    // Focus the first actionable control once mounted
    const raf = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE)
      const target = focusable?.[0] || panelRef.current
      target?.focus?.()
    })

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
      returnFocusRef.current?.focus?.()
    }
  }, [open])

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

  return createPortal(
    <div ref={scope} className="fixed inset-0 z-[999] flex items-center justify-center p-5">
      {/* scrim: strong enough to isolate the panel, covers whole viewport including sidebar */}
      <button
        data-modal-scrim
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#071426]/70 backdrop-blur-[3px]"
      />

      <div
        ref={panelRef}
        data-modal-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="tone-light relative max-h-full w-full max-w-lg overflow-y-auto border border-[var(--tone-line-strong)] bg-white p-8 shadow-[0_30px_80px_-40px_rgba(7,20,38,0.5)] sm:p-10"
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

        {title && (
          <h2
            id={labelledBy}
            className="pr-12 text-[1.625rem] font-extrabold uppercase leading-tight tracking-[-0.03em] text-[var(--tone-ink)] sm:text-[1.875rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>,
    document.body,
  )
}
