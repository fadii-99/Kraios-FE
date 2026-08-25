import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  CheckCircle,
  Coins,
  Info,
  Ruler,
  StackSimple,
  Table,
} from '@phosphor-icons/react'





import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Logo from '@/components/ui/Logo'
import { BOQ_COPY } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

const OUTPUT_THEMES = {
  quantities: {
    icon: Ruler,
    badgeClass: 'bg-blue-50 text-blue-600 border border-blue-200/80',
  },
  categories: {
    icon: StackSimple,
    badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
  },
  costing: {
    icon: Coins,
    badgeClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
  },
  finalBoq: {
    icon: Table,
    badgeClass: 'bg-purple-50 text-purple-600 border border-purple-200/80',
  },
}




/**
 * Step 3 BoQ Assistant Gateway — Redesigned specifically for Bill of Quantities (BoQ)
 *
 * Features:
 * - Technical squared blueprint grid backdrop with crosshairs & dimension marks
 * - Prominent BoQ identity tile with calculator badge & micro-glitter sparkles
 * - 4 itemized BoQ capability highlight chips
 * - 2D & 3D full-screen lightbox preview buttons
 * - Simple bottom strip allowing users to skip BoQ to Step 4 Output anytime
 */
export default function BoQAssistantGateway({
  source,
  approvedRender,
  isBoqApproved = false,
  to,
  outputPath,
  className,
}) {

  const [activePreview, setActivePreview] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const containerRef = useRef(null)
  const logoRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  const handleOpen2D = () => {
    setActivePreview({
      previewUrl: source?.previewUrl || source?.imageUrl,
      imageUrl: source?.imageUrl || source?.previewUrl,
      name: source?.name || '2D Floor Plan Design',
      extension: source?.extension || '2D Plan',
    })
    setPreviewOpen(true)
  }

  const handleOpen3D = () => {
    const imgUrl = approvedRender?.imageUrl || '/assets/plan-3d-light.svg'
    setActivePreview({
      previewUrl: imgUrl,
      imageUrl: imgUrl,
      name: approvedRender?.title || 'Approved 3D Floor Model',
      extension: '3D Render',
    })
    setPreviewOpen(true)
  }


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

      // Delicate micro-animation on measurement icon 1
      gsap.to('[data-measure-1]', {
        scale: 1.25,
        opacity: 0.95,
        rotation: 20,
        duration: 2.1,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })

      // Delicate micro-animation on measurement icon 2
      gsap.to('[data-measure-2]', {
        scale: 1.3,
        opacity: 0.9,
        rotation: -25,
        duration: 2.4,
        delay: 0.7,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })


      // Staggered reveal for gateway components
      gsap.fromTo(
        '[data-gateway-item]',
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.08,
        },
      )
    },
    { scope: containerRef, dependencies: [reduced, Boolean(approvedRender)] },
  )


  return (
    <div ref={containerRef} className="relative w-full">
      <FloorPlanWorkArea
        className={cn(
          'relative w-full overflow-hidden border border-[var(--tone-line-strong)] bg-white/95 shadow-[0_12px_40px_rgba(7,20,38,0.06)] backdrop-blur-sm transition-all duration-300',
          className,
        )}
      >
        {/* ─── Architectural Squared Blueprint Grid Backdrop (Kraios Blue) ─── */}
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
                id="boqFineGrid"
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
                id="boqDotsGrid"
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
            <rect width="1200" height="600" fill="url(#boqFineGrid)" />
            <rect width="1200" height="600" fill="url(#boqDotsGrid)" />

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
            BOQ · CSI-DIV 01-16
          </span>


        </div>

        {/* ─── Main Card Hero Area ─── */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-9 text-center sm:px-10 sm:py-12 md:flex-row md:items-start md:gap-10 lg:gap-14 md:px-12 lg:px-14 md:py-12 md:text-left">
          {/* Prominent Kraios Logo Tile with ambient glow & micro-glitter (Same as Design Assistant) */}
          <div data-gateway-item className="relative shrink-0">
            <div
              aria-hidden="true"
              className="absolute -inset-3 bg-radial from-[var(--color-brand)]/25 to-transparent blur-xl"
            />
            <div
              ref={logoRef}
              className="relative flex h-24 w-24 items-center justify-center rounded-md border border-[var(--color-brand-deep)]/20 bg-white/95 p-4 shadow-[0_10px_30px_rgba(22,119,255,0.15)] transition-transform duration-300 hover:scale-105 sm:h-28 sm:w-28 sm:p-5"
            >
              {/* Measurement Accent Icon 1 */}
              <span
                data-measure-1
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-2 text-[var(--color-brand)] opacity-60 drop-shadow-[0_0_6px_rgba(22,119,255,0.5)]"
              >
                <Ruler size={15} weight="bold" />
              </span>

              {/* Measurement Accent Icon 2 */}
              <span
                data-measure-2
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1.5 -left-1.5 text-[var(--color-brand-deep)] opacity-50 drop-shadow-[0_0_5px_rgba(11,94,215,0.4)]"
              >
                <Calculator size={12} weight="bold" />
              </span>

              <Logo size="hero" className="h-full w-full object-contain" />
            </div>
          </div>





          {/* ─── Left Information Area (Project-Specific BoQ Context) ─── */}
          <div data-gateway-item className="min-w-0 flex-1 space-y-4 md:pr-2 lg:pr-4 sm:space-y-4.5">
            {/* Title & Concise Supporting Sentences */}
            <div>
              {/* Live Status Badge */}
              <div
                className={cn(
                  'mb-2.5 inline-flex items-center gap-2 rounded-xs border px-3 py-1 transition-colors',
                  isBoqApproved
                    ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800'
                    : 'border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/[0.05] text-[var(--color-brand-deep)]',
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                      isBoqApproved ? 'bg-emerald-400' : 'bg-blue-400',
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      isBoqApproved ? 'bg-emerald-500' : 'bg-blue-500',
                    )}
                  />
                </span>
                <span className="label-ui text-[0.625rem] font-bold uppercase tracking-[0.14em]">
                  {isBoqApproved ? 'Bill of Quantities Approved' : 'AI BoQ & Cost Engine'}
                </span>
              </div>

              <h2
                className="text-[1.625rem] font-black uppercase leading-tight tracking-[-0.03em] text-[var(--tone-ink)] sm:text-[2rem] lg:text-[2.25rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Kraios BoQ <br className="hidden sm:inline" />Assistant
              </h2>
            </div>




            {/* ─── What You'll Build (Structured BoQ Outputs) ─── */}
            <div className="space-y-1.5 pt-1">
              <span className="label-ui text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--tone-muted)]">
                What You'll Build
              </span>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                {BOQ_COPY.buildOutputs.map((item) => {
                  const theme = OUTPUT_THEMES[item.id] || {
                    icon: Ruler,
                    badgeClass: 'bg-blue-50 text-blue-600 border border-blue-200/80',
                  }
                  const Icon = theme.icon

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2.5 rounded-sm border border-[var(--tone-line)] bg-white/70 p-2 text-left transition-all duration-200 hover:border-[var(--color-brand-deep)]/25 hover:bg-white hover:shadow-2xs"
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs shadow-2xs',
                          theme.badgeClass,
                        )}
                      >
                        <Icon size={12} weight="bold" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[0.75rem] font-bold tracking-tight text-[var(--tone-ink)]">
                          {item.title}
                        </h3>
                        <p className="text-[0.6875rem] leading-snug text-[var(--tone-muted-dark)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )
                })}

              </div>
            </div>

          </div>



          {/* CTA Action Area */}
          <div
            data-gateway-item
            className="flex w-full shrink-0 flex-col items-center gap-3.5 sm:w-auto md:items-stretch md:pl-2 md:pt-1"
          >
            <PrimaryButton
              as={Link}
              to={to}
              size="default"
              align="center"
              withArrow={false}
              className="w-full sm:w-68 whitespace-nowrap shadow-[0_4px_16px_rgba(11,94,215,0.22)]"
            >
              <span className="flex items-center justify-center gap-2.5 whitespace-nowrap">
                <Calculator size={18} weight="bold" />
                <span>Open BoQ Assistant</span>
                <ArrowRight size={16} weight="bold" />
              </span>
            </PrimaryButton>

            {/* Plans Section */}
            <div className="flex w-full flex-col gap-2 pt-2 sm:pt-2.5 border-t border-[var(--tone-line)]/80">
              <span
                className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em] text-slate-400 text-left px-0.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Plans
              </span>

              {/* View your 2D design */}
              <PrimaryButton
                type="button"
                onClick={handleOpen2D}
                variant="outline"
                size="default"
                align="center"
                withArrow={false}
                className="w-full sm:w-68 whitespace-nowrap"
              >
                <span className="whitespace-nowrap">View your 2D design</span>
              </PrimaryButton>

              {/* Approved 3D plan */}
              <PrimaryButton
                type="button"
                onClick={handleOpen3D}
                variant="outline"
                size="default"
                align="center"
                withArrow={false}
                className="w-full sm:w-68 whitespace-nowrap"
              >
                <span className="whitespace-nowrap">Approved 3D plan</span>
              </PrimaryButton>
            </div>
          </div>


        </div>

        {/* Warm Light Yellow / Orange Focus Notice & Skip Strip */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-3.5 sm:px-8 sm:py-3.5 transition-colors duration-300',
            isBoqApproved
              ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
              : 'border-amber-300/60 bg-gradient-to-r from-amber-500/[0.09] via-amber-400/[0.06] to-orange-500/[0.08]',
          )}
        >
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            {isBoqApproved ? (
              <>
                <CheckCircle size={16} weight="fill" className="shrink-0 text-emerald-600" />
                <span className="text-[0.75rem] font-semibold text-emerald-800">
                  Bill of Quantities approved · Ready for Output stage
                </span>
              </>
            ) : (
              <>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-600 border border-amber-300/60 shadow-2xs">
                  <Info size={13} weight="bold" />
                </div>
                <span className="text-[0.75rem] font-medium text-amber-950">
                  <strong className="font-bold text-amber-900">Optional Step:</strong> You can skip the BoQ for now and generate it anytime later.
                </span>
              </>
            )}
          </div>

          {outputPath && !isBoqApproved && (
            <Link
              to={outputPath}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-amber-300/80 bg-white/90 px-3 py-1',
                'text-[0.6875rem] font-bold uppercase tracking-wider text-amber-800 shadow-2xs font-display',
                'transition-all duration-200 hover:border-amber-500 hover:bg-amber-600 hover:text-white active:scale-95',
              )}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span>Skip to Output</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          )}
        </div>
      </FloorPlanWorkArea>


      {/* Reusable Fullscreen Floor Plan / 3D Model Preview Lightbox */}
      <FloorPlanFullscreenModal
        source={activePreview}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}


