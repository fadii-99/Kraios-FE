import { ArrowLeft, ArrowRight, CircleNotch } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * The single CTA button for the whole site — Contact, Login, Forgot Password
 * and Signup all use this.
 *
 * The fill and hover both come from `--btn-bg` / `--btn-bg-hover`, which each
 * tone defines. It never turns white: on light bands it goes brand-deep
 * (#0B5ED7, white ink 5.57:1) → deeper (#0E4FA8, 7.41:1); on dark bands accent
 * (#3B91FF, dark ink 5.79:1) → lighter (#5CA5FF, 7.17:1).
 *
 * `--color-brand` (#1677FF) is deliberately NOT used as a fill — white on it is
 * 3.92:1 and dark ink on it is 4.43:1, so both directions fail AA.
 *
 * `variant="outline"` is the quieter sibling: a hairline box that borrows the
 * tone's own line and ink and only picks up accent on hover. It exists so a
 * secondary action next to a filled CTA can share this component's geometry
 * instead of re-typing a bespoke button. Both variants sit on the same box, so
 * `size` swaps padding/height for both at once — `cn` is a plain joiner, not
 * tailwind-merge, so a padding override in `className` would lose to the base
 * class on source order rather than replacing it.
 */
const VARIANTS = {
  solid: cn(
    'bg-[var(--btn-bg)] text-[var(--btn-ink)]',
    'hover:bg-[var(--btn-bg-hover)]',
  ),
  outline: cn(
    'border border-[var(--tone-line-strong)] bg-transparent text-[var(--tone-ink)]',
    'hover:border-[var(--tone-accent)] hover:bg-[color-mix(in_oklab,var(--tone-accent)_5%,transparent)]',
    'hover:text-[var(--tone-accent)]',
  ),
}

const SIZES = {
  default: 'min-h-13 gap-4 px-8 py-4',
  compact: 'min-h-11 gap-3 px-6 py-3',
  sm: 'h-9 min-h-9 gap-2 px-3.5 py-0',
  xs: 'h-8 min-h-8 gap-1.5 px-3 py-0',
}

export default function PrimaryButton({
  as: Tag = 'button',
  children,
  loading = false,
  loadingLabel,
  withArrow = true,
  arrowDirection = 'right',
  align = 'between',
  variant = 'solid',
  size = 'default',
  className,
  disabled,
  ...rest
}) {
  const isLeftArrow = withArrow && arrowDirection === 'left'
  const isRightArrow = withArrow && arrowDirection === 'right'

  // Accessible label for screen readers during loading state
  const accessibleLabel =
    typeof children === 'string'
      ? children
      : loadingLabel || 'Loading'

  return (
    <Tag
      disabled={Tag === 'button' ? disabled || loading : undefined}
      aria-busy={loading ? 'true' : undefined}
      aria-label={loading ? accessibleLabel : undefined}
      className={cn(
        'group label-ui relative inline-flex cursor-pointer items-center rounded-sm',
        SIZES[size] || SIZES.default,
        VARIANTS[variant] || VARIANTS.solid,
        'transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)]',
        'active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
        'disabled:cursor-not-allowed disabled:opacity-55',
        align === 'between' ? 'justify-between' : 'justify-center',
        className,
      )}
      {...rest}
    >
      {/* Content wrapper: keeps exact width/height in layout while hidden during loading */}
      <span
        className={cn(
          'inline-flex w-full items-center',
          align === 'between' ? 'justify-between' : 'justify-center',
          loading && 'invisible opacity-0 select-none',
        )}
        aria-hidden={loading ? 'true' : undefined}
      >
        {isLeftArrow && (
          <ArrowLeft
            size={17}
            weight="bold"
            aria-hidden="true"
            className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-x-1.5"
          />
        )}

        <span>{children}</span>

        {isRightArrow && (
          <ArrowRight
            size={17}
            weight="bold"
            aria-hidden="true"
            className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5"
          />
        )}
      </span>

      {/* Centered clean circular spinner during loading */}
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <CircleNotch
            size={18}
            weight="bold"
            className="animate-spin text-current shrink-0"
          />
        </span>
      )}
    </Tag>
  )
}

