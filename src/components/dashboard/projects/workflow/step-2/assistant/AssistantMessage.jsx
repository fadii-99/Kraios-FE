import { ArrowClockwise, Info, Warning } from '@phosphor-icons/react'

import Logo from '@/components/ui/Logo'
import { ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-2/designAssistantState'
import { formatMessageTimestamp, toISOTimestamp } from '@/lib/date'
import { cn } from '@/lib/cn'

/**
 * One conversation turn.
 *
 * The two voices are separated by ALIGNMENT and surface, not by colour or
 * shape: the user sits right on the light band's own grey, the assistant sits
 * left on white behind a brand setting-out rule. It is a transcript in a
 * drafting document, not a messaging app.
 *
 * TYPE is held small on purpose. This is a working tool — the render is the
 * thing being read, and body copy sized for a marketing page competes with it.
 * 13px at a comfortable measure, one size on every breakpoint.
 *
 * TEXT is held to a reading measure; a RESULT is not, and it is not boxed
 * either. A render already carries its own frame and caption, so wrapping it in
 * a message bubble drew two borders around one object and shrank the only thing
 * on the screen worth looking at.
 *
 * A result turn therefore has THREE parts under one identity line: the
 * assistant's sentence, the render, and the timestamp. `headerActions` puts
 * that render's own state controls on the identity line itself — see
 * `ResultHeaderControls` for why they live there and not on the image.
 *
 * `notice` is the assistant reporting a condition rather than answering. A
 * notice that can be retried is a FAILURE and takes the danger token as ink on
 * its setting-out rule (never a fill), paired with a mark and the words; one
 * that cannot — a cancelled run — is merely informational and stays on the
 * brand rule. Colour is never the only signal in either case.
 *
 * A notice that carries a `retry` payload gets a RETRY action. The instruction
 * that failed is kept on the message, so re-sending it costs one click instead
 * of retyping.
 *
 * EVERY settled turn is stamped. Only the transient "Generating…" block is not:
 * it is not a turn yet, and it is about to be replaced by one that is.
 */
export default function AssistantMessage({ message, busy, onRetry, headerActions, children }) {
  const isUser = message.role === 'user'
  const isPending = message.kind === MESSAGE_KINDS.pending
  const isNotice = message.kind === MESSAGE_KINDS.notice
  const isResult = message.kind === MESSAGE_KINDS.result
  const retry = isNotice ? message.retry : null
  // Retryable means something went wrong; a notice with nothing to retry is
  // just the assistant reporting a state.
  const isFailure = isNotice && Boolean(retry)

  const stamp = isPending ? '' : formatMessageTimestamp(message.at)

  return (
    <article
      className={cn(
        'flex w-full flex-col',
        isUser ? 'items-end pl-6 sm:pl-16' : 'items-start',
        !isUser && !isResult && 'pr-6 sm:pr-16',
      )}
    >
      {isUser ? (
        <p
          className="mb-1 text-[0.5625rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-muted-dark)]/70 font-display"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          You
        </p>
      ) : (
        <div
          className={cn(
            'mb-2.5 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2',
            isResult && 'max-w-[34rem] sm:max-w-[38rem]',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--color-brand-deep)]/25 bg-white p-1 shadow-2xs sm:h-7.5 sm:w-7.5">
              <Logo size="compact" className="h-full w-full object-contain" />
            </div>
            <span
              className="font-display text-[0.75rem] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Design Assistant
            </span>
          </div>

          {headerActions && (
            <div className="ml-auto flex items-center justify-end gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {isResult ? (
        <div className="w-full max-w-[34rem] sm:max-w-[38rem] pl-[2.375rem] sm:pl-10">
          {message.text && (
            <p className="mb-3 max-w-[34rem] sm:max-w-[38rem] text-[0.8125rem] leading-[1.65] text-[var(--tone-ink)]">
              {message.text}
            </p>
          )}
          {children}
        </div>
      ) : (
        <div
          className={cn(
            'rounded-sm px-4 py-2.5 transition-all',
            isUser &&
              'w-fit max-w-[24rem] sm:max-w-[28rem] border border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)] text-white shadow-[0_2px_12px_rgba(22,119,255,0.22)]',
            !isUser &&
              'w-full max-w-[42rem] ml-[2.375rem] sm:ml-10 border border-[var(--tone-line)] bg-white shadow-2xs',
            !isUser && isFailure && 'border-l-3 border-l-[var(--color-danger)]',
            !isUser && !isFailure && 'border-l-3 border-l-[var(--color-brand-deep)]',
          )}
        >
          {isPending ? (
            <div className="flex items-center gap-3.5 py-1">
              <svg
                width="34"
                height="34"
                viewBox="0 0 76 76"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-[var(--color-brand-deep)]"
              >
                {/* outer walls */}
                <rect
                  x="6"
                  y="6"
                  width="64"
                  height="64"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="plan-draw"
                  style={{ strokeDasharray: 256, strokeDashoffset: 256 }}
                />
                {/* room divider + door opening */}
                <path
                  d="M6 44h20M40 44h30M40 6v38"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.6"
                  className="plan-draw plan-draw--delay"
                  style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
                />
                {/* dimension line */}
                <path
                  d="M6 74h64"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeOpacity="0.4"
                  className="plan-draw plan-draw--delay2"
                  style={{ strokeDasharray: 64, strokeDashoffset: 64 }}
                />
              </svg>

              <div className="flex items-center gap-2">
                <span className="text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
                  {message.text || ASSISTANT_COPY.generating}
                </span>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand-deep)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand-deep)]" />
                </span>
              </div>
            </div>
          ) : (
            message.text && (
              <p
                className={cn(
                  'flex items-start gap-2 text-[0.8125rem] leading-[1.65] whitespace-pre-wrap',
                  isUser && 'text-white',
                  !isUser && isNotice && 'text-[var(--tone-muted-dark)]',
                  !isUser && !isNotice && 'text-[var(--tone-ink)]',
                )}
              >
                {isFailure && (
                  <Warning
                    size={14}
                    weight="fill"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--color-danger)]"
                  />
                )}
                {isNotice && !isFailure && (
                  <Info
                    size={14}
                    weight="fill"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--color-brand-deep)]"
                  />
                )}
                <span className="min-w-0">{message.text}</span>
              </p>
            )
          )}

          {retry && onRetry && (
            <div className="mt-3 border-t border-[var(--tone-line)] pt-3">
              <button
                type="button"
                onClick={() => onRetry(retry)}
                disabled={busy}
                className={cn(
                  'group label-ui inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border px-3 text-[0.5625rem] touch:h-11',
                  'border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)]',
                  'transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
                  'hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
                  'disabled:cursor-not-allowed disabled:opacity-55',
                )}
              >
                <ArrowClockwise
                  size={13}
                  weight="bold"
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-rotate-180 motion-reduce:transition-none"
                />
                <span>{ASSISTANT_COPY.retryLabel}</span>
              </button>
            </div>
          )}

          {children}
        </div>
      )}

      {/* Secondary by every means available: muted, no surface of its
          own, and outside the turn it belongs to. */}
      {stamp && (
        <time
          dateTime={toISOTimestamp(message.at)}
          className={cn(
            'mt-2.5 block text-[0.5625rem] font-medium leading-none tracking-tight text-[var(--color-muted-dark)]/85',
            !isUser && 'pl-[2.375rem] sm:pl-10',
          )}
        >
          {stamp}
        </time>
      )}
    </article>
  )
}
