import { ArrowClockwise, CircleNotch, Info, Warning } from '@phosphor-icons/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import Logo from '@/components/ui/Logo'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-3/boqAssistantState'
import { formatMessageTimestamp, toISOTimestamp } from '@/lib/date'
import { cn } from '@/lib/cn'

/**
 * react-markdown hands every custom component the raw mdast `node` alongside
 * the real props. None of these renderers use it, and spreading it onto a DOM
 * element makes React complain about an unknown attribute — so it is dropped
 * ONCE here rather than being destructured away in each of the ten renderers.
 */
const domProps = (props) => {
  const rest = { ...props }
  delete rest.node
  return rest
}

/** Markdown renderers for a BoQ turn — Kraios table and prose styling. */
const markdownComponents = {
  h3: (props) => (
    <h3
      className="mt-3.5 mb-2 text-[0.875rem] font-bold tracking-tight text-[var(--tone-ink)]"
      style={{ fontFamily: 'var(--font-display)' }}
      {...domProps(props)}
    />
  ),
  p: (props) => (
    <p className="my-2 leading-[1.65] text-[var(--tone-ink)]" {...domProps(props)} />
  ),
  ul: (props) => (
    <ul className="my-2 space-y-1 pl-4.5 list-disc text-slate-700" {...domProps(props)} />
  ),
  ol: (props) => (
    <ol className="my-2 space-y-1 pl-4.5 list-decimal text-slate-700" {...domProps(props)} />
  ),
  li: (props) => (
    <li className="text-[0.8125rem] leading-[1.55]" {...domProps(props)} />
  ),
  strong: (props) => (
    <strong className="font-bold text-[var(--tone-ink)]" {...domProps(props)} />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-sm border border-[var(--tone-line)] bg-white shadow-2xs">
      <table className="w-full min-w-[24rem] text-left text-[0.75rem] border-collapse" {...domProps(props)} />
    </div>
  ),
  thead: (props) => (
    <thead
      className="bg-slate-50 border-b border-[var(--tone-line)] text-slate-500 font-bold uppercase tracking-wider text-[0.625rem]"
      {...domProps(props)}
    />
  ),
  th: (props) => (
    <th className="px-3 py-2 font-bold" {...domProps(props)} />
  ),
  td: (props) => (
    <td className="px-3 py-2 border-b border-slate-100 font-medium text-slate-800" {...domProps(props)} />
  ),
}

/**
 * One BoQ conversation turn.
 *
 * Uses ReactMarkdown for rich headings, bullet lists, bold text, and embedded tables.
 */
export default function BoQMessage({ message, busy, onRetry, headerActions, children }) {
  const isUser = message.role === 'user'
  const isPending = message.kind === MESSAGE_KINDS.pending
  const isNotice = message.kind === MESSAGE_KINDS.notice
  const isResult = message.kind === MESSAGE_KINDS.result
  const retry = isNotice ? message.retry : null
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
            isResult && 'max-w-[44rem]',
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
              BoQ Assistant
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
        <div className="w-full max-w-[44rem] pl-[2.375rem] sm:pl-10">
          {message.text && (
            <div className="mb-4 text-[0.8125rem] leading-[1.65] text-[var(--tone-ink)]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.text}
              </ReactMarkdown>
            </div>
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
              'w-full max-w-[44rem] ml-[2.375rem] sm:ml-10 border border-[var(--tone-line)] bg-white shadow-2xs',
          )}
        >
          {isPending ? (
            <div className="flex items-center gap-2.5 py-0.5">
              <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--color-brand-deep)]">
                <CircleNotch
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="animate-spin"
                />
              </span>
              <span className="text-[0.75rem] font-medium text-[var(--tone-ink)]">
                {message.text}
              </span>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand-deep)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand-deep)]" />
              </span>
            </div>
          ) : isNotice ? (
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 shrink-0',
                  isFailure ? 'text-[var(--color-danger)]' : 'text-[var(--color-brand-deep)]',
                )}
              >
                {isFailure ? (
                  <Warning size={16} weight="fill" aria-hidden="true" />
                ) : (
                  <Info size={16} weight="fill" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] leading-[1.6] text-[var(--tone-ink)]">
                  {message.text}
                </p>
                {retry && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRetry?.(retry)}
                    className={cn(
                      'mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xs border border-[var(--tone-line-strong)] bg-white px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)] shadow-2xs font-display transition-colors hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)] disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    <ArrowClockwise size={12} weight="bold" />
                    <span>Retry Request</span>
                  </button>
                )}
              </div>
            </div>
          ) : isUser ? (
            <p className="text-[0.8125rem] font-medium leading-[1.65] text-white whitespace-pre-wrap">
              {message.text}
            </p>
          ) : (
            <div className="text-[0.8125rem] leading-[1.65] text-[var(--tone-ink)]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}


      {stamp && (
        <time
          dateTime={toISOTimestamp(message.at)}
          className={cn(
            'mt-1 text-[0.625rem] font-medium tracking-tight text-[var(--tone-muted-dark)]/60 font-display',
            isUser ? 'pr-1 text-right' : 'ml-[2.375rem] sm:ml-10 text-left',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {stamp}
        </time>
      )}
    </article>
  )
}

