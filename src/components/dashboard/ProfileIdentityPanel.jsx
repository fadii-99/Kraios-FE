import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Buildings,
  EnvelopeSimple,
  GlobeSimple,
  ShieldCheck,
} from '@phosphor-icons/react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * ProfileIdentityPanel — Architectural Wide Profile Overview Sheet.
 * Features the signature Kraios Squared Blueprint Grid Backdrop (from Step 2 Design Assistant),
 * generous vertical height, spacious padding, and balanced 2-zone layout.
 */
export default function ProfileIdentityPanel({
  profile = {},
  onEdit,
  onResetPassword,
  onDeleteAccount,
}) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const {
    name = 'User',
    full_name = '',
    email = 'user@kraios.ai',
    firm_name = '',
    company = '',
    country = '',
    role = 'Architect Account',
    is_active = true,
  } = profile

  const displayName = full_name || name || 'Architect User'
  const displayFirm = firm_name || company || '—'
  const displayCountry = country || '—'
  const displayRole = role || 'Architect Account'

  // Generate 1-2 letter uppercase initials from name
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      tl.fromTo(
        '[data-identity-card]',
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DASHBOARD_MOTION.duration,
        },
      ).fromTo(
        '[data-profile-item]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        {
          opacity: 1,
          y: 0,
          duration: DASHBOARD_MOTION.durationFast,
          stagger: 0.03,
        },
        0.08,
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <div ref={scope} className="relative w-full flex justify-center">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 bg-radial from-[var(--color-brand)]/15 via-[var(--color-brand-deep)]/5 to-transparent blur-3xl"
      />

      <div
        data-identity-card
        className={cn(
          'group relative w-full max-w-[960px] overflow-hidden rounded-xl min-h-[460px] sm:min-h-[490px]',
          'border border-[var(--tone-line-strong)] bg-white shadow-[0_24px_70px_-25px_rgba(7,20,38,0.2)] transition-all duration-300',
          'hover:border-[var(--color-brand-deep)]/40 hover:shadow-[0_28px_80px_-25px_rgba(11,94,215,0.24)]',
        )}
      >
        {/* ─── Architectural Squared Blueprint Grid Backdrop (Kraios Step 2 Theme) ─── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1200 650"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              {/* Fine 32px square grid */}
              <pattern
                id="profileFineGrid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M32 0H0V32"
                  stroke="#1677FF"
                  strokeOpacity="0.14"
                  strokeWidth="1"
                />
              </pattern>
              {/* Dot grid intersections */}
              <pattern
                id="profileDotsGrid"
                width="64"
                height="64"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="1"
                  cy="1"
                  r="1.3"
                  fill="#0B5ED7"
                  fillOpacity="0.20"
                />
              </pattern>
            </defs>

            {/* Grid layers */}
            <rect width="1200" height="650" fill="url(#profileFineGrid)" />
            <rect width="1200" height="650" fill="url(#profileDotsGrid)" />

            {/* Technical dimension strings & registration marks */}
            <g stroke="#0B5ED7" strokeOpacity="0.26" strokeWidth="1.1">
              {/* Top dimension ruler bar */}
              <path d="M60 40h420" />
              <path d="M60 32v16M200 32v16M340 32v16M480 32v16" />
              {/* Corner registration marks */}
              <path d="M24 24h28M24 24v28" />
              <path d="M1176 24h-28M1176 24v28" />
              <path d="M24 626h28M24 626v-28" />
              <path d="M1176 626h-28M1176 626v-28" />
            </g>

            {/* Crosshair point in corner */}
            <g stroke="#0B5ED7" strokeOpacity="0.30" strokeWidth="1.1">
              <path d="M1080 75h24M1092 63v24" />
              <circle cx="1092" cy="75" r="5" strokeOpacity="0.35" />
            </g>
          </svg>

          {/* Technical coordinate label */}
          <span className="absolute right-5 top-5 select-none font-mono text-[0.625rem] font-semibold tracking-[0.2em] text-[var(--color-brand-deep)]/45">
            CAD · ARCH-PROFILE 01-01
          </span>
        </div>

        {/* Top Blue Brand Datum Rule */}
        <span
          aria-hidden="true"
          className="absolute -top-px left-0 z-20 h-[3.5px] w-40 origin-left rounded-tl-xl bg-[var(--color-brand-deep)] shadow-[0_0_8px_rgba(11,94,215,0.35)]"
        />

        {/* Top Delicate Shimmer Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--color-brand)]/35 to-transparent"
        />

        {/* ── Main 2-Zone Grid ── */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[460px] sm:min-h-[490px]">
          {/* ── LEFT ZONE: Identity Showcase (Avatar, Name, Email, Role Tag) ── */}
          <div className="flex flex-col items-center justify-center border-b border-[var(--tone-line)]/80 bg-white/75 backdrop-blur-[2px] px-8 py-10 sm:px-10 sm:py-12 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-10 lg:py-14 text-center">
            {/* Live Role Badge */}
            <div data-profile-item className="mb-4 sm:mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-emerald-800 shadow-2xs backdrop-blur-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.14em]">
                  {displayRole}
                </span>
              </div>
            </div>

            {/* Round Avatar Circle (Larger & Prominent) */}
            <div
              data-profile-item
              className="relative mx-auto flex h-28 w-28 sm:h-32 sm:w-32 lg:h-34 lg:w-34 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-600 via-[var(--color-brand-deep)] to-indigo-700 shadow-[0_14px_36px_rgba(11,94,215,0.30)] ring-4 ring-[var(--color-brand-deep)]/15 transition-transform duration-300 group-hover:scale-105"
            >
              <span
                className="text-[2.25rem] sm:text-[2.65rem] font-black tracking-tight text-white select-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {initials}
              </span>
            </div>

            {/* User Full Name */}
            <h2
              data-profile-item
              className="mt-4 sm:mt-5 text-[1.4375rem] sm:text-[1.625rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {displayName}
            </h2>

            {/* User Email */}
            <p
              data-profile-item
              className="mt-2 flex items-center justify-center gap-1.5 text-[0.875rem] font-medium text-[var(--tone-muted-dark)]"
            >
              <EnvelopeSimple
                size={16}
                weight="duotone"
                className="shrink-0 text-[var(--color-brand-deep)]"
              />
              <span className="truncate max-w-[240px]">{email}</span>
            </p>
          </div>

          {/* ── RIGHT ZONE: 3 Metadata Tiles + 3 Actions ── */}
          <div className="flex flex-col justify-between bg-white/60 backdrop-blur-[2px] px-8 py-10 sm:px-10 sm:py-12 lg:col-span-7 lg:px-10 lg:py-12">
            {/* 3 Metadata Tiles Grid */}
            <div data-profile-item className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              {/* Tile 1: Firm / Organization */}
              <div className="flex items-center gap-3.5 rounded-lg border border-[var(--tone-line)] bg-white/90 p-3.5 sm:p-4 shadow-2xs transition-colors hover:border-slate-300 hover:bg-white">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[var(--color-brand-deep)] shadow-2xs">
                  <Buildings size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-[var(--tone-muted)]">
                    Firm / Organization
                  </p>
                  <p className="truncate text-[0.875rem] sm:text-[0.9375rem] font-bold text-[var(--tone-ink)] mt-0.5">
                    {displayFirm}
                  </p>
                </div>
              </div>

              {/* Tile 2: Country */}
              <div className="flex items-center gap-3.5 rounded-lg border border-[var(--tone-line)] bg-white/90 p-3.5 sm:p-4 shadow-2xs transition-colors hover:border-slate-300 hover:bg-white">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[var(--color-brand-deep)] shadow-2xs">
                  <GlobeSimple size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-[var(--tone-muted)]">
                    Country / Region
                  </p>
                  <p className="truncate text-[0.875rem] sm:text-[0.9375rem] font-bold text-[var(--tone-ink)] mt-0.5">
                    {displayCountry}
                  </p>
                </div>
              </div>

              {/* Tile 3: Status — spans full row */}
              <div className="flex items-center gap-3.5 rounded-lg border border-[var(--tone-line)] bg-white/90 p-3.5 sm:p-4 shadow-2xs transition-colors hover:border-slate-300 hover:bg-white sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 shadow-2xs">
                  <ShieldCheck size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-[var(--tone-muted)]">
                    Account Status
                  </p>
                  <p className="truncate text-[0.875rem] sm:text-[0.9375rem] font-bold text-emerald-800 mt-0.5">
                    {is_active ? 'Active & Verified' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div data-profile-item className="mt-6 sm:mt-7 border-t border-[var(--tone-line)]/80 pt-5 sm:pt-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {/* 1. Edit Profile (Blue Primary) */}
                <PrimaryButton
                  type="button"
                  onClick={onEdit}
                  variant="solid"
                  size="compact"
                  align="center"
                  withArrow={false}
                  className="w-full h-10 min-h-10 shadow-[0_3px_14px_rgba(11,94,215,0.22)] text-[0.8125rem] font-bold uppercase tracking-wider"
                >
                  <span className="whitespace-nowrap">Edit Profile</span>
                </PrimaryButton>

                {/* 2. Reset Password (Outline) */}
                <PrimaryButton
                  type="button"
                  onClick={onResetPassword}
                  variant="outline"
                  size="compact"
                  align="center"
                  withArrow={false}
                  className="w-full h-10 min-h-10 bg-white hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)] text-[0.8125rem] font-bold uppercase tracking-wider"
                >
                  <span className="whitespace-nowrap">Reset Password</span>
                </PrimaryButton>

                {/* 3. Delete Account (Red Danger) */}
                <PrimaryButton
                  type="button"
                  onClick={onDeleteAccount}
                  variant="danger"
                  size="compact"
                  align="center"
                  withArrow={false}
                  className="w-full h-10 min-h-10 text-[0.8125rem] font-bold uppercase tracking-wider"
                >
                  <span className="whitespace-nowrap">Delete Account</span>
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
