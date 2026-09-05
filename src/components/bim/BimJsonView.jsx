import { useMemo, useState } from 'react'
import { Check, Copy, DownloadSimple } from '@phosphor-icons/react'

import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * The plan JSON, readable.
 *
 * Highlighting is a single regex over the pretty-printed text rather than a
 * syntax-highlighting dependency. The input is `JSON.stringify` output — a
 * known, regular shape with no comments, no trailing content and no ambiguity —
 * so a tokeniser here would be several hundred lines and a package solving a
 * problem this document cannot have.
 *
 * The text is escaped BEFORE the regex runs. A room called `<script>` is
 * perfectly legal in a plan, and this renders through `dangerouslySetInnerHTML`.
 */

// Order matters: strings first, so a number inside a string is not re-matched.
// The capture group distinguishes a key (a string followed by a colon) from a
// value.
const TOKENS = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

const TOKEN_CLASS = {
  key: 'text-[var(--color-brand-deep)]',
  string: 'text-emerald-700',
  literal: 'text-purple-700',
  number: 'text-amber-700',
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlight(json) {
  return escapeHtml(json).replace(
    TOKENS,
    (match, quoted, colon, literal, number) => {
      if (quoted !== undefined) {
        const kind = colon ? 'key' : 'string'
        return `<span class="${TOKEN_CLASS[kind]}">${quoted}</span>${colon ?? ''}`
      }
      if (literal !== undefined) {
        return `<span class="${TOKEN_CLASS.literal}">${literal}</span>`
      }
      return `<span class="${TOKEN_CLASS.number}">${number}</span>`
    },
  )
}

export default function BimJsonView({ plan, filename = 'plan.json', className }) {
  const [copied, setCopied] = useState(false)

  const text = useMemo(() => JSON.stringify(plan ?? {}, null, 2), [plan])
  const html = useMemo(() => highlight(text), [text])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showSuccessToast('Plan JSON copied.', { id: 'bim-json-copy' })
      // Long enough to read, short enough that the button is not stuck showing
      // a stale confirmation the next time the user looks at it.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. Say so rather than leaving a button that does
      // nothing.
      showErrorToast('Your browser would not allow copying.', { id: 'bim-json-copy' })
    }
  }

  const onDownload = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[0.75rem] text-[var(--tone-muted-dark)]">
          The model is built from exactly this. {Math.round(text.length / 1024)} KB.
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Action icon={copied ? Check : Copy} onClick={onCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Action>
          <Action icon={DownloadSimple} onClick={onDownload}>
            Download
          </Action>
        </div>
      </div>

      <pre className="min-h-0 flex-1 overflow-auto rounded-xs border border-[var(--tone-line)] bg-[var(--color-light)] p-3 font-mono text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
        {/* Safe: `highlight` escapes the JSON before adding any markup. */}
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

function Action({ icon: Icon, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs border border-[var(--tone-line-strong)] px-2 py-1',
        'text-[0.6875rem] font-semibold text-[var(--tone-ink)] transition-colors',
        'hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-deep)]',
      )}
      {...rest}
    >
      <Icon size={12} weight="bold" aria-hidden="true" />
      {children}
    </button>
  )
}
