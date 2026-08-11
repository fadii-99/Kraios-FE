import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { X } from '@phosphor-icons/react'

import { authLinks, navLinks, site } from '@/lib/content'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Full-screen mobile navigation. Locks body scroll and closes on Escape.
 */
export default function MobileMenu({ open, onClose, onNavigate, onRoute, activeId }) {
  const scope = useRef(null)
  const closeRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!open) return

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useGSAP(
    () => {
      if (!open || reduced) return

      gsap
        .timeline()
        .fromTo(
          '[data-menu-panel]',
          { yPercent: -100 },
          { yPercent: 0, duration: 0.6, ease: 'expo.out' },
        )
        .fromTo(
          '[data-menu-item]',
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out' },
          '-=0.28',
        )
        .fromTo('[data-menu-foot]', { opacity: 0 }, { opacity: 1, duration: 0.45 }, '-=0.2')
    },
    { scope, dependencies: [open, reduced] },
  )

  if (!open) return null

  return (
    <div
      ref={scope}
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div data-menu-panel className="tone-dark flex h-full w-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--tone-line)] px-[var(--spacing-gutter)] py-5">
          <span className="label-mono text-[var(--tone-muted)]">Menu</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--tone-ink)] transition-colors hover:text-[var(--tone-accent)]"
          >
            <X size={22} weight="light" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col justify-center overflow-y-auto px-[var(--spacing-gutter)] py-6">
          {navLinks.map((link, i) => (
            <button
              key={link.id}
              data-menu-item
              type="button"
              onClick={() => onNavigate(link.id)}
              className="group flex items-baseline gap-5 border-b border-[var(--tone-line)] py-5 text-left"
            >
              <span className="label-mono w-8 shrink-0 text-[var(--tone-accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              {/* `display-sm`, not `display-lg` + a text-[] override: the
                  override never applied, so seven items rendered at 44px and
                  crowded the panel on a short phone. */}
              <span
                className={`display-sm transition-colors duration-300 ${
                  activeId === link.id
                    ? 'text-[var(--tone-accent)]'
                    : 'text-[var(--tone-ink)] group-hover:text-[var(--tone-accent)]'
                }`}
              >
                {link.label}
              </span>
            </button>
          ))}
        </nav>

        <div
          data-menu-foot
          className="border-t border-[var(--tone-line)] px-[var(--spacing-gutter)] py-6"
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onRoute(authLinks.login.to)}
              className="label-mono min-h-12 flex-1 cursor-pointer border border-[var(--tone-line-strong)] px-5 py-3 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
            >
              {authLinks.login.label}
            </button>
            <button
              type="button"
              onClick={() => onRoute(authLinks.signup.to)}
              className="label-mono min-h-12 flex-1 cursor-pointer bg-[var(--tone-accent)] px-5 py-3 text-[var(--color-ink-dark)] transition-colors hover:bg-[#5ca5ff]"
            >
              {authLinks.signup.label}
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-1.5">
            <a
              href={`mailto:${site.email}`}
              className="text-[0.9375rem] text-[var(--tone-ink)] transition-colors hover:text-[var(--tone-accent)]"
            >
              {site.email}
            </a>
            <span className="label-mono text-[var(--tone-muted)]">{site.phone}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
