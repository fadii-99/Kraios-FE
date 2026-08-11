import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'
import { startOfDay, toISODate } from '@/lib/date'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Monday-first grid, padded so every week is a full row. */
function buildMonth(year, month) {
  const first = new Date(year, month, 1)
  // JS weeks start Sunday; shift so Monday is 0
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()

  const cells = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

/**
 * Light-theme month picker. Past dates are disabled; every day is a real
 * button with `aria-pressed`, so it is operable and announced from the
 * keyboard without any extra wiring.
 */
export default function CalendarPicker({ value, onSelect, minDate, id = 'calendar' }) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const floor = minDate ? startOfDay(minDate) : today

  const [view, setView] = useState(() => {
    const base = value ?? today
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  const cells = useMemo(() => buildMonth(view.year, view.month), [view])

  const shift = (delta) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // don't let the user page back past the month containing `floor`
  const atFloorMonth =
    view.year === floor.getFullYear() && view.month === floor.getMonth()

  return (
    <div
      className="border border-[var(--tone-line-strong)] bg-[var(--field-bg)] p-4 sm:p-5"
      role="group"
      aria-label="Choose a date"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={atFloorMonth}
          aria-label="Previous month"
          className="flex h-11 w-11 cursor-pointer items-center justify-center border border-[var(--tone-line)] text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--tone-line)] disabled:hover:text-[var(--tone-ink)]"
        >
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
        </button>

        <p className="label-mono text-[var(--tone-ink)]" aria-live="polite" id={`${id}-month`}>
          {MONTHS[view.month]} {view.year}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="flex h-11 w-11 cursor-pointer items-center justify-center border border-[var(--tone-line)] text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d} className="label-mono py-2 text-center text-[var(--tone-muted)]">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />

          const disabled = date < floor
          // Boolean(), not `value && …`: that yields null when nothing is
          // selected, and React drops null attributes — leaving unselected days
          // with no aria-pressed at all, so they stop reading as toggles.
          const selected = Boolean(value && toISODate(value) === toISODate(date))
          const isToday = toISODate(date) === toISODate(today)

          return (
            <button
              key={toISODate(date)}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={date.toDateString()}
              onClick={() => onSelect(date)}
              className={cn(
                'relative flex h-11 cursor-pointer items-center justify-center border text-[0.9375rem] tabular-nums',
                'transition-colors duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]',
                selected
                  ? 'border-[var(--tone-accent)] bg-[var(--tone-accent)] font-semibold text-white'
                  : 'border-transparent text-[var(--tone-ink)] hover:border-[var(--tone-accent)]',
                disabled &&
                  'cursor-not-allowed text-[var(--tone-muted)]/45 hover:border-transparent',
              )}
            >
              {date.getDate()}
              {isToday && !selected && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[var(--tone-accent)]"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
