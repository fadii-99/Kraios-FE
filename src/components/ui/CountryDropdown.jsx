import { useEffect, useId, useRef, useState, useMemo } from 'react'
import { CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react'

import { countries, filterCountries, normalizeCountrySearchText } from '@/lib/countries'
import { cn } from '@/lib/cn'

/**
 * Subtle text highlighter that emphasizes matching query characters.
 */
function HighlightMatch({ text, query }) {
  if (!query || !query.trim()) return text
  const normText = normalizeCountrySearchText(text)
  const normQuery = normalizeCountrySearchText(query)
  if (!normQuery) return text

  const index = normText.indexOf(normQuery)
  if (index !== -1) {
    const start = index
    const end = start + normQuery.length
    return (
      <>
        {text.slice(0, start)}
        <span className="font-bold text-[var(--tone-ink)] underline decoration-[var(--tone-accent)]/35 underline-offset-2">
          {text.slice(start, end)}
        </span>
        {text.slice(end)}
      </>
    )
  }

  const firstToken = normQuery.split(' ')[0]
  if (firstToken && firstToken.length > 1) {
    const tokenIdx = normText.indexOf(firstToken)
    if (tokenIdx !== -1) {
      const start = tokenIdx
      const end = start + firstToken.length
      return (
        <>
          {text.slice(0, start)}
          <span className="font-bold text-[var(--tone-ink)] underline decoration-[var(--tone-accent)]/35 underline-offset-2">
            {text.slice(start, end)}
          </span>
          {text.slice(end)}
        </>
      )
    }
  }

  return text
}

/**
 * Professional KRAIOS Country Dropdown Form Control.
 *
 * Adheres strictly to the KRAIOS design system:
 * - Same field height, border, radius (--radius-sm), focus ring, and typography as FormInput
 * - Same popover surface, item hover, checkmark, and shadow language as Dashboard controls
 * - Built-in fast, forgiving, normalized search filtering with intelligent ranking and alias support
 * - Full keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Click-outside dismiss and aria accessibility
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
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const searchInputRef = useRef(null)
  const listboxRef = useRef(null)

  // Filter and rank countries using normalized matching algorithm
  const filteredCountries = useMemo(() => {
    return filterCountries(countries, search)
  }, [search])

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, filteredCountries.length - 1))

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (!isOpen || !listboxRef.current) return
    const activeEl = listboxRef.current.children[safeActiveIndex]
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [safeActiveIndex, isOpen])

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

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen, onBlur])

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus()
    }
  }, [isOpen])

  function handleOpenToggle() {
    if (disabled) return
    setIsOpen((prev) => {
      const next = !prev
      if (next) {
        setSearch('')
        if (value) {
          const valIdx = countries.indexOf(value)
          setActiveIndex(valIdx !== -1 ? valIdx : 0)
        } else {
          setActiveIndex(0)
        }
      } else {
        setSearch('')
      }
      return next
    })
  }

  function handleSearchChange(e) {
    setSearch(e.target.value)
    setActiveIndex(0)
  }


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

  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filteredCountries.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCountries.length > 0 && filteredCountries[safeActiveIndex]) {
        handleSelect(filteredCountries[safeActiveIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setSearch('')
      triggerRef.current?.focus()
      onBlur?.()
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

      {/* ── Trigger Button ── */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleOpenToggle}
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
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search country..."
              className={cn(
                'w-full rounded-xs border border-[var(--tone-line)] bg-slate-50/80 py-1.5 pl-8 pr-3 text-[0.875rem] text-[var(--tone-ink)]',
                'placeholder:text-[var(--tone-muted)]/60 outline-none focus:border-[var(--tone-accent)] focus:bg-white transition-all',
              )}
            />
          </div>

          {/* Listbox */}
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label="Select Country"
            className="max-h-60 overflow-y-auto overscroll-contain py-1"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => {
                const isSelected = country === value
                const isActive = index === safeActiveIndex
                return (
                  <li
                    key={country}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex cursor-pointer select-none items-center justify-between rounded-xs px-3.5 py-2.5 text-[0.9375rem] transition-colors',
                      isSelected && 'bg-[var(--tone-accent)]/10 font-bold text-[var(--tone-accent)]',
                      isActive && !isSelected && 'bg-[var(--color-light)] text-[var(--tone-ink)]',
                      !isActive && !isSelected && 'text-[var(--tone-ink)]',
                    )}
                  >
                    <span className="truncate pr-2">
                      <HighlightMatch text={country} query={search} />
                    </span>
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
              <li className="px-3.5 py-6 text-center select-none">
                <p className="text-[0.875rem] font-medium text-[var(--tone-muted)]">
                  No countries found
                </p>
                <p className="mt-1 text-[0.8125rem] text-[var(--tone-muted)]/70">
                  Try another country name.
                </p>
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


