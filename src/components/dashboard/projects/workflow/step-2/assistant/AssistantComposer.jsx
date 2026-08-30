import { forwardRef } from 'react'
import { CircleNotch, PaperPlaneRight, Sparkle, X } from '@phosphor-icons/react'

import RenderStyleDropdown from '@/components/dashboard/projects/workflow/step-2/assistant/RenderStyleDropdown'
import {
  ASSISTANT_GRID,
  ASSISTANT_GUTTER,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantGrid'
import { ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { THREE_D_GENERATION_SUPPORTS_CANCEL } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * The prompt composer — single-line input bar with high contrast, elevated footer,
 * integrated style dropdown on the right side, and intuitive send triggers.
 */
const AssistantComposer = forwardRef(function AssistantComposer(
  {
    value,
    onChange,
    onSubmit,
    onCancel,
    busy,
    placeholder = ASSISTANT_COPY.composerPlaceholder,
    renderStyleId,
    onRenderStyleChange,
    className,
  },
  ref,
) {
  const canSend = Boolean(value.trim()) && !busy

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <div
      className={cn(
        'shrink-0 border-t border-[var(--tone-line)] bg-white/95 shadow-[0_-4px_24px_rgba(7,20,38,0.06)] backdrop-blur-md',
        className,
      )}
    >
      <div className={cn(ASSISTANT_GUTTER, ASSISTANT_GRID, 'flex flex-col gap-2.5 py-3 sm:py-3.5')}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend) onSubmit()
          }}
          className="relative"
        >
          <label htmlFor="design-assistant-prompt" className="sr-only">
            {placeholder}
          </label>

          <div
            className={cn(
              'flex items-center w-full rounded-md border border-[var(--tone-line-strong)] bg-slate-50/90 p-1 sm:p-1.5 gap-2 shadow-2xs transition-all duration-200',
              'focus-within:border-[var(--color-brand-deep)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--color-brand-deep)]/15',
            )}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]"
              aria-hidden="true"
            >
              <Sparkle size={18} weight="fill" />
            </div>

            <input
              id="design-assistant-prompt"
              ref={ref}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              className={cn(
                'w-full min-w-0 bg-transparent px-2.5 text-[0.875rem] font-medium text-[var(--tone-ink)] sm:text-[0.9375rem]',
                'placeholder:text-slate-400 focus:outline-none',
              )}
            />

            {/* Render Style Dropdown — integrated neatly on the right side of the prompt input */}
            {onRenderStyleChange && renderStyleId && (
              <div className="shrink-0">
                <RenderStyleDropdown
                  value={renderStyleId}
                  onChange={onRenderStyleChange}
                  disabled={busy}
                  placement="top"
                  showLabel={false}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!canSend}
              aria-label={busy ? 'Generating' : 'Send instruction'}
              title="Send (Enter)"
              className={cn(
                'flex h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 cursor-pointer items-center justify-center rounded-xs',
                'bg-[var(--color-brand-deep)] text-white shadow-2xs transition-all duration-200 ease-[var(--ease-out-expo)]',
                'hover:bg-blue-700 active:scale-95',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
                'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--color-brand-deep)]',
              )}
            >
              {busy ? (
                <CircleNotch
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <PaperPlaneRight
                  size={16}
                  weight="fill"
                  aria-hidden="true"
                  className="translate-x-px"
                />
              )}
            </button>
          </div>
        </form>

        {busy && THREE_D_GENERATION_SUPPORTS_CANCEL && (
          <div className="flex justify-end px-1">
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                'label-ui inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] bg-white px-2.5 text-[0.625rem] font-semibold text-[var(--tone-muted-dark)] shadow-2xs',
                'transition-colors duration-200 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
              )}
            >
              <X size={12} weight="bold" aria-hidden="true" />
              <span>Cancel Generation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export default AssistantComposer
