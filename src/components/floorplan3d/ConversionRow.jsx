import { Link } from 'react-router-dom'
import { ArrowRight, CircleNotch, Stop, Trash } from '@phosphor-icons/react'

import ConversionThumbnail from '@/components/floorplan3d/ConversionThumbnail'
import { formatMessageTimestamp, toISOTimestamp } from '@/lib/date'
import { formatBytes } from '@/lib/floorplan3d/adapters'
import { cn } from '@/lib/cn'

/** Status copy and tone. The dot carries the tone; the word carries the meaning. */
const CONVERSION_STATUS_COPY = {
  QUEUED: { label: 'Queued', text: 'text-[var(--tone-ink-soft)]', dot: 'bg-[var(--tone-line-strong)]' },
  PROCESSING: { label: 'Converting', text: 'text-[var(--color-brand-deep)]', dot: 'bg-[var(--color-brand-deep)]' },
  NEEDS_REVIEW: { label: 'Needs review', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  READY: { label: 'Ready', text: 'text-[var(--color-success)]', dot: 'bg-[var(--color-success)]' },
  FAILED: { label: 'Failed', text: 'text-[var(--color-danger)]', dot: 'bg-[var(--color-danger)]' },
  CANCELLED: { label: 'Stopped', text: 'text-[var(--tone-ink-soft)]', dot: 'bg-[var(--tone-line-strong)]' },
}

const ICON_BUTTON = cn(
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[var(--tone-ink-soft)]',
  'transition-colors hover:bg-[var(--color-light)] hover:text-[var(--color-danger)]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
  'disabled:cursor-wait disabled:opacity-50',
)

/**
 * One conversion in "Recent conversions".
 *
 * Every state says what it is AND what can be done about it, in the row:
 *
 * - running — live stage message and a progress rule, plus STOP;
 * - needs review / ready — the revision's grade, and OPEN (the thumbnail and
 *   the name open it too, because that is where a user clicks first);
 * - failed — the reason in danger ink, with its code for support;
 * - stopped — the reason in plain ink, because the user chose it.
 *
 * The upload time is always shown. The same drawing is often converted
 * several times, and without it those rows are indistinguishable.
 */
export default function ConversionRow({ conversion, onStop, onArchive, stopping, stopDisabled }) {
  const status = CONVERSION_STATUS_COPY[conversion.status] ?? CONVERSION_STATUS_COPY.QUEUED
  const editorPath = `/dashboard/experiments/floorplan-3d/${conversion.id}`
  const revision = conversion.currentRevision
  const uploadedAt = formatMessageTimestamp(conversion.createdAt)
  const thumbnail = (
    <ConversionThumbnail
      key={`${conversion.source?.fileUrl ?? ''}|${conversion.thumbnailUrl ?? ''}`}
      conversion={conversion}
      className="h-16 w-24 sm:h-[4.5rem] sm:w-28"
    />
  )

  return (
    <li className="flex items-center gap-3 rounded-md border border-[var(--tone-line)] bg-white p-3 transition-colors hover:border-[var(--tone-line-strong)] sm:gap-4">
      {conversion.isUsable ? (
        <Link
          to={editorPath}
          tabIndex={-1}
          aria-hidden="true"
          className="shrink-0 rounded-sm focus-visible:outline-none"
        >
          {thumbnail}
        </Link>
      ) : (
        thumbnail
      )}

      <div className="min-w-0 flex-1">
        {conversion.isUsable ? (
          <Link
            to={editorPath}
            title={conversion.name}
            className="block truncate text-sm font-medium text-[var(--tone-ink)] hover:text-[var(--tone-accent)] focus-visible:underline focus-visible:outline-none"
          >
            {conversion.name}
          </Link>
        ) : (
          <p title={conversion.name} className="truncate text-sm font-medium text-[var(--tone-ink)]">
            {conversion.name}
          </p>
        )}

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-[var(--tone-ink-soft)]">
          <span className={cn('inline-flex items-center gap-1.5 font-medium', status.text)}>
            <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          {revision && (
            <span>
              r{revision.number} · {revision.grade} {revision.score}/100
            </span>
          )}
          {conversion.source && <span>{formatBytes(conversion.source.byteSize)}</span>}
          {conversion.source?.pageCount > 1 && <span>{conversion.source.pageCount} pages</span>}
          {uploadedAt && (
            <time dateTime={toISOTimestamp(conversion.createdAt)}>{uploadedAt}</time>
          )}
        </p>

        {conversion.isRunning && (
          <div className="mt-2 max-w-sm">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={conversion.progress}
              aria-label={`${conversion.name} conversion progress`}
              className="h-1 overflow-hidden rounded-full bg-[var(--tone-line)]"
            >
              <div
                className="h-full rounded-full bg-[var(--color-brand-deep)] transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.max(4, Math.min(100, conversion.progress))}%` }}
              />
            </div>
            <p className="mt-1 truncate text-[0.625rem] text-[var(--tone-ink-soft)]">
              {conversion.progress}%{conversion.message ? ` · ${conversion.message}` : ''}
            </p>
          </div>
        )}

        {(conversion.isFailed || conversion.isCancelled) && conversion.errorMessage && (
          <p
            className={cn(
              'mt-1 text-[0.6875rem] leading-relaxed',
              conversion.isFailed ? 'text-[var(--color-danger)]' : 'text-[var(--tone-ink-soft)]',
            )}
          >
            {conversion.errorMessage}
            {conversion.isFailed && conversion.errorCode && (
              <span className="ml-1 font-mono text-[var(--tone-ink-soft)]">
                ({conversion.errorCode})
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {conversion.isRunning && (
          <button
            type="button"
            onClick={onStop}
            disabled={stopDisabled}
            aria-label={`Stop converting ${conversion.name}`}
            title="Stop"
            className={ICON_BUTTON}
          >
            {stopping ? (
              <CircleNotch size={14} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Stop size={13} weight="fill" />
            )}
          </button>
        )}
        {conversion.isUsable && (
          <Link
            to={editorPath}
            className="label-ui hidden h-9 items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-3 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)] sm:inline-flex"
          >
            Open
            <ArrowRight size={13} />
          </Link>
        )}
        <button
          type="button"
          onClick={onArchive}
          aria-label={
            conversion.isRunning
              ? `Stop and remove ${conversion.name} from the list`
              : `Remove ${conversion.name} from the list`
          }
          title={conversion.isRunning ? 'Stop and remove' : 'Remove from list'}
          className={ICON_BUTTON}
        >
          <Trash size={14} />
        </button>
      </div>
    </li>
  )
}
