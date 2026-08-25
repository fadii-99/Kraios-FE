import { cn } from '@/lib/cn'

/**
 * The drafted plate a dashboard icon sits on.
 *
 * A near-square plate, a hairline border, a very faint brand wash and four
 * setting-out ticks at the corners — the drafting registration mark, not a
 * rounded app tile. It carries the standard control radius (--radius-sm, 4px):
 * enough to sit in the softened KRAIOS shape language, far too little to read
 * as a rounded tile.
 *
 * It exists so the Profile workspace zones and the project library card share
 * ONE icon treatment; that shared plate is what makes those two screens read as
 * the same product rather than two designs. Nothing else in the dashboard
 * frames an icon.
 *
 * `size` / `iconSize` are inline styles, not classes: Tailwind scans source for
 * literal class names, so a computed `h-[72px]` would never be generated.
 *
 * `interactive` opts into the hover response. It reads a `group` ancestor, so
 * only pass it where one exists (the card's `<article>`); a static zone opening
 * leaves it off and the plate simply holds still.
 *
 * `accent` is the plate's one colour, published as `--plate-accent` so the mark,
 * the ticks, the border tint and the wash can never drift apart. It defaults to
 * brand-deep, which is the AA-safe brand tint on the dashboard's light bands.
 * A plate on a DARK surface must pass `var(--tone-accent)` instead —
 * brand-deep on navy-2 measures 2.96:1 and reads as a smudge.
 *
 * `weight` is the Phosphor weight of the mark and stays `regular` by default,
 * which is what every existing plate renders. Step 2's approval stamp passes
 * `fill`, because a signed-off state has to read as solid at plate size.
 */
export default function TechnicalIconFrame({
  icon: Icon,
  children,
  size = 60,
  iconSize = 30,
  interactive = false,
  accent = 'var(--color-brand-deep)',
  weight = 'regular',
  className,
}) {
  const tick = cn(
    'absolute h-2 w-2 border-[var(--plate-accent)]/25',
    'transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
    interactive && 'group-hover:border-[var(--plate-accent)]/55',
  )

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, '--plate-accent': accent }}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-sm',
        'border border-[var(--plate-accent)]/25 bg-[var(--plate-accent)]/[0.08]',
        'transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        interactive &&
          'group-hover:border-[var(--plate-accent)]/45 group-hover:bg-[var(--plate-accent)]/[0.12]',
        className,
      )}
    >
      <span className={cn(tick, 'left-1 top-1 border-l border-t')} />
      <span className={cn(tick, 'right-1 top-1 border-r border-t')} />
      <span className={cn(tick, 'bottom-1 left-1 border-b border-l')} />
      <span className={cn(tick, 'bottom-1 right-1 border-b border-r')} />

      {children ? children : Icon ? (
        <Icon size={iconSize} weight={weight} className="text-[var(--plate-accent)]" />
      ) : null}
    </span>
  )
}
