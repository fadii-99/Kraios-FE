import { Toaster } from 'react-hot-toast'
import { CheckCircle, CircleNotch, Info, X, XCircle } from '@phosphor-icons/react'

import { dismissToast, toastKind } from '@/lib/toast'
import { cn } from '@/lib/cn'

/*
 * Component only. The `show*Toast` helpers live in `@/lib/toast` — a module
 * exporting both a component and plain functions cannot be Fast-Refreshed.
 */

const ICON_BADGE =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border mr-2.5'

/**
 * The compact Kraios status badge: a white toast keeps its meaning in one small
 * geometric mark, never in a coloured fill across the whole surface.
 */
function KraiosToastIcon({ kind }) {
  switch (kind) {
    case 'success':
      return (
        <div className={cn(ICON_BADGE, 'border-emerald-200/80 bg-emerald-100 text-emerald-600')}>
          <CheckCircle size={13} weight="fill" aria-hidden="true" className="shrink-0" />
        </div>
      )
    case 'error':
      return (
        <div className={cn(ICON_BADGE, 'border-rose-200/80 bg-rose-100 text-rose-600')}>
          <XCircle size={13} weight="fill" aria-hidden="true" className="shrink-0" />
        </div>
      )
    case 'loading':
      return (
        <div
          className={cn(
            ICON_BADGE,
            'border-blue-200/80 bg-blue-100 text-[var(--color-brand-deep,#0b5ed7)]',
          )}
        >
          <CircleNotch size={13} weight="bold" aria-hidden="true" className="shrink-0 animate-spin" />
        </div>
      )
    case 'info':
    default:
      return (
        <div
          className={cn(
            ICON_BADGE,
            'border-blue-200/80 bg-blue-100 text-[var(--color-brand-deep,#0b5ed7)]',
          )}
        >
          <Info size={13} weight="fill" aria-hidden="true" className="shrink-0" />
        </div>
      )
  }
}

/** Compact close control with the same focus treatment as the rest of the UI. */
function KraiosToastCloseButton({ onDismiss }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Close notification"
      className="ml-2 -mr-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-[var(--color-brand-deep,#0b5ed7)]"
    >
      <X size={12} weight="bold" aria-hidden="true" />
    </button>
  )
}

/**
 * The one global notification host — mounted once, in `main.jsx`, so public,
 * auth, dashboard, workflow and modal surfaces all share it. Never render a
 * second one per page.
 *
 * Visual system (light Kraios theme):
 * - white surface, hairline border, --radius-md geometry, restrained shadow
 * - semantic meaning carried by a small icon badge and a 2px progress rule,
 *   never by a coloured fill
 * - 0.75rem body type in the product font, width capped so long copy wraps
 *
 * The toast is rendered by hand rather than through the library's `ToastBar`:
 * `ToastBar` ships its own surface, radius and shadow, and unpicking those
 * inline styles costs more than drawing the 40px row directly.
 */
export default function KraiosToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerClassName="kraios-toaster"
      containerStyle={{ top: 18, right: 18, bottom: 18, left: 18 }}
      /* The library keeps a dismissed toast mounted for `removeDelay` so it can
         play its exit. Ours takes 220ms, so it has no reason to sit inert in
         the DOM for the default second afterwards. */
      toastOptions={{ removeDelay: 300 }}
    >
      {(t) => {
        const kind = toastKind(t)
        const dismissible = kind !== 'loading'

        return (
          <div
            {...t.ariaProps}
            data-toast-kind={kind}
            className={cn(
              'kraios-toast',
              t.visible ? 'kraios-toast--enter' : 'kraios-toast--exit',
            )}
          >
            <KraiosToastIcon kind={kind} />

            <p className="min-w-0 flex-1 break-words text-[0.75rem] font-semibold leading-[1.4] text-[#0f172a]">
              {typeof t.message === 'function' ? t.message(t) : t.message}
            </p>

            {dismissible && <KraiosToastCloseButton onDismiss={() => dismissToast(t.id)} />}

            {/* The remaining-time rule. A loading toast has no end to draw. */}
            {dismissible && Number.isFinite(t.duration) && (
              <span
                aria-hidden="true"
                className="kraios-toast__progress"
                style={{ animationDuration: `${t.duration}ms` }}
              />
            )}
          </div>
        )
      }}
    </Toaster>
  )
}
