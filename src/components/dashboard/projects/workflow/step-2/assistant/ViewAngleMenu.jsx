import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

import { VIEW_ANGLES, viewAngleById } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * View Angle Dropdown component for Step 2 Design Assistant.
 *
 * Pointer-driven listbox: click-outside dismiss, Escape to close (focus returns
 * to the trigger), animated caret, clean architectural design styling.
 *
 * Selection is bound to `onClick` ONLY — see `RenderStyleDropdown` for why the
 * previous `onMouseDown` + `onClick` pair was a genuine bug here: picking an
 * angle now STARTS A GENERATION, so a double fire would have queued two.
 *
 * Arrow-key roving focus over the options is NOT implemented. The trigger is a
 * real button and is fully keyboard operable; the option list is not.
 */
export default function ViewAngleMenu({
  value,
  onSelect,
  onChange,
  disabled = false,
  showLabel = false,
  align = 'right',
  className,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAngleId, setSelectedAngleId] = useState(value || null)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const listboxId = useId()

  const currentAngle = viewAngleById(selectedAngleId ?? value)
  const displayLabel = currentAngle ? currentAngle.label : 'SELECT'

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

  function handleChoice(angle) {
    setSelectedAngleId(angle.id)
    setIsOpen(false)
    buttonRef.current?.focus()
    onSelect?.(angle)
    onChange?.(angle.id)
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center gap-1.5', className)}
    >
      {showLabel && (
        <label
          htmlFor={buttonId}
          className="font-display shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-400/80"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Angle
        </label>
      )}

      <div className="group/angle-tip relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="View Angle"
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
            ANGLE:
          </span>
          <span className="truncate max-w-[6.5rem] sm:max-w-[7.5rem] text-[0.625rem] font-bold uppercase tracking-wide text-[var(--color-brand-deep)]">
            {displayLabel}
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
              'pointer-events-none absolute z-50 mt-1 whitespace-nowrap rounded-xs border border-slate-200/90 bg-white/95 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
              align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2',
              'top-full opacity-0 -translate-y-1 transition-all duration-200 ease-out',
              'group-hover/angle-tip:opacity-100 group-focus-within/angle-tip:opacity-100',
            )}
          >
            Change 3D camera angle
            <div
              className={cn(
                'absolute -top-1 h-1.5 w-1.5 rotate-45 border-l border-t border-slate-200/90 bg-white',
                align === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2',
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
              'absolute z-[100] mt-2 w-48 rounded-md border border-[var(--tone-line-strong)] bg-white p-1.5 shadow-[0_12px_32px_rgba(7,20,38,0.18)]',
              align === 'right' ? 'right-0' : 'left-0',
              'top-full animate-in fade-in-0 zoom-in-95 duration-150',
            )}
          >
            {VIEW_ANGLES.map((angle) => {
              const isSelected = Boolean(currentAngle) && angle.id === currentAngle.id
              return (
                <li
                  key={angle.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleChoice(angle)}
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
                    {angle.label}
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



