import { cn } from '@/lib/cn'

/**
 * The header band every dashboard page opens with.
 *
 * One eyebrow rule + label, one `.display-product` title, and an optional
 * right-hand slot for the page's primary action or its one line of context.
 * It exists because Projects and Profile had been re-typing the same eyebrow,
 * the same heading sizes and slightly different padding, which is how two pages
 * drift apart.
 *
 * `shrink-0`: the band keeps its height while the page body below it scrolls.
 */
export default function DashboardPageHeader({
  eyebrow,
  title,
  children,
  className,
  ...rest
}) {
  return (
    <header
      className={cn(
        'flex shrink-0 flex-col gap-4 border-b border-[var(--tone-line)] px-5 py-5',
        'sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:px-7 sm:py-6 lg:px-10 lg:py-7 xl:px-12',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2.5">
          <span
            data-header-rule
            className="h-px w-5 origin-left bg-[var(--color-brand-deep)]"
            aria-hidden="true"
          />
          <p data-header-eyebrow className="label-ui text-[var(--color-brand-deep)]">
            {eyebrow}
          </p>
        </div>

        <h1 data-header-title className="display-product text-[var(--tone-ink)]">
          {title}
        </h1>
      </div>

      {children && (
        <div data-header-slot className="shrink-0 sm:pb-1">
          {children}
        </div>
      )}
    </header>
  )
}
