import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import {
  ArrowRight,
  ArrowsHorizontal,
  Crosshair,
  Ruler,
  SquaresFour,
  StackSimple,
  Wall,
} from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * The explanatory half of Step 1 — the landing page's About header language
 * translated into product UI.
 */
const POINT_ICONS = {
  plan: Wall,
  topDown: Crosshair,
  source: StackSimple,
  rooms: SquaresFour,
  dimensions: Ruler,
  layout: ArrowsHorizontal,
}

/**
 * Tailored architectural color themes per heading/feature:
 * - Clear Plan: Royal Brand Blue
 * - Top-Down: Emerald Green (orthographic precision)
 * - Single File: Warm Amber (document source asset)
 * - Rooms: Indigo (spatial configuration)
 * - Dimensions: Teal (metric measurements)
 * - Layout: Purple (flow & composition)
 */
const POINT_THEMES = {
  plan: {
    accent: '#0b5ed7',
    hoverBorder: 'hover:border-blue-500/40',
  },
  topDown: {
    accent: '#059669',
    hoverBorder: 'hover:border-emerald-500/40',
  },
  source: {
    accent: '#d97706',
    hoverBorder: 'hover:border-amber-500/40',
  },
  rooms: {
    accent: '#4f46e5',
    hoverBorder: 'hover:border-indigo-500/40',
  },
  dimensions: {
    accent: '#0d9488',
    hoverBorder: 'hover:border-teal-500/40',
  },
  layout: {
    accent: '#9333ea',
    hoverBorder: 'hover:border-purple-500/40',
  },
}

export default function FloorPlanBrief({
  eyebrow,
  headingLines = [],
  paragraph,
  points = [],
  onSwitchToGenerate,
  onSwitchToUpload,
  showGeneratePrompt = false,
  className,
}) {
  return (
    <div className={cn('flex min-w-0 flex-col pl-2 sm:pl-3 lg:pl-5 xl:pl-7', className)}>
      {/* Eyebrow: blue setting-out rule + label, as every dashboard header. */}
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-px w-5 bg-[var(--color-brand-deep)]" />
        <p className="label-ui text-[var(--color-brand-deep)]">{eyebrow}</p>
      </div>

      <h2 className="display-stage mt-3 text-[var(--tone-ink)]">
        {headingLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>

      {paragraph && (
        <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--tone-muted-dark)]">
          {paragraph}
        </p>
      )}

      {/* ─── 3 Architectural Specification Cards in 1 Horizontal Line ─── */}
      <div className="mt-5 sm:mt-6 max-w-[340px] sm:max-w-[360px]">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {points.map((point) => {
            const Icon = POINT_ICONS[point.icon] ?? SquaresFour
            const theme = POINT_THEMES[point.icon] ?? { accent: 'var(--color-brand-deep)', hoverBorder: 'hover:border-blue-500/40' }

            return (
              <div
                key={point.term}
                className={cn(
                  'relative flex cursor-default select-none flex-col items-center justify-center rounded-sm border border-[var(--tone-line)] bg-white px-2 pt-2.5 pb-2.5 text-center sm:px-2.5 sm:pt-3 sm:pb-3 shadow-xs transition-colors duration-200',
                  theme.hoverBorder,
                )}
              >
                <TechnicalIconFrame
                  icon={Icon}
                  size={32}
                  iconSize={16}
                  weight="duotone"
                  accent={theme.accent}
                  interactive={false}
                  className="mb-2 sm:mb-2.5"
                />

                <div className="min-w-0 w-full">
                  <p className="font-display text-[0.5625rem] font-bold uppercase tracking-[0.03em] text-[var(--tone-ink)] sm:text-[0.625rem] leading-tight truncate">
                    {point.term}
                  </p>
                  {point.detail && (
                    <p className="mt-0.5 text-[0.5rem] font-medium leading-tight text-[var(--tone-muted-dark)] sm:text-[0.5625rem]">
                      {point.detail}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── "Don't have a 2D floor plan? Generate one now" Helper Link ─── */}
      {showGeneratePrompt && onSwitchToGenerate && (
        <div className="mt-6 flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-[var(--tone-muted-dark)] sm:mt-7 lg:mt-8 sm:text-[0.875rem]">
          <span>Don't have a 2D floor plan?</span>
          <button
            type="button"
            onClick={onSwitchToGenerate}
            className="group/gen inline-flex cursor-pointer items-center gap-1 font-bold text-[var(--color-brand-deep)] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]"
          >
            <span>Generate one now</span>
            <ArrowRight
              size={13}
              weight="bold"
              className="transition-transform duration-200 group-hover/gen:translate-x-0.5"
            />
          </button>
        </div>
      )}

      {/* ─── "Already have a 2D floor plan? Upload file" Helper Link (Generate Mode) ─── */}
      {!showGeneratePrompt && onSwitchToUpload && (
        <div className="mt-6 flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-[var(--tone-muted-dark)] sm:mt-7 lg:mt-8 sm:text-[0.875rem]">
          <span>Already have a 2D floor plan?</span>
          <button
            type="button"
            onClick={onSwitchToUpload}
            className="group/upl inline-flex cursor-pointer items-center gap-1 font-bold text-[var(--color-brand-deep)] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]"
          >
            <span>Upload file</span>
            <ArrowRight
              size={13}
              weight="bold"
              className="transition-transform duration-200 group-hover/upl:translate-x-0.5"
            />
          </button>
        </div>
      )}
    </div>
  )
}
