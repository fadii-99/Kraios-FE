import { cn } from '@/lib/cn'

/**
 * The drafted sheet every Step 1 work surface sits on — the dropzone, the
 * prompt composer and the source preview all use this one frame, so the three
 * states of the right-hand column read as the same object changing rather than
 * three different panels.
 *
 * It is `TechnicalIconFrame`'s language at region scale: a hairline border, a
 * near-white fill, four setting-out ticks at the corners and the panel radius
 * (--radius-md). There is no shadow, and `active` is the single state change — the border and
 * fill pick up brand-deep while a file is being dragged over it.
 */
export default function FloorPlanWorkArea({ active = false, className, children, ...rest }) {
  const tick = cn(
    'pointer-events-none absolute h-2.5 w-2.5 transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
    active
      ? 'border-[var(--color-brand-deep)]/60'
      : 'border-[var(--color-brand-deep)]/25',
  )

  return (
    <div
      className={cn(
        'relative flex flex-1 flex-col rounded-md border',
        'transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        active
          ? 'border-[var(--color-brand-deep)]/55 bg-[var(--color-brand-deep)]/[0.05]'
          : 'border-[var(--tone-line)] bg-white',
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className={cn(tick, 'left-1.5 top-1.5 border-l border-t')} />
      <span aria-hidden="true" className={cn(tick, 'right-1.5 top-1.5 border-r border-t')} />
      <span aria-hidden="true" className={cn(tick, 'bottom-1.5 left-1.5 border-b border-l')} />
      <span aria-hidden="true" className={cn(tick, 'bottom-1.5 right-1.5 border-b border-r')} />

      {children}
    </div>
  )
}
