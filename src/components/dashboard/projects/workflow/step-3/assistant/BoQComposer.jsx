import { forwardRef } from 'react'
import { CircleNotch, PaperPlaneRight, Ruler } from '@phosphor-icons/react'

import {
  ASSISTANT_GRID,
  ASSISTANT_GUTTER,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantGrid'
import { BOQ_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * The BoQ Prompt Composer — one field, one send action, nothing else.
 *
 * The paperclip and the document-type menu used to live here. Attaching a file
 * and saying what KIND of file it is are one decision, and answering it in two
 * controls at opposite ends of the field meant a document could be uploaded
 * under whatever classification happened to be selected. Both moved into the
 * header's PROJECT FILES panel, where the slot a file is dropped on IS its
 * classification, and where it sits beside the plan and the render it will be
 * read with. Documents remain deliberately separate from conversation
 * attachments: nothing here sends a file to the conversation or the generation
 * endpoint.
 */
const BoQComposer = forwardRef(function BoQComposer(
  {
    value,
    onChange,
    onSubmit,
    busy,
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

  /* The composer zone carries NO surface of its own any more. A white band with
     a hairline and a lifted shadow read as a second footer stacked under the
     workspace; the field is the object here, so the band steps back to the page
     and lets the field float on it. */
  return (
    <div className={cn('shrink-0 bg-transparent', className)}>
      <div className={cn(ASSISTANT_GUTTER, ASSISTANT_GRID, 'flex flex-col gap-2.5 pb-4 pt-2 sm:pb-5 sm:pt-2.5')}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend) onSubmit()
          }}
          className="relative"
        >
          <label htmlFor="boq-assistant-prompt" className="sr-only">
            Describe what you want included in the BoQ
          </label>

          <div
            className={cn(
              'flex items-center w-full rounded-[var(--radius-field)] border border-[var(--tone-line-strong)] bg-white p-1.5 sm:p-2 gap-2 transition-all duration-200',
              'shadow-[0_2px_14px_rgba(7,20,38,0.07),0_1px_2px_rgba(7,20,38,0.04)]',
              'focus-within:border-[var(--color-brand-deep)] focus-within:ring-2 focus-within:ring-[var(--color-brand-deep)]/15',
            )}
          >
            {/* Measurement / Takeoff Brand Icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]"
              aria-hidden="true"
            >
              <Ruler size={18} weight="bold" />
            </div>

            {/* Text Input */}
            <input
              id="boq-assistant-prompt"
              ref={ref}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={BOQ_ASSISTANT_COPY.composerPlaceholder}
              autoComplete="off"
              className={cn(
                'w-full min-w-0 bg-transparent px-2.5 text-[0.875rem] font-medium text-[var(--tone-ink)] sm:text-[0.9375rem]',
                'placeholder:text-slate-400 focus:outline-none',
              )}
            />

            {/* Submit Action */}
            <button
              type="submit"
              disabled={!canSend}
              aria-label={busy ? 'Analyzing' : 'Send BoQ request'}
              title="Send (Enter)"
              className={cn(
                'flex h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md',
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
                  className="animate-spin text-white"
                />
              ) : (
                <PaperPlaneRight size={16} weight="fill" className="translate-x-px" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

export default BoQComposer

