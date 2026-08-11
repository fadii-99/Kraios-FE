import { cn } from '@/lib/cn'

/**
 * Decorative architectural backdrop: blueprint grid, dimension strings,
 * registration marks and (optionally) a compass rosette and wireframe floor.
 *
 * Everything inherits `currentColor`, so the caller sets the tone by putting a
 * text colour on this element. Layers carry `data-bp-layer` so a section can
 * parallax them at different rates.
 *
 * Purely decorative — `aria-hidden` and non-interactive throughout.
 */
export default function BlueprintBackdrop({ variant = 'grid', className }) {
  const withCompass = variant === 'compass'

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <pattern id="bpFine" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" stroke="currentColor" strokeOpacity="0.055" strokeWidth="1" />
          </pattern>
          <pattern id="bpDots" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1.4" fill="currentColor" fillOpacity="0.1" />
          </pattern>
        </defs>

        {/* --- layer 1: the grid itself --- */}
        <g data-bp-layer="1">
          <rect width="1600" height="900" fill="url(#bpFine)" />
          <rect width="1600" height="900" fill="url(#bpDots)" />
        </g>

        {/* --- layer 2: dimension strings + registration marks --- */}
        <g data-bp-layer="2" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.2">
          {/* top dimension string */}
          <path d="M120 96h680" />
          <path d="M120 86v20M460 86v20M800 86v20" />
          {/* left dimension string */}
          <path d="M96 180v460" />
          <path d="M86 180h20M86 410h20M86 640h20" />
          {/* corner registration marks */}
          <path d="M40 40h44M40 40v44" />
          <path d="M1560 40h-44M1560 40v44" />
          <path d="M40 860h44M40 860v-44" />
          <path d="M1560 860h-44M1560 860v-44" />
        </g>

        {/* --- layer 3: crosshair points --- */}
        <g data-bp-layer="3" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2">
          <g>
            <path d="M1180 210h28M1194 196v28" />
            <circle cx="1194" cy="210" r="6" strokeOpacity="0.3" />
          </g>
          <g>
            <path d="M330 700h28M344 686v28" />
            <circle cx="344" cy="700" r="6" strokeOpacity="0.3" />
          </g>
        </g>

        {withCompass && (
          <>
            {/* --- large compass rosette, deliberately clipped by the edge --- */}
            <g
              data-bp-layer="4"
              stroke="currentColor"
              strokeOpacity="0.13"
              strokeWidth="1.2"
              transform="translate(1330 470)"
            >
              <circle r="300" />
              <circle r="230" strokeOpacity="0.09" />
              <circle r="120" strokeOpacity="0.16" />
              <path d="M-300 0h600M0 -300v600" strokeOpacity="0.1" />
              <path d="M-212 -212L212 212M212 -212L-212 212" strokeOpacity="0.06" />
              {/* tick ring */}
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i * Math.PI) / 12
                const x1 = Math.cos(a) * 300
                const y1 = Math.sin(a) * 300
                const x2 = Math.cos(a) * 282
                const y2 = Math.sin(a) * 282
                return (
                  <path
                    key={i}
                    d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`}
                    strokeOpacity="0.2"
                  />
                )
              })}
            </g>

            {/* --- axonometric wireframe floor plate --- */}
            <g
              data-bp-layer="5"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="1.3"
              transform="translate(210 620)"
            >
              <path d="M0 0L190 110L0 220L-190 110Z" />
              <path d="M0 -70L190 40L190 110L0 0L-190 110L-190 40Z" strokeOpacity="0.13" />
              <path d="M0 0v-70M190 110V40M-190 110V40" strokeOpacity="0.13" />
              <path d="M-95 55L0 110L95 55" strokeOpacity="0.1" />
            </g>
          </>
        )}
      </svg>

      {/* oversized coordinate label, clipped at the edge */}
      <span
        className="absolute -left-4 bottom-6 select-none font-mono text-[0.6875rem] tracking-[0.3em] opacity-25 sm:left-6"
        style={{ writingMode: 'vertical-rl' }}
      >
        N 37°46′ · W 122°25′
      </span>
    </div>
  )
}
