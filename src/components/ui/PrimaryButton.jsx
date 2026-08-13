import { ArrowRight, CircleNotch } from '@phosphor-icons/react'

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
 */
export default function PrimaryButton({
  as: Tag = 'button',
  children,
  loading = false,
  loadingLabel = 'Sending',
  withArrow = true,
  align = 'between',
  className,
  disabled,
  ...rest
}) {
  return (
    <Tag
      disabled={Tag === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'group label-ui inline-flex min-h-13 cursor-pointer items-center gap-4',
        'bg-[var(--btn-bg)] px-8 py-4 text-[var(--btn-ink)]',
        'transition-[background-color,transform] duration-300 ease-[var(--ease-out-expo)]',
        'hover:bg-[var(--btn-bg-hover)] active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
        'disabled:cursor-not-allowed disabled:opacity-55',
        align === 'between' ? 'justify-between' : 'justify-center',
        className,
      )}
      {...rest}
    >
      <span>{loading ? loadingLabel : children}</span>

      {loading ? (
        <CircleNotch size={17} weight="bold" aria-hidden="true" className="animate-spin" />
      ) : (
        withArrow && (
          <ArrowRight
            size={17}
            weight="bold"
            aria-hidden="true"
            className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5"
          />
        )
      )}
    </Tag>
  )
}
