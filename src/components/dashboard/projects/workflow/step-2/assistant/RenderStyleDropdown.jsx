import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

import { RENDER_STYLES, renderStyleById } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * Custom Render Style Dropdown component for Step 2 Design Assistant.
 *
 * Pointer-driven listbox: click-outside dismiss, Escape to close (focus returns
 * to the trigger), animated caret, clean architectural design styling.
 *
 * Selection is bound to `onClick` ONLY. It used to be bound to `onMouseDown`
 * AND `onClick`, which ran the selection twice for a single mouse press —
 * harmless while the styles are frontend metadata, not harmless once choosing a
 * style issues a real generation request.
 *
 * The options are not yet reachable by keyboard: arrow-key roving focus over
 * the list is NOT implemented, and this comment says so rather than claiming a
 * behaviour the control does not have. The trigger itself is a real button, so
 * it is focusable, operable and dismissible from the keyboard.
 */
export default function RenderStyleDropdown({
  value,
  onChange,
  disabled = false,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const listboxId = useId()

  const currentStyle = renderStyleById(value)

  // Handle click outside to close dropdown
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
        // Escape must not strand focus on a menu that is no longer there.
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

  function handleSelect(styleId) {
    onChange?.(styleId)
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center gap-2.5 sm:gap-3', className)}
    >
      <label
        htmlFor={buttonId}
        className="font-display shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-400/80"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Style
      </label>




      <div className="group/style-tip relative">
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
            'inline-flex h-8 min-w-[8.5rem] cursor-pointer items-center justify-between gap-2.5 rounded-sm border border-[var(--tone-line-strong)] bg-white px-3 py-1 text-left',
            'text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--tone-ink)] shadow-2xs font-display',
            'transition-all duration-200 ease-[var(--ease-out-expo)]',
            'hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-light)]/50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
            isOpen && 'border-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-deep)]/15',
            disabled && 'cursor-not-allowed opacity-50 shadow-none hover:border-[var(--tone-line-strong)]',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="truncate">{currentStyle.label}</span>
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
              'pointer-events-none absolute right-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-slate-200/90 bg-white/95 px-2.5 py-1 text-[0.625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
              'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
              'group-hover/style-tip:opacity-100 group-hover/style-tip:translate-y-0 group-focus-within/style-tip:opacity-100 group-focus-within/style-tip:translate-y-0',
            )}
          >
            Select 3D render style
            <div className="absolute -top-1 right-4 h-1.5 w-1.5 rotate-45 border-l border-t border-slate-200/90 bg-white" />
          </div>
        )}

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className={cn(
              'absolute right-0 top-full z-[100] mt-1.5 w-64 rounded-md border border-[var(--tone-line-strong)] bg-white p-1.5 shadow-[0_12px_36px_rgba(7,20,38,0.2)]',
              'animate-in fade-in-0 zoom-in-95 duration-150',
            )}
          >
            {RENDER_STYLES.map((style) => {
              const isSelected = style.id === currentStyle.id
              return (
                <li
                  key={style.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(style.id)}
                  className={cn(
                    'flex cursor-pointer select-none items-center justify-between rounded-xs px-3.5 py-2.5 text-[0.8125rem] transition-colors',
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
                      {style.label}
                    </span>
                    {style.description && (
                      <span className="mt-0.5 text-[0.6875rem] font-normal text-[var(--color-muted-dark)]">
                        {style.description}
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
