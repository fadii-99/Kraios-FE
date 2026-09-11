import { WarningCircle, XCircle } from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * What the conversion is doing, while it does it.
 *
 * THE MESSAGE, NOT THE PERCENTAGE, IS THE ANSWER. The bar is a rough sense of
 * how far along a multi-minute job is; the sentence under it is what the
 * pipeline is actually doing, and it is the only part a user can act on. The
 * number is shown because a bar with no number reads as broken when it sits
 * still during a long stage — but the message is what carries the meaning.
 *
 * CANCELLING IS OFFERED HONESTLY. A queued conversion stops outright; a
 * running one stops between stages, because an HTTP call already in flight
 * cannot be interrupted. The copy says which is happening rather than
 * promising an immediate stop.
 */
export default function Fp3dConversionProgress({
  conversion,
  stalled,
  cancelling,
  onCancel,
  onRetry,
  className,
}) {
  if (!conversion) return null

  if (conversion.hasFailed) {
    return (
      <Notice tone="danger" icon={XCircle} className={className}>
        <p className="text-[0.875rem] font-semibold">The conversion failed.</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed">
          {conversion.error || 'Try a clearer drawing, or run it again.'}
        </p>
        <PrimaryButton
          size="sm"
          withArrow={false}
          variant="outline"
          className="mt-3"
          onClick={onRetry}
        >
          Convert again
        </PrimaryButton>
      </Notice>
    )
  }

  if (conversion.wasCancelled) {
    return (
      <Notice tone="muted" icon={XCircle} className={className}>
        <p className="text-[0.875rem] font-semibold">Conversion cancelled.</p>
        <PrimaryButton
          size="sm"
          withArrow={false}
          variant="outline"
          className="mt-3"
          onClick={onRetry}
        >
          Convert again
        </PrimaryButton>
      </Notice>
    )
  }

  if (stalled) {
    return (
      <Notice tone="warning" icon={WarningCircle} className={className}>
        <p className="text-[0.875rem] font-semibold">
          This conversion has stopped responding.
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed">
          It has been running far longer than a conversion takes, so its worker
          has probably been lost. Reload to check, or start it again.
        </p>
        <PrimaryButton
          size="sm"
          withArrow={false}
          variant="outline"
          className="mt-3"
          onClick={onRetry}
        >
          Convert again
        </PrimaryButton>
      </Notice>
    )
  }

  if (!conversion.isRunning) return null

  return (
    <div
      className={cn(
        'rounded-md border border-[var(--tone-line-strong)] bg-white p-4',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[0.875rem] font-semibold text-[var(--tone-ink)]">
          {conversion.message || 'Converting the drawing…'}
        </p>
        <span className="shrink-0 text-[0.75rem] tabular-nums text-[var(--tone-muted-dark)]">
          {conversion.progress}%
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-xs bg-[var(--tone-line)]"
        role="progressbar"
        aria-valuenow={conversion.progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--color-brand-deep)] transition-[width] duration-500 ease-[var(--ease-out-expo)]"
          style={{ width: `${Math.max(conversion.progress, 3)}%` }}
        />
      </div>

      <p className="mt-2.5 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
        The drawing is read, traced, checked against itself and then compared
        back to your sheet. It usually takes one to three minutes. You can leave
        this page — the work carries on, and coming back picks it up.
      </p>

      {conversion.cancelRequested ? (
        <p className="mt-2 text-[0.75rem] font-semibold text-[var(--color-warning)]">
          Stopping — it will end after the stage it is on.
        </p>
      ) : (
        <PrimaryButton
          size="xs"
          variant="outline"
          withArrow={false}
          loading={cancelling}
          loadingLabel="Cancelling"
          className="mt-3"
          onClick={onCancel}
        >
          Cancel
        </PrimaryButton>
      )}
    </div>
  )
}

const TONES = {
  danger: 'border-rose-300 bg-rose-50/70 text-rose-900',
  warning: 'border-amber-300 bg-amber-50/70 text-amber-900',
  muted: 'border-[var(--tone-line-strong)] bg-[var(--color-light)] text-[var(--tone-ink)]',
}

function Notice({ tone, icon: Icon, children, className }) {
  return (
    <div
      className={cn('rounded-md border p-4', TONES[tone], className)}
      role="status"
    >
      <Icon size={20} weight="fill" aria-hidden="true" className="mb-1.5 opacity-70" />
      {children}
    </div>
  )
}
