import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, FileText, Trash } from '@phosphor-icons/react'

import { formatFileSize } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { cn } from '@/lib/cn'

/**
 * Uploaded Documents Dropdown component for Step 3 BoQ Assistant.
 *
 * Shows count of uploaded files in the header and opens a structured drawer/menu
 * showing all attached project documents with metadata and removal actions.
 *
 * Read-only apart from removal. There is no way to ADD a document yet: the
 * state layer has `uploadDocument` and a document record type, but the composer
 * exposes no attachment control and this maintenance pass does not add one,
 * because that would mean putting a new element into an approved interface. The
 * empty copy below therefore states the fact rather than directing the user to
 * a composer action that does not exist.
 */
export default function UploadedDocumentsDropdown({
  documents = [],
  onRemove,
  disabled = false,
  showLabel = true,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const listboxId = useId()

  const count = documents.length

  // Handle click outside & escape key
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center gap-2.5 sm:gap-3', className)}
    >
      {showLabel && (
        <label
          htmlFor={buttonId}
          className="font-display shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-400/80"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Documents
        </label>
      )}

      <div className="group/doc-tip relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          className={cn(
            'inline-flex h-8 min-w-[7.5rem] cursor-pointer items-center justify-between gap-2.5 rounded-sm border border-[var(--tone-line-strong)] bg-white px-3 py-1 text-left',
            'text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--tone-ink)] shadow-2xs font-display',
            'transition-all duration-200 ease-[var(--ease-out-expo)]',
            'hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-light)]/50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
            isOpen && 'border-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-deep)]/15',
            disabled &&
              'cursor-not-allowed opacity-50 shadow-none hover:border-[var(--tone-line-strong)]',
          )}
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}
        >
          <span className="truncate">
            {count === 0 ? 'No Files' : `${count} ${count === 1 ? 'File' : 'Files'}`}
          </span>
          <CaretDown
            size={12}
            weight="bold"
            aria-hidden="true"
            className={cn(
              'shrink-0 text-[var(--tone-muted-dark)] transition-transform duration-200 ease-[var(--ease-out-expo)]',
              isOpen && 'rotate-180 text-[var(--color-brand-deep)]',
            )}
          />
        </button>

        {!isOpen && (
          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-slate-200/90 bg-white/95 px-2 py-0.5 text-[0.5625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
              'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
              'group-hover/doc-tip:opacity-100 group-hover/doc-tip:translate-y-0 group-focus-within/doc-tip:opacity-100 group-focus-within/doc-tip:translate-y-0',
            )}
          >
            View attached project documents
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rotate-45 border-l border-t border-slate-200/90 bg-white" />
          </div>
        )}

        {isOpen && (
          <div
            id={listboxId}
            role="dialog"
            className={cn(
              'absolute right-0 top-full z-[100] mt-1.5 w-72 rounded-md border border-[var(--tone-line-strong)] bg-white p-2.5 shadow-[0_12px_36px_rgba(7,20,38,0.2)]',
              'animate-in fade-in-0 zoom-in-95 duration-150',
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--tone-line)] pb-2 mb-2">
              <span
                className="font-display text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Project Documents
              </span>
              <span className="text-[0.625rem] font-semibold text-[var(--tone-muted)]">
                {count} {count === 1 ? 'file' : 'files'}
              </span>
            </div>

            {count === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-slate-100 text-slate-400 mb-2">
                  <FileText size={18} weight="duotone" />
                </div>
                <p className="text-[0.75rem] font-bold text-[var(--tone-ink)]">
                  No documents uploaded
                </p>
                <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--tone-muted-dark)] max-w-[14rem]">
                  No supporting documents have been added to this project.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-xs border border-[var(--tone-line)] bg-slate-50/60 p-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText
                        size={16}
                        weight="bold"
                        className="shrink-0 text-[var(--color-brand-deep)]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)]">
                          {doc.name}
                        </p>
                        <p className="text-[0.625rem] text-[var(--tone-muted)]">
                          {doc.typeLabel || 'Document'}
                          {typeof doc.size === 'number' ? ` · ${formatFileSize(doc.size)}` : ''}
                        </p>
                      </div>
                    </div>

                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(doc.id)}
                        aria-label={`Remove ${doc.name}`}
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash size={13} weight="bold" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
