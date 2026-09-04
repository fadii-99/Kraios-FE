import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * A short single-choice field — the non-searchable sibling of
 * `CountryDropdown`.
 *
 * WHY NOT COUNTRYDROPDOWN. That control exists to find one name among 196, so
 * it opens onto a search box. A six-option list does not need one, and a search
 * field the user has to skip past to reach the second option is friction added
 * to look thorough. Same field metrics, same popover surface, same check mark;
 * everything a visitor recognises is shared, and the one thing that differs is
 * the one thing that should.
 *
 * WHY NOT A NATIVE `<select>`. It cannot be given the field's border, focus
 * ring and radius consistently across browsers, and this form sits beside
 * `FormInput` and `CountryDropdown` where any difference reads as a mistake.
 *
 * KEYBOARD, stated exactly (§32 — do not claim what is not here). The trigger
 * is a real button: Enter or Space opens it. With the menu open the TRIGGER
 * keeps focus and drives the list through `aria-activedescendant`, so ArrowUp /
 * ArrowDown move the active option, Home and End jump to the ends, Enter
 * selects, Escape closes. Focus never leaves the trigger, which is why closing
 * never has to put it back. Selection is bound to `onClick` and to nothing
 * else.
 *
 * The value is reported through a synthetic `{ target: { name, value } }`, the
 * shape `CountryDropdown` already uses, so a form handles both with one
 * `setField`.
 */
export default function SelectDropdown({
  id: customId,
  name,
  label,
  placeholder = 'Select an option',
  options,
  value = '',
  onChange,
  onBlur,
  required = false,
  disabled = false,
  error,
  className,
}) {
  const autoId = useId()
  const id = customId || autoId
  const errorId = `${id}-error`
  const listboxId = `${id}-listbox`

  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const listboxRef = useRef(null)

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, options.length - 1))

  useEffect(() => {
    if (!isOpen || !listboxRef.current) return
    listboxRef.current.children[safeActiveIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [safeActiveIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        onBlur?.()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, onBlur])

  // Opening lands on what is already chosen, so the first ArrowDown moves one
  // step from there rather than jumping to the top of the list.
  const open = () => {
    const chosen = options.indexOf(value)
    setActiveIndex(chosen === -1 ? 0 : chosen)
    setIsOpen(true)
  }

  const select = (option) => {
    onChange?.({ target: { name, value: option } })
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event) {
    if (disabled) return

    if (event.key === 'Escape') {
      if (!isOpen) return
      event.preventDefault()
      setIsOpen(false)
      onBlur?.()
      return
    }

    if (!isOpen) {
      // Arrow keys open the menu, which is what a listbox trigger is expected
      // to do. Enter and Space are left to the button itself.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        open()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (options[safeActiveIndex]) select(options[safeActiveIndex])
    }
  }

  return (
    <div ref={containerRef} className={cn('group relative', className)}>
      <label
        htmlFor={id}
        className="label-ui block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
      >
        {label}
        {required && (
          <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && options[safeActiveIndex] ? `${id}-option-${safeActiveIndex}` : undefined
        }
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'mt-3 flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-sm border bg-[var(--field-bg)] px-4 py-3.5 text-left text-[1rem]',
          'transition-[border-color,box-shadow] duration-300 outline-none focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          error
            ? 'border-[#E5484D] focus:border-[#E5484D]'
            : [
                'border-[var(--tone-line-strong)] hover:border-[var(--tone-muted)]',
                isOpen
                  ? 'border-[var(--tone-accent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--tone-accent)_16%,transparent)]'
                  : 'focus:border-[var(--tone-accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--tone-accent)_16%,transparent)]',
              ].join(' '),
        )}
      >
        <span
          className={cn(
            'truncate',
            value ? 'font-normal text-[var(--tone-ink)]' : 'text-[var(--tone-muted)]/55',
          )}
        >
          {value || placeholder}
        </span>

        <CaretDown
          size={14}
          weight="bold"
          aria-hidden="true"
          className={cn(
            'shrink-0 text-[var(--tone-muted)] transition-transform duration-200',
            isOpen && 'rotate-180 text-[var(--tone-accent)]',
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-[100] mt-2 flex flex-col rounded-md border border-[var(--tone-line-strong)] bg-white p-1.5 shadow-[0_16px_40px_rgba(7,20,38,0.22)]',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          )}
        >
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            className="max-h-60 overflow-y-auto overscroll-contain py-1"
          >
            {options.map((option, index) => {
              const isSelected = option === value
              const isActive = index === safeActiveIndex

              return (
                <li
                  key={option}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex cursor-pointer select-none items-center justify-between rounded-xs px-3.5 py-2.5 text-[0.9375rem] transition-colors',
                    isSelected && 'bg-[var(--tone-accent)]/10 font-bold text-[var(--tone-accent)]',
                    isActive && !isSelected && 'bg-[var(--color-light)] text-[var(--tone-ink)]',
                    !isActive && !isSelected && 'text-[var(--tone-ink)]',
                  )}
                >
                  <span className="truncate pr-2">{option}</span>
                  {isSelected && (
                    <Check size={15} weight="bold" className="shrink-0 text-[var(--tone-accent)]" />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && (
        <p id={errorId} className="sr-only">
          Error — {error}
        </p>
      )}
    </div>
  )
}
