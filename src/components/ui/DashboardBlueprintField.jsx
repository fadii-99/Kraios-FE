import { cn } from '@/lib/cn'

/**
 * Clean About Us-Style Square/Grid Background for the KRAIOS Dashboard.
 *
 * Source of Truth: The public website's About Us section (`BlueprintBackdrop` default grid variant).
 * - 40px fine square drafting grid
 * - 80px dot matrix intersection points
 * - Subtle central ambient brand blue radial glow
 * - Zero extra decorative text, zero crosshairs, zero ticks, zero extra shapes
 */
export default function DashboardBlueprintField({ className }) {
  return (
    <div
      aria-hidden="true"
      data-canvas-grid
      className={cn(
        'pointer-events-none absolute inset-0 select-none overflow-hidden text-[var(--tone-ink)]',
        className,
      )}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {/* Fine square drafting grid — matched to Step 2 Design Assistant opacity */}
          <pattern id="dbpSquareGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" stroke="#1677FF" strokeOpacity="0.14" strokeWidth="1" />
          </pattern>

          {/* Dot matrix intersections — matched to Step 2 Design Assistant opacity */}
          <pattern id="dbpSquareDots" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1.4" fill="#0B5ED7" fillOpacity="0.20" />
          </pattern>

          {/* Subtle central ambient blue aura for light dashboard surfaces */}
          <radialGradient id="dbpSquareAura" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.08" />
            <stop offset="65%" stopColor="var(--color-brand-deep)" stopOpacity="0.025" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

        </defs>

        {/* ─── Pure Square / Grid Geometry from About Us ─── */}
        <rect width="1600" height="900" fill="url(#dbpSquareGrid)" />
        <rect width="1600" height="900" fill="url(#dbpSquareDots)" />
        <rect width="1600" height="900" fill="url(#dbpSquareAura)" />
      </svg>
    </div>
  )
}
