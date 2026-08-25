import { NavLink } from 'react-router-dom'
import {
  Blueprint,
  CrownSimple,
  Layout,
  SignOut,
  UserFocus,
} from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

const ICON_MAP = {
  Layout,
  Blueprint,
  CrownSimple,
  UserFocus,
  SignOut,
}

/** Crisp optical size for high-definition sidebar iconography */
const ICON_SIZE = 19

/**
 * Row geometry, shared by every variant so a Log out row and a destination row
 * can never sit at different heights.
 */
/* `rounded-r-sm` only: the row is full-bleed to the rail's left edge, where the
   active marker sits flush, so the inner (right) edge is the one that gets the
   softened corner. Rounding the left would leave the 2.5px marker proud of it. */
const ROW = [
  'group relative flex w-full min-h-11 touch:min-h-12 items-center gap-3.5 py-2.5 pl-6 pr-4 rounded-l-none rounded-r-sm',
  'text-[0.8125rem] font-medium transition-colors duration-150 motion-reduce:transition-none',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
].join(' ')

/**
 * The active marker: a 2px brand rule flush to the rail's left edge, struck
 * from the row's centre outward when the route becomes current.
 */
function ActiveMarker({ active }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-y-0 left-0 w-[2.5px] origin-center bg-[var(--color-brand-deep)]',
        'transition-transform duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        active ? 'scale-y-100' : 'scale-y-0',
      )}
    />
  )
}

/**
 * One row of the dashboard sidebar — a destination, or the Log out action.
 */
export default function DashboardNavItem({ item, onClick, onNavigate, className }) {
  const Icon = ICON_MAP[item.icon] ?? Layout

  const handleClick = (e) => {
    if (onNavigate) {
      const allowed = onNavigate(item.path, e)
      if (allowed === false) return
    }
    onClick?.(e)
  }

  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        title="Coming soon"
        className={cn(
          ROW,
          'cursor-not-allowed select-none text-[var(--tone-muted)] opacity-50',
          className,
        )}
      >
        <Icon size={ICON_SIZE} weight="medium" aria-hidden="true" className="shrink-0" />
        <span className="min-w-0 flex-1 truncate font-medium tracking-[0.01em]">{item.label}</span>
      </div>
    )
  }

  // Log out: Distinct, clear signout action
  if (item.variant === 'signout') {
    return (
      <NavLink
        to={item.path}
        end={item.end}
        onClick={handleClick}
        className={cn(
          ROW,
          'text-[var(--tone-muted-dark)]',
          'hover:bg-[var(--color-danger)]/[0.06] hover:text-[var(--color-danger)]',
          className,
        )}
      >
        <Icon
          size={ICON_SIZE}
          weight="bold"
          aria-hidden="true"
          className="shrink-0 transition-colors duration-150 motion-reduce:transition-none"
        />
        <span className="min-w-0 flex-1 truncate font-medium tracking-[0.01em]">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={handleClick}
      className={({ isActive }) =>
        cn(
          ROW,
          isActive
            ? 'bg-[var(--color-brand-deep)]/[0.07] text-[var(--color-brand-deep)]'
            : 'text-[var(--tone-ink)] hover:bg-[var(--color-brand-deep)]/[0.04]',
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          <ActiveMarker active={isActive} />

          <Icon
            size={ICON_SIZE}
            weight={isActive ? 'bold' : 'bold'}
            aria-hidden="true"
            className={cn(
              'shrink-0 transition-all duration-150 motion-reduce:transition-none',
              isActive
                ? 'text-[var(--color-brand-deep)]'
                : 'text-[var(--tone-ink)] group-hover:text-[var(--color-brand-deep)]',
            )}
          />

          <span
            className={cn(
              'min-w-0 flex-1 truncate tracking-[0.01em]',
              isActive
                ? 'font-semibold text-[var(--color-brand-deep)]'
                : 'font-medium text-[var(--tone-ink)]',
            )}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  )
}
