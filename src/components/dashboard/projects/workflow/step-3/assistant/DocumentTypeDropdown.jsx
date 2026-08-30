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
  showLabel = false,
  placement = 'top',
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
      className={cn('relative flex items-center gap-1.5', className)}
    >
      {showLabel && (
        <label
          htmlFor={buttonId}
          className="font-display shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-400/80 hidden xl:block"
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
            'inline-flex h-6.5 cursor-pointer items-center justify-between gap-1 rounded-xs bg-transparent border-0 shadow-none px-1 text-left font-display select-none transition-colors duration-150',
            'hover:text-[var(--color-brand-deep)] focus-visible:outline-none',
            isOpen
              ? 'text-[var(--color-brand-deep)]'
              : 'text-[var(--tone-ink)]',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            DOC TYPE:
          </span>
          <span className="truncate max-w-[7.5rem] text-[0.625rem] font-bold uppercase tracking-wide text-[var(--color-brand-deep)]">
            {currentType.label}
          </span>
          <CaretDown
            size={9}
            weight="bold"
            aria-hidden="true"
            className={cn(
              'shrink-0 text-slate-400 transition-transform duration-200 ease-[var(--ease-out-expo)]',
              isOpen && 'rotate-180 text-[var(--color-brand-deep)]',
            )}
          />
        </button>

        {!isOpen && (
          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute right-0 z-50 whitespace-nowrap rounded-xs border border-slate-200/90 bg-white/95 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
              placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
              'opacity-0 transition-all duration-200 ease-out',
              'group-hover/type-tip:opacity-100 group-focus-within/type-tip:opacity-100',
            )}
          >
            Select project document classification
            <div
              className={cn(
                'absolute right-3 h-1.5 w-1.5 rotate-45 border-slate-200/90 bg-white',
                placement === 'top'
                  ? '-bottom-1 border-b border-r'
                  : '-top-1 border-l border-t',
              )}
            />
          </div>
        )}

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className={cn(
              'absolute right-0 z-[100] w-56 rounded-md border border-[var(--tone-line-strong)] bg-white p-1.5 shadow-[0_12px_32px_rgba(7,20,38,0.18)]',
              placement === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2',
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
                    'flex cursor-pointer select-none items-center justify-between rounded-xs px-2.5 py-2 text-[0.625rem] transition-colors',
                    isSelected
                      ? 'bg-[var(--color-brand-deep)]/10 font-bold text-[var(--color-brand-deep)]'
                      : 'text-[var(--tone-ink)] hover:bg-[var(--color-light)]',
                  )}
                >
                  <span
                    className="font-display font-bold uppercase tracking-[0.06em]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {type.label}
                  </span>

                  {isSelected && (
                    <Check
                      size={11}
                      weight="bold"
                      className="shrink-0 text-[var(--color-brand-deep)] ml-1.5"
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
