import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, CircleDashed, Sparkle } from '@phosphor-icons/react'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Logo from '@/components/ui/Logo'
import { RENDERING_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Step 2 Gateway — Grand, high-aesthetic entry point to Kraios Design Assistant.
 * Features prominent Kraios branding, radiant background glows, large display typography,
 * smooth architectural micro-animations, and dynamic approved state.
 */
export default function DesignAssistantGateway({
  to,
  note,
  approved = false,
  className,
}) {
  const noteText = note?.text || RENDERING_COPY.statusPendingNote
  const containerRef = useRef(null)
  const logoRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      // Smooth floating animation on the Kraios logo tile
      gsap.to(logoRef.current, {
        y: -5,
        duration: 2.6,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
      })

      // Delicate micro-glitter twinkle on sparkle 1
      gsap.to('[data-sparkle-1]', {
        scale: 1.3,
        opacity: 0.9,
        rotation: 30,
        duration: 1.9,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })

      // Delicate micro-glitter twinkle on sparkle 2
      gsap.to('[data-sparkle-2]', {
        scale: 1.35,
        opacity: 0.85,
        rotation: -35,
        duration: 2.3,
        delay: 0.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })

      // Subtle light sheen sweep across the card
      gsap.fromTo(
        '[data-sheen]',
        { x: '-120%', opacity: 0 },
        {
          x: '480%',
          opacity: 1,
          duration: 3.2,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 3.5,
        },
      )

      // Staggered reveal for gateway components
      gsap.fromTo(
        '[data-gateway-item]',
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.1,
        },
      )
    },
    { scope: containerRef, dependencies: [reduced, approved] },
  )

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 bg-radial from-[var(--color-brand)]/15 via-[var(--color-brand-deep)]/5 to-transparent blur-3xl"
      />

      <FloorPlanWorkArea
        className={cn(
          'relative w-full overflow-hidden border border-[var(--tone-line-strong)] bg-white/95 shadow-[0_12px_40px_rgba(7,20,38,0.06)] backdrop-blur-sm transition-all duration-300',
          className,
        )}
      >
        {/* ─── Architectural Squared Blueprint Grid Backdrop (Kraios Blue - Balanced Opacity) ─── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden opacity-100"
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1200 600"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              {/* Fine 32px square grid */}
              <pattern
                id="designFineGrid"
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
                id="designDotsGrid"
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
            <rect width="1200" height="600" fill="url(#designFineGrid)" />
            <rect width="1200" height="600" fill="url(#designDotsGrid)" />

            {/* Technical dimension strings & registration marks */}
            <g stroke="#0B5ED7" strokeOpacity="0.26" strokeWidth="1.1">
              {/* Top dimension ruler bar */}
              <path d="M60 40h420" />
              <path d="M60 32v16M200 32v16M340 32v16M480 32v16" />
              {/* Corner registration marks */}
              <path d="M24 24h28M24 24v28" />
              <path d="M1176 24h-28M1176 24v28" />
              <path d="M24 576h28M24 576v-28" />
              <path d="M1176 576h-28M1176 576v-28" />
            </g>

            {/* Crosshair point in corner */}
            <g stroke="#0B5ED7" strokeOpacity="0.30" strokeWidth="1.1">
              <path d="M1080 80h24M1092 68v24" />
              <circle cx="1092" cy="80" r="5" strokeOpacity="0.35" />
            </g>
          </svg>

          {/* Technical coordinate label */}
          <span
            className="absolute right-4 top-4 select-none font-mono text-[0.625rem] font-semibold tracking-[0.2em] text-[var(--color-brand-deep)]/45"
          >
            CAD · ARCH-3D 02-04
          </span>
        </div>


        {/* Subtle Specular Glitter Sheen Sweep across Card */}
        <div
          data-sheen
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-16 -left-32 z-10 w-32 -rotate-12 bg-gradient-to-r from-transparent via-blue-400/[0.08] to-transparent blur-md"
        />

        {/* Top Delicate Shimmer Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--color-brand)]/35 to-transparent"
        />

        {/* Main Card Hero Area */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-9 text-center sm:px-10 sm:py-12 md:flex-row md:items-center md:gap-10 lg:gap-14 md:px-12 lg:px-14 md:py-12 md:text-left">

          {/* Prominent Kraios Logo Tile with ambient glow & micro-glitter */}
          <div data-gateway-item className="relative shrink-0">
            <div
              aria-hidden="true"
              className="absolute -inset-3 bg-radial from-[var(--color-brand)]/25 to-transparent blur-xl"
            />
            <div
              ref={logoRef}
              className="relative flex h-24 w-24 items-center justify-center rounded-md border border-[var(--color-brand-deep)]/20 bg-white/95 p-4 shadow-[0_10px_30px_rgba(22,119,255,0.15)] transition-transform duration-300 hover:scale-105 sm:h-28 sm:w-28 sm:p-5"
            >
              {/* Delicate Micro-Glitter Sparkle 1 */}
              <span
                data-sparkle-1
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-2 text-[var(--color-brand)] opacity-40 drop-shadow-[0_0_6px_rgba(22,119,255,0.6)]"
              >
                <Sparkle size={15} weight="fill" />
              </span>

              {/* Delicate Micro-Glitter Sparkle 2 */}
              <span
                data-sparkle-2
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1.5 -left-1.5 text-[var(--color-brand-deep)] opacity-30 drop-shadow-[0_0_5px_rgba(11,94,215,0.5)]"
              >
                <Sparkle size={11} weight="fill" />
              </span>

              <Logo size="hero" className="h-full w-full object-contain" />
            </div>
          </div>

          {/* Copy Area */}
          <div data-gateway-item className="min-w-0 flex-1 md:pr-4 lg:pr-6">
            {/* Live Status Badge */}
            <div
              className={cn(
                'mb-2.5 inline-flex items-center gap-2 rounded-xs border px-3 py-1 transition-colors',
                approved
                  ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800'
                  : 'border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/[0.05] text-[var(--color-brand-deep)]',
              )}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                    approved ? 'bg-emerald-400' : 'bg-blue-400',
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    approved ? 'bg-emerald-500' : 'bg-blue-500',
                  )}
                />
              </span>
              <span className="label-ui text-[0.625rem] font-bold uppercase tracking-[0.14em]">
                {approved ? '3D Floor Model Approved' : 'Architectural AI 3D Engine'}
              </span>
            </div>

            <h2
              className="text-[1.625rem] font-black uppercase leading-tight tracking-[-0.03em] text-[var(--tone-ink)] sm:text-[2rem] lg:text-[2.25rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {RENDERING_COPY.assistantTitle}
            </h2>

            <p className="mt-2.5 max-w-xl text-[0.875rem] font-normal leading-relaxed text-[var(--tone-muted-dark)] sm:text-[0.9375rem] lg:text-[1rem]">
              {RENDERING_COPY.assistantBlurb}
            </p>
          </div>

          {/* CTA Action Area: Vertically Centered */}
          <div data-gateway-item className="flex w-full shrink-0 flex-col items-center sm:w-auto md:self-center md:pl-2">
            <PrimaryButton
              as={Link}
              to={to}
              size="default"
              align="center"
              withArrow={false}
              className="w-full sm:w-68 whitespace-nowrap shadow-[0_4px_16px_rgba(11,94,215,0.22)]"
            >
              <span className="flex items-center justify-center gap-2.5 whitespace-nowrap">
                <span>{RENDERING_COPY.assistantCta}</span>
                <ArrowRight size={17} weight="bold" />
              </span>
            </PrimaryButton>
          </div>
        </div>

        {/* Bottom Status Notice Strip (Green light bg when approved, Red light bg when not approved) */}
        <div
          className={cn(
            'flex items-center justify-center border-t px-5 py-3.5 sm:px-7 sm:py-4 transition-colors duration-300',
            approved
              ? 'border-emerald-500/20 bg-emerald-500/[0.045]'
              : 'border-red-500/15 bg-red-500/[0.035]',
          )}
        >
          <p
            className={cn(
              'flex items-center justify-center gap-2.5 text-center text-[0.75rem] font-medium sm:text-[0.8125rem]',
              approved
                ? 'text-emerald-700'
                : 'text-[var(--color-danger,#b42318)]',
            )}
          >
            {approved ? (
              <CheckCircle
                size={16}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-emerald-600"
              />
            ) : (
              <CircleDashed
                size={15}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-[var(--color-danger,#b42318)]"
              />
            )}
            <span>
              {approved
                ? '3D design approved. You can now continue to Step 3: BoQ.'
                : noteText}
            </span>
          </p>
        </div>
      </FloorPlanWorkArea>
    </div>
  )
}
