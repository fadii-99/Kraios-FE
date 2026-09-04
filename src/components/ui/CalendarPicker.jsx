import { useEffect, useMemo, useState } from 'react'
import { CaretLeft, CaretRight, CircleNotch } from '@phosphor-icons/react'

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
 *
 * OPENNESS IS OPTIONAL AND ABSENT MEANS OPEN. With no `availableDates`, every
 * date from `minDate` on is selectable — the plain picker. Pass a Set of
 * `YYYY-MM-DD` and it becomes an allow-list: anything not in it is disabled.
 * `null` and an empty Set therefore mean OPPOSITE things, which is the point —
 * "nobody restricted this calendar" and "this month is fully closed" must not
 * render the same, and a request that has not answered yet must not flash a
 * month of open days it is about to take back. Keep `availableDates` null until
 * the answer arrives and pass `loading` in the meantime.
 *
 * @param {Set<string>} [availableDates] `YYYY-MM-DD` allow-list; omit for none
 * @param {boolean} [loading] the allow-list is in flight — freeze the grid
 * @param {(view: {year: number, month: number}) => void} [onMonthChange] fires
 *   on mount and on every page, so the owner can fetch that month
 */
export default function CalendarPicker({
  value,
  onSelect,
  minDate,
  maxDate,
  availableDates = null,
  loading = false,
  onMonthChange,
  id = 'calendar',
}) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const floor = minDate ? startOfDay(minDate) : today
  const ceiling = maxDate ? startOfDay(maxDate) : null

  const [view, setView] = useState(() => {
    const base = value ?? today
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  // Fires on mount too, so the owner never has to seed the first month itself
  // and then keep two copies of "which month is showing" in step.
  useEffect(() => {
    onMonthChange?.(view)
  }, [view, onMonthChange])

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

  // …nor forward past the last month anything is bookable in
  const atCeilingMonth = Boolean(
    ceiling &&
      view.year === ceiling.getFullYear() &&
      view.month === ceiling.getMonth(),
  )

  return (
    <div
      className="rounded-md border border-[var(--tone-line-strong)] bg-[var(--field-bg)] p-4 sm:p-5"
      role="group"
      aria-label="Choose a date"
      aria-busy={loading || undefined}
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

        <p className="label-ui flex items-center gap-2 text-[var(--tone-ink)]" aria-live="polite" id={`${id}-month`}>
          {MONTHS[view.month]} {view.year}
          {loading && (
            <CircleNotch
              size={14}
              weight="bold"
              aria-hidden="true"
              className="animate-spin text-[var(--tone-muted)]"
            />
          )}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={atCeilingMonth}
          aria-label="Next month"
          className="flex h-11 w-11 cursor-pointer items-center justify-center border border-[var(--tone-line)] text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--tone-line)] disabled:hover:text-[var(--tone-ink)]"
        >
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d} className="label-ui py-2 text-center text-[var(--tone-muted)]">
            {d}
          </span>
        ))}
      </div>

      <div className={cn('mt-1 grid grid-cols-7 gap-1', loading && 'opacity-45')}>
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />

          const iso = toISODate(date)
          const closed = Boolean(availableDates) && !availableDates.has(iso)
          const disabled =
            loading || closed || date < floor || Boolean(ceiling && date > ceiling)

          // Boolean(), not `value && …`: that yields null when nothing is
          // selected, and React drops null attributes — leaving unselected days
          // with no aria-pressed at all, so they stop reading as toggles.
          const selected = Boolean(value && toISODate(value) === iso)
          const isToday = iso === toISODate(today)

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              // "Unavailable" rather than nothing: a disabled button with no
              // reason is a dead end to a screen reader, and the visual grid's
              // answer (it is greyed) is not one.
              aria-label={closed ? `${date.toDateString()} — unavailable` : date.toDateString()}
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
