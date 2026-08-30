import { forwardRef, useId, useRef } from 'react'
import { CircleNotch, PaperPlaneRight, Paperclip, Ruler } from '@phosphor-icons/react'

import DocumentTypeDropdown from '@/components/dashboard/projects/workflow/step-3/assistant/DocumentTypeDropdown'
import {
  ASSISTANT_GRID,
  ASSISTANT_GUTTER,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantGrid'
import { BOQ_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * The BoQ Prompt Composer — single-line input bar with high contrast, elevated footer,
 * measurement icon, attachment control, integrated document type dropdown, and
 * intuitive send triggers.
 *
 * The attachment control is what finally makes Step 3's document API reachable.
 * The reducer and the header's Uploaded Documents dropdown had existed for a
 * while with nothing able to add a document — a documented dead end. The file
 * is classified by whatever the document-type dropdown beside it says, and the
 * page uploads it through `POST /step-3/documents/`; documents are deliberately
 * separate from conversation attachments, so this never sends a file to the
 * conversation or the generation endpoint.
 */
const BoQComposer = forwardRef(function BoQComposer(
  {
    value,
    onChange,
    onSubmit,
    busy,
    documentTypeId,
    onDocumentTypeChange,
    onAttachDocument,
    uploading = false,
    className,
  },
  ref,
) {
  const canSend = Boolean(value.trim()) && !busy
  const attachId = useId()
  const attachInputRef = useRef(null)

  const handleAttachChange = (event) => {
    const [file] = Array.from(event.target.files || [])
    // Reset first: picking the same file twice in a row must still fire.
    event.target.value = ''
    if (file) onAttachDocument?.(file)
  }

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
          <label htmlFor="boq-assistant-prompt" className="sr-only">
            Describe what you want included in the BoQ
          </label>

          <div
            className={cn(
              'flex items-center w-full rounded-md border border-[var(--tone-line-strong)] bg-slate-50/90 p-1 sm:p-1.5 gap-2 shadow-2xs transition-all duration-200',
              'focus-within:border-[var(--color-brand-deep)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--color-brand-deep)]/15',
            )}
          >
            {/* Measurement / Takeoff Brand Icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]"
              aria-hidden="true"
            >
              <Ruler size={18} weight="bold" />
            </div>

            {/* Supporting Document Attachment */}
            {onAttachDocument && (
              <>
                <label htmlFor={attachId} className="sr-only">
                  Attach a supporting document
                </label>
                <input
                  id={attachId}
                  ref={attachInputRef}
                  type="file"
                  onChange={handleAttachChange}
                  disabled={uploading}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => attachInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Attach a supporting document"
                  title="Attach supporting document"
                  className={cn(
                    'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xs',
                    'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-muted-dark)]',
                    'transition-colors duration-200 ease-[var(--ease-out-expo)]',
                    'hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
                    'disabled:cursor-not-allowed disabled:opacity-45',
                  )}
                >
                  {uploading ? (
                    <CircleNotch size={16} weight="bold" aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Paperclip size={16} weight="bold" aria-hidden="true" />
                  )}
                </button>
              </>
            )}

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

            {/* Document Type Dropdown — integrated neatly on the right side of the prompt input */}
            {onDocumentTypeChange && documentTypeId && (
              <div className="shrink-0">
                <DocumentTypeDropdown
                  value={documentTypeId}
                  onChange={onDocumentTypeChange}
                  disabled={busy}
                  placement="top"
                  showLabel={false}
                />
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={!canSend}
              aria-label={busy ? 'Analyzing' : 'Send BoQ request'}
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

