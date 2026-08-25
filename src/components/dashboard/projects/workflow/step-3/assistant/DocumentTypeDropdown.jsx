import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

import { DOCUMENT_TYPES, documentTypeById } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * Custom Document Type Dropdown component for Step 3 BoQ Assistant.
 *
 * Uses the exact same design language and interactive behaviors as the Design Assistant dropdowns:
 * - Uppercase tracking label ("DOCUMENT TYPE")
 * - Architectural border, font-display, custom caret animation
 * - Custom interactive menu with descriptions and active check indicator
 *
 * Selection is bound to `onClick` ONLY — the previous `onMouseDown` + `onClick`
 * pair ran it twice for one mouse press. Escape closes and returns focus to the
 * trigger. Arrow-key roving focus over the options is NOT implemented.
 */
export default function DocumentTypeDropdown({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const listboxId = useId()

  const currentType = documentTypeById(value)

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

  function handleSelect(typeId) {
    onChange?.(typeId)
    setIsOpen(false)
    buttonRef.current?.focus()
  }

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
          Doc Type
        </label>
      )}

      <div className="group/type-tip relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          className={cn(
            'inline-flex h-8 min-w-[10.5rem] sm:min-w-[11.5rem] cursor-pointer items-center justify-between gap-2 rounded-sm border border-[var(--tone-line-strong)] bg-white px-2.5 sm:px-3 py-1 text-left',
            'text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[var(--tone-ink)] shadow-2xs font-display',
            'transition-all duration-200 ease-[var(--ease-out-expo)]',
            'hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-light)]/50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
            isOpen && 'border-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-deep)]/15',
            disabled &&
              'cursor-not-allowed opacity-50 shadow-none hover:border-[var(--tone-line-strong)]',
          )}
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}
        >
          <span className="truncate">{currentType.label}</span>
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
              'group-hover/type-tip:opacity-100 group-hover/type-tip:translate-y-0 group-focus-within/type-tip:opacity-100 group-focus-within/type-tip:translate-y-0',
            )}
          >
            Select project document classification
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rotate-45 border-l border-t border-slate-200/90 bg-white" />
          </div>
        )}

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className={cn(
              'absolute right-0 top-full z-[100] mt-1.5 w-72 rounded-md border border-[var(--tone-line-strong)] bg-white p-1.5 shadow-[0_12px_36px_rgba(7,20,38,0.2)]',
              'animate-in fade-in-0 zoom-in-95 duration-150',
            )}
          >

            {DOCUMENT_TYPES.map((type) => {
              const isSelected = type.id === currentType.id
              return (
                <li
                  key={type.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(type.id)}
                  className={cn(
                    'flex cursor-pointer select-none items-center justify-between rounded-xs px-3 py-2 text-[0.8125rem] transition-colors',
                    isSelected
                      ? 'bg-[var(--color-brand-deep)]/10 font-bold text-[var(--color-brand-deep)]'
                      : 'text-[var(--tone-ink)] hover:bg-[var(--color-light)]',
                  )}
                >
                  <div className="flex flex-col pr-2">
                    <span
                      className="font-display text-[0.75rem] font-bold uppercase tracking-[0.08em]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {type.label}
                    </span>
                    {type.description && (
                      <span className="mt-0.5 text-[0.6875rem] font-normal text-[var(--color-muted-dark)]">
                        {type.description}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check
                      size={16}
                      weight="bold"
                      className="shrink-0 text-[var(--color-brand-deep)]"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
