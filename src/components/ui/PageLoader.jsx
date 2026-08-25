import { cn } from '@/lib/cn'

/**
 * The ONE loading state in the product — landing, auth routes and the whole
 * dashboard all render this component.
 *
 * Placements:
 * - `overlay` (default) — fixed and opaque, for `AppLayout`.
 * - `inline` — in normal flow, for modal, section and dashboard boundaries.
 */
export default function PageLoader({
  label = 'Loading',
  hidden = false,
  variant = 'overlay',
  className,
}) {
  const inline = variant === 'inline'

  return (
    <div
      role={hidden ? undefined : 'status'}
      aria-live={hidden ? undefined : 'polite'}
      aria-hidden={hidden || undefined}
      className={cn(
        'tone-light flex flex-col items-center justify-center gap-7',
        // No min-height here on purpose. `cn` is a plain joiner, not
        // tailwind-merge, so a baked-in `min-h-[50vh]` was not overridden by a
        // caller's `min-h-56` — it beat it on stylesheet order, and every
        // dashboard call site's height was silently dead. The worst of it was
        // the Create Project modal, where a 15rem loader rendered at half the
        // viewport on a phone. Inline callers now set their own height; the
        // `overlay` variant (the public Suspense fallback) is untouched.
        inline
          ? 'relative w-full overflow-hidden my-auto bg-transparent'
          : 'page-loader fixed inset-0 z-[70] transition-opacity duration-500 ease-[var(--ease-out-expo)]',
        !inline && (hidden ? 'pointer-events-none opacity-0' : 'opacity-100'),
        className,
      )}
    >
      {/* subtle blueprint grid only for full-screen overlay */}
      {!inline && (
        <span aria-hidden="true" className="page-loader__grid absolute inset-0" />
      )}

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

      <p className="label-ui relative text-ink-dark">{label}</p>
    </div>
  )
}
