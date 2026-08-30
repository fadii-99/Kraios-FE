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
      className={cn('relative inline-flex items-center', className)}
    >
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
          'inline-flex h-7 cursor-pointer items-center justify-between gap-1 rounded-xs bg-transparent border-0 shadow-none px-1 font-display select-none transition-colors duration-150',
          'hover:text-[var(--color-brand-deep)] focus-visible:outline-none',
          isOpen ? 'text-[var(--color-brand-deep)]' : 'text-[var(--tone-ink)]',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]">
          Documents
        </span>
        <CaretDown
          size={9}
          weight="bold"
          aria-hidden="true"
          className={cn(
            'shrink-0 text-[var(--tone-ink)] transition-transform duration-200 ease-[var(--ease-out-expo)]',
            isOpen && 'rotate-180 text-[var(--color-brand-deep)]',
          )}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="dialog"
          className={cn(
            'absolute right-0 top-full z-[100] mt-2 w-80 sm:w-88 rounded-md border border-[var(--tone-line-strong)] bg-white p-2.5 shadow-[0_12px_32px_rgba(7,20,38,0.18)]',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          )}
        >
          {/* Header label */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-2 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
            <span>Attached Documents</span>
            <span className="rounded-xs bg-blue-50 px-1.5 py-0.5 text-[0.5625rem] text-[var(--color-brand-deep)] font-bold">
              {count} {count === 1 ? 'File' : 'Files'}
            </span>
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 px-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-slate-100 text-slate-400 mb-2">
                <FileText size={20} weight="duotone" />
              </div>
              <p className="text-[0.75rem] font-bold text-[var(--tone-ink)]">
                No files uploaded
              </p>
              <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--tone-muted-dark)] max-w-[15rem]">
                No project documents attached yet.
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
  )
}
