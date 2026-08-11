import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import BlueprintBackdrop from '@/components/ui/BlueprintBackdrop'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Shared frame for every auth page: light architectural background, centred
 * white card. Auth pages get a short entrance and nothing scroll-driven —
 * usability first, per the brief.
 *
 * `pt-28` clears the fixed navbar.
 */
export default function AuthShell({ eyebrow, title, description, children, width = 'max-w-xl' }) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(
          '[data-auth-card]',
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.7 },
        )
        .fromTo(
          '[data-auth-head] > *',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 },
          '-=0.45',
        )
        .fromTo(
          '[data-auth-body] > *',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 },
          '-=0.35',
        )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <main
      ref={scope}
      id="main"
      // min-h uses svh minus the navbar so the card still fills the screen on
      // short pages, without pushing the footer a full viewport further down.
      className="tone-light relative flex min-h-[calc(100svh-4.75rem)] items-center overflow-x-clip px-[var(--spacing-gutter)] pb-20 pt-28 lg:pb-24 lg:pt-32"
    >
      <BlueprintBackdrop className="text-[var(--tone-ink)]" />

      <div
        data-auth-card
        className={cn(
          'relative mx-auto w-full border border-[var(--tone-line-strong)] bg-white',
          'p-7 shadow-[0_28px_70px_-50px_rgba(7,20,38,0.45)] sm:p-10 lg:p-12',
          width,
        )}
      >
        <div data-auth-head>
          <p className="label-mono text-[var(--tone-accent)]">{eyebrow}</p>

          {/* `display-sm` is the sub-display tier. It was `display-lg` plus a
              text-[] size override, which never took effect — the title
              rendered at the full 89px section size and wrapped inside the
              card. */}
          <h1 className="display-sm mt-5 text-[var(--tone-ink)]">{title}</h1>

          {description && (
            <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--tone-muted)]">
              {description}
            </p>
          )}
        </div>

        <div data-auth-body className="mt-10">{children}</div>
      </div>
    </main>
  )
}
