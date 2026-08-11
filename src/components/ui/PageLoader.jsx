import { cn } from '@/lib/cn'

/**
 * Full-screen loading overlay for lazily-loaded routes.
 *
 * Fixed and opaque rather than in-flow: the Navbar and Footer live in
 * `AppLayout` *outside* the Suspense boundary, so an in-flow loader left the
 * footer visible underneath while a chunk downloaded.
 *
 * It stays mounted and is toggled with `hidden` instead of being swapped out by
 * Suspense — a fallback is unmounted synchronously, which gives no chance to
 * animate an exit. Keeping it mounted buys a real fade-out.
 */
export default function PageLoader({ label = 'Loading', hidden = false }) {
  return (
    <div
      role={hidden ? undefined : 'status'}
      aria-live={hidden ? undefined : 'polite'}
      aria-hidden={hidden || undefined}
      className={cn(
        'page-loader tone-light fixed inset-0 z-[70] flex flex-col items-center justify-center gap-7',
        'transition-opacity duration-500 ease-[var(--ease-out-expo)]',
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      {/* subtle blueprint grid — kept minimal so the icon stays the focus */}
      <span aria-hidden="true" className="page-loader__grid absolute inset-0" />

      <svg
        width="80"
        height="80"
        viewBox="0 0 76 76"
        fill="none"
        aria-hidden="true"
        className="relative text-brand"
      >
        {/* outer walls */}
        <rect
          x="6"
          y="6"
          width="64"
          height="64"
          stroke="currentColor"
          strokeWidth="2"
          className="plan-draw"
          style={{ strokeDasharray: 256, strokeDashoffset: 256 }}
        />
        {/* room divider + door opening */}
        <path
          d="M6 44h20M40 44h30M40 6v38"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.55"
          className="plan-draw plan-draw--delay"
          style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
        />
        {/* dimension line */}
        <path
          d="M6 74h64"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.3"
          className="plan-draw plan-draw--delay2"
          style={{ strokeDasharray: 64, strokeDashoffset: 64 }}
        />
      </svg>

      <p className="label-mono relative text-ink-dark">{label}</p>
    </div>
  )
}
