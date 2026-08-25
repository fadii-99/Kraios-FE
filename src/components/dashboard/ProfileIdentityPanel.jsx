import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { cn } from '@/lib/cn'

/**
 * ProfileIdentityPanel — Clean, Minimal Architectural Identity Card.
 * Purely displays: Avatar / Icon, Name, and Email.
 */
export default function ProfileIdentityPanel({ profile = {} }) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const {
    name = 'Usama',
    email = 'usama@kraios.ai',
  } = profile


  // Generate 1-2 letter initials from name
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'

  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-identity-card]',
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DASHBOARD_MOTION.duration,
          ease: DASHBOARD_MOTION.ease,
        },
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <div
      ref={scope}
      className="flex w-full flex-col items-center justify-center"
    >
      <div
        data-identity-card
        className={cn(
          'group relative flex w-full max-w-[320px] flex-col items-center rounded-md text-center',
          'border border-[var(--tone-line)] bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40 p-8 sm:p-10',
          'shadow-[0_4px_20px_rgba(7,20,38,0.03)] transition-all duration-300',
          'hover:border-[var(--color-brand-deep)]/35 hover:shadow-[0_10px_30px_rgba(7,20,38,0.06)]',
        )}
      >
        {/* ── Avatar Circle ── */}
        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-600 via-[var(--color-brand-deep)] to-indigo-700 shadow-[0_8px_24px_rgba(11,94,215,0.25)] ring-4 ring-[var(--color-brand-deep)]/10 transition-transform duration-300 group-hover:scale-105">
          <span
            className="text-[2rem] sm:text-[2.25rem] font-bold tracking-tight text-white select-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {initials}
          </span>
        </div>

        {/* ── User Full Name ── */}
        <h3
          className="mt-5 text-[1.5rem] sm:text-[1.625rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] transition-transform duration-300 group-hover:translate-y-[-1px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {name}
        </h3>

        {/* ── User Email ── */}
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[0.875rem] font-medium text-[var(--tone-muted-dark)]">
          <EnvelopeSimple size={15} weight="duotone" className="shrink-0 text-[var(--color-brand-deep)]" />
          <span className="truncate max-w-[220px]">{email}</span>
        </p>
      </div>
    </div>
  )
}


