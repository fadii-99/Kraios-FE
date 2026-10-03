import { CircleNotch, Stop } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * The composer's action while a job runs: STOP takes the place of SEND.
 *
 * Same footprint as the send button it replaces, so the composer does not
 * reflow when a generation starts or ends. It stops the job on the server
 * (`cancelJob`), not merely the watch on it — the backend terminates the
 * worker and discards any result that lands afterwards.
 *
 * Outlined rather than filled: stopping is a deliberate secondary action, and
 * the danger token appears only on hover so a running generation does not look
 * like an error. While the request is in flight the button shows the spinner
 * and refuses a second press.
 */
export default function StopGenerationButton({ onStop, stopping = false, className }) {
  return (
    <button
      type="button"
      onClick={onStop}
      disabled={stopping}
      aria-label={stopping ? 'Stopping generation' : 'Stop generation'}
      title={stopping ? 'Stopping…' : 'Stop generation'}
      className={cn(
        'flex h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md',
        'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] shadow-2xs',
        'transition-colors duration-200 ease-[var(--ease-out-expo)] active:scale-95 motion-reduce:transition-none',
        'hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
        'disabled:cursor-wait disabled:opacity-60 disabled:hover:border-[var(--tone-line-strong)] disabled:hover:text-[var(--tone-ink)]',
        className,
      )}
    >
      {stopping ? (
        <CircleNotch
          size={16}
          weight="bold"
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Stop size={14} weight="fill" aria-hidden="true" />
      )}
    </button>
  )
}
