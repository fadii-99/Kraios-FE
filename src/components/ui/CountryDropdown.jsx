import { useEffect, useId, useRef, useState, useMemo } from 'react'
import { CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react'

import { countries } from '@/lib/countries'
import { cn } from '@/lib/cn'

/**
 * Professional KRAIOS Country Dropdown Form Control.
 *
 * Adheres strictly to the KRAIOS design system:
 * - Same field height, border, radius (--radius-sm), focus ring, and typography as FormInput
 * - Same popover surface, item hover, checkmark, and shadow language as Dashboard controls
 * - Built-in search filtering for fast alphabetical keyboard/pointer selection
 * - Click-outside dismiss, Escape key handling, and aria accessibility
 */
export default function CountryDropdown({
  id: customId,
  name = 'country',
  label = 'Country',
  placeholder = 'Select country',
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
  const [search, setSearch] = useState('')

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Filter countries alphabetically based on user query
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries
    const q = search.toLowerCase()
    return countries.filter((c) => c.toLowerCase().includes(q))
  }, [search])

  // Handle click-outside and keyboard escape
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearch('')
        onBlur?.()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
        triggerRef.current?.focus()
        onBlur?.()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onBlur])

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus()
    }
  }, [isOpen])

  function handleSelect(country) {
    // Provide a synthetic change event shape compatible with standard form handlers
    if (onChange) {
      onChange({ target: { name, value: country } })
    }
    setIsOpen(false)
    setSearch('')
    triggerRef.current?.focus()
  }

  function handleClear(e) {
    e.stopPropagation()
    if (onChange) {
      onChange({ target: { name, value: '' } })
    }
    setSearch('')
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

      {/* ── Trigger Button ── */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev)
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
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
            value ? 'text-[var(--tone-ink)] font-normal' : 'text-[var(--tone-muted)]/55',
          )}
        >
          {value || placeholder}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="flex h-5 w-5 items-center justify-center rounded-xs text-[var(--tone-muted)] hover:bg-slate-200/60 hover:text-[var(--tone-ink)] transition-colors"
              title="Clear selection"
            >
              <X size={12} weight="bold" />
            </span>
          )}

          <CaretDown
            size={14}
            weight="bold"
            aria-hidden="true"
            className={cn(
              'shrink-0 text-[var(--tone-muted)] transition-transform duration-200',
              isOpen && 'rotate-180 text-[var(--tone-accent)]',
            )}
          />
        </div>
      </button>

      {/* ── Popover Menu Surface ── */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-[100] mt-2 flex flex-col rounded-md border border-[var(--tone-line-strong)] bg-white p-1.5 shadow-[0_16px_40px_rgba(7,20,38,0.22)]',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          )}
        >
          {/* Quick search input */}
          <div className="relative mb-1 px-1 pt-1">
            <MagnifyingGlass
              size={14}
              weight="bold"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--tone-muted)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className={cn(
                'w-full rounded-xs border border-[var(--tone-line)] bg-slate-50/80 py-1.5 pl-8 pr-3 text-[0.875rem] text-[var(--tone-ink)]',
                'placeholder:text-[var(--tone-muted)]/60 outline-none focus:border-[var(--tone-accent)] focus:bg-white transition-all',
              )}
            />
          </div>

          {/* Listbox */}
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label="Select Country"
            className="max-h-60 overflow-y-auto overscroll-contain py-1"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country === value
                return (
                  <li
                    key={country}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country)}
                    className={cn(
                      'flex cursor-pointer select-none items-center justify-between rounded-xs px-3.5 py-2.5 text-[0.9375rem] transition-colors',
                      isSelected
                        ? 'bg-[var(--tone-accent)]/10 font-bold text-[var(--tone-accent)]'
                        : 'text-[var(--tone-ink)] hover:bg-[var(--color-light)]',
                    )}
                  >
                    <span className="truncate pr-2">{country}</span>
                    {isSelected && (
                      <Check
                        size={15}
                        weight="bold"
                        className="shrink-0 text-[var(--tone-accent)]"
                      />
                    )}
                  </li>
                )
              })
            ) : (
              <li className="px-3.5 py-4 text-center text-[0.875rem] text-[var(--tone-muted)]">
                No country found
              </li>
            )}
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
