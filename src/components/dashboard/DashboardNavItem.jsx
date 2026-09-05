import { NavLink } from 'react-router-dom'
import {
  Blueprint,
  CrownSimple,
  Cube,
  Layout,
  SignOut,
  UserFocus,
} from '@phosphor-icons/react'
import { HISTORY_FLOOR_STATE } from '@/hooks/useHistoryFloor'
import { cn } from '@/lib/cn'

const ICON_MAP = {
  Layout,
  Blueprint,
  Cube,
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
  'group relative flex w-full min-h-10 touch:min-h-11 items-center rounded-sm',
  'text-[0.8125rem] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
].join(' ')

/**
 * The active marker: a 3px brand pill flush to the row's left edge
 */
function ActiveMarker({ active }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[var(--color-brand-deep)]',
        'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        active ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
      )}
    />
  )
}

/**
 * One row of the dashboard sidebar — a destination, or the Log out action.
 */
export default function DashboardNavItem({ item, onClick, onNavigate, className, collapsed = false }) {
  const Icon = ICON_MAP[item.icon] ?? Layout

  const handleClick = (e) => {
    if (onNavigate) {
      const allowed = onNavigate(item.path, e)
      if (allowed === false) return
    }
    onClick?.(e)
  }

  const baseRowClass = cn(
    ROW,
    collapsed ? 'justify-center px-0 gap-0' : 'pl-3.5 pr-3 gap-2.5',
  )

  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        title={collapsed ? `${item.label} (Coming soon)` : 'Coming soon'}
        className={cn(
          baseRowClass,
          'cursor-not-allowed select-none text-[var(--tone-muted)] opacity-50',
          className,
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Icon size={ICON_SIZE} weight="medium" aria-hidden="true" />
        </div>
        <span
          className={cn(
            'whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            collapsed
              ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
              : 'max-w-[140px] opacity-100 translate-x-0',
            'font-medium tracking-[0.01em]',
          )}
        >
          {item.label}
        </span>
      </div>
    )
  }

  // Log out: Distinct, clear signout action.
  //
  // `replace` drops the dashboard address the user signed out of, and the floor
  // state stops Back walking into the ones behind it. Those addresses would
  // only answer with the caution modal now that the session is gone, so Back
  // could not return anybody to the dashboard — but it walked a signed-out user
  // through their own dashboard history to say so, and this is a deliberate way
  // out, not a rejected entry.
  if (item.variant === 'signout') {
    return (
      <NavLink
        to={item.path}
        end={item.end}
        replace
        state={HISTORY_FLOOR_STATE}
        onClick={handleClick}
        title={collapsed ? item.label : undefined}
        className={cn(
          baseRowClass,
          'text-[var(--tone-muted-dark)]',
          'hover:bg-[var(--color-danger)]/[0.06] hover:text-[var(--color-danger)]',
          className,
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Icon
            size={ICON_SIZE}
            weight="bold"
            aria-hidden="true"
            className="transition-colors duration-200"
          />
        </div>
        <span
          className={cn(
            'whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            collapsed
              ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
              : 'max-w-[140px] opacity-100 translate-x-0',
            'font-medium tracking-[0.01em]',
          )}
        >
          {item.label}
        </span>
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={handleClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          baseRowClass,
          isActive
            ? 'bg-[var(--color-brand-deep)]/[0.08] text-[var(--color-brand-deep)]'
            : 'text-[var(--tone-ink)] hover:bg-[var(--color-brand-deep)]/[0.04]',
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          <ActiveMarker active={isActive} />

          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            <Icon
              size={ICON_SIZE}
              weight={isActive ? 'bold' : 'bold'}
              aria-hidden="true"
              className={cn(
                'transition-all duration-200',
                isActive
                  ? 'text-[var(--color-brand-deep)]'
                  : 'text-[var(--tone-ink)] group-hover:text-[var(--color-brand-deep)]',
              )}
            />
          </div>

          <span
            className={cn(
              'whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              collapsed
                ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
                : 'max-w-[140px] opacity-100 translate-x-0',
              isActive
                ? 'font-semibold text-[var(--color-brand-deep)]'
                : 'font-medium text-[var(--tone-ink)] group-hover:text-[var(--color-brand-deep)]',
            )}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  )
}
