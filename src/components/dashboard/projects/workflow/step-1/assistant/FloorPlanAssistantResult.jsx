import { ArrowsOut, FileArrowDown } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * 2D Floor Plan Assistant Result View.
 *
 * Matches Step 2 Design Assistant Result structure:
 * - Aspect-[4/3] rounded frame with light background
 * - Full-surface selection button
 * - Top-right hover overlay rail with "Full View" (and optional DWG action)
 */
export default function FloorPlanAssistantResult({
  result,
  approved = false,
  isBase = false,
  onExpand,
  onSelect,
}) {
  return (
    <figure
      className={cn(
        'group relative w-full rounded-md border bg-white shadow-2xs transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        approved
          ? 'border-[var(--color-success)]/45'
          : isBase
            ? 'border-[var(--color-brand-deep)]/40'
            : 'border-[var(--tone-line)] hover:border-[var(--tone-line-strong)]',
      )}
    >
      <div className="relative aspect-[4/3] max-h-[340px] sm:max-h-[380px] w-full overflow-hidden rounded-md bg-[var(--color-light)]">
        <img
          src={result.imageUrl}
          alt="Generated 2D architectural floor plan"
          loading="eager"
          className="h-full w-full object-contain p-2"
        />

        {/* The whole render is the selection target. */}
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isBase}
          aria-label="Use this 2D floor plan as the current design"
          className={cn(
            'absolute inset-0 cursor-pointer rounded-md',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
          )}
        />
      </div>

      {/* Inspection rail: an overlay on hover, a real row on touch */}
      <div
        className={cn(
          'absolute right-2.5 top-2.5 flex flex-wrap items-center justify-end gap-1.5 z-20',
          'opacity-0 transition-opacity duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          'touch:static touch:border-t touch:border-[var(--tone-line)] touch:px-3 touch:py-2 touch:opacity-100',
        )}
      >
        <ResultAction icon={ArrowsOut} label="Full View" onClick={onExpand} />
        {result.dwgUrl && (
          <ResultAction
            as="a"
            icon={FileArrowDown}
            label="DWG"
            href={result.dwgUrl}
            download
            target="_blank"
            rel="noreferrer"
            accessibleLabel="Download DWG file"
          />
        )}
      </div>
    </figure>
  )
}

/** One rail action. Same box whether it is a button or a real download link. */
function ResultAction({
  as: Tag = 'button',
  icon: Icon,
  label,
  accessibleLabel,
  ...rest
}) {
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      aria-label={accessibleLabel || label}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xs border px-2.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] shadow-2xs font-display whitespace-nowrap',
        'transition-all duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
        'border-[var(--tone-line-strong)] bg-white/95 text-[var(--tone-ink)] backdrop-blur-[2px]',
        'hover:border-[var(--color-brand-deep)] hover:bg-white hover:text-[var(--color-brand-deep)]',
      )}
      style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}
      {...rest}
    >
      <Icon size={12} weight="bold" aria-hidden="true" className="shrink-0" />
      <span>{label}</span>
    </Tag>
  )
}
