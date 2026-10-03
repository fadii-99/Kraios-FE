import { CheckCircle, CircleNotch, Info, Stop, WarningCircle } from '@phosphor-icons/react'

import { CONVERSION_STAGES } from '@/lib/api/floorplan3d'
import { cn } from '@/lib/cn'

/**
 * The stage rail: where a conversion is, and what is left.
 *
 * WHY EVERY STAGE IS NAMED, INCLUDING THE ONES THAT ARE NOT REACHED YET.
 * A progress bar with no labels tells a user that something is happening. A
 * named rail tells them what — and, when it stops, WHERE it stopped, which is
 * the difference between "it failed" and "it could not read the drawing".
 *
 * `review` is a real stage, not an error state. A plan whose scale could not be
 * read is not a failed conversion; it is a conversion that needs a person, and
 * the rail says so rather than showing a red cross.
 *
 * With `onStop`, a running conversion offers STOP: the server terminates the
 * worker and the conversion settles as stopped — information, not failure.
 */
export default function ConversionProgress({
  progress,
  stalled,
  error,
  compact,
  onStop,
  stopping = false,
}) {
  if (!progress) return null

  const currentIndex = CONVERSION_STAGES.findIndex((stage) => stage.id === progress.stage)
  const cancelled = Boolean(progress.isCancelled)
  const failed = (progress.isFailed || stalled) && !cancelled

  return (
    <div className={cn('rounded-md border border-[var(--tone-line)] bg-white', compact ? 'p-3' : 'p-4')}>
      <div className="mb-3 flex items-center gap-2">
        {failed ? (
          <WarningCircle size={16} className="shrink-0 text-[var(--color-danger)]" />
        ) : cancelled ? (
          <Info size={16} weight="fill" className="shrink-0 text-[var(--color-brand-deep)]" />
        ) : progress.isRunning ? (
          <CircleNotch size={16} className="shrink-0 animate-spin text-[var(--color-brand-deep)]" />
        ) : (
          <CheckCircle size={16} className="shrink-0 text-[var(--color-success)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--tone-ink)]">
            {stalled
              ? 'This conversion stopped responding'
              : progress.message || progress.stageLabel}
          </p>
          {progress.isRunning && (
            <p className="text-[0.625rem] text-[var(--tone-ink-soft)]">
              {progress.progress}% · {progress.stageLabel}
            </p>
          )}
        </div>
        {onStop && progress.isRunning && !stalled && (
          <button
            type="button"
            onClick={onStop}
            disabled={stopping}
            className={cn(
              'label-ui inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] bg-white px-2.5 text-[0.5625rem] text-[var(--tone-ink)]',
              'transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
              'disabled:cursor-wait disabled:opacity-60',
            )}
          >
            {stopping ? (
              <CircleNotch size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Stop size={11} weight="fill" aria-hidden="true" />
            )}
            <span>{stopping ? 'Stopping…' : 'Stop'}</span>
          </button>
        )}
      </div>

      <ol className="flex flex-wrap gap-x-1 gap-y-1.5">
        {CONVERSION_STAGES.map((stage, index) => {
          const done = currentIndex > index && !failed
          const active = currentIndex === index
          return (
            <li key={stage.id} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  active && failed
                    ? 'bg-[var(--color-danger)]'
                    : active
                      ? 'bg-[var(--color-brand-deep)]'
                      : done
                        ? 'bg-[var(--color-success)]'
                        : 'bg-[var(--tone-line-strong)]',
                )}
              />
              <span
                className={cn(
                  'text-[0.625rem]',
                  active
                    ? 'font-medium text-[var(--tone-ink)]'
                    : 'text-[var(--tone-ink-soft)]',
                )}
              >
                {stage.label}
              </span>
              {index < CONVERSION_STAGES.length - 1 && (
                <span aria-hidden="true" className="mx-0.5 text-[var(--tone-line-strong)]">
                  ·
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {(progress.errorMessage || error || stalled) && (
        <div className="mt-3 rounded-sm border border-[var(--tone-line)] bg-[var(--color-light)] p-2.5">
          <p className="text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
            {stalled
              ? 'The worker stopped reporting progress. Nothing has been lost — try converting the plan again.'
              : progress.errorMessage || error}
          </p>
          {progress.errorCode && (
            <p className="mt-1 font-mono text-[0.625rem] text-[var(--tone-ink-soft)]">
              {progress.errorCode}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
