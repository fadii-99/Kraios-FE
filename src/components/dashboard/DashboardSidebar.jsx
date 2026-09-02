import { useState } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import DashboardBrand from '@/components/dashboard/DashboardBrand'
import DashboardNavItem from '@/components/dashboard/DashboardNavItem'
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_SIGN_OUT,
} from '@/lib/dashboard/dashboardNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'

/**
 * The desktop dashboard rail (>= 1024px), light theme.
 *
 * Supports expanding to full width (13.5rem) and collapsing to narrow icon rail (3.75rem).
 * State is remembered in localStorage so user preferences persist.
 */
export default function DashboardSidebar({ className, onNavigate }) {
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kraios:sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('kraios:sidebar-collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <aside
      aria-label="Dashboard sidebar"
      className={cn(
        'tone-light z-30 hidden h-dvh shrink-0 select-none flex-col border-r border-[var(--tone-line)] bg-white lg:sticky lg:top-0 lg:flex',
        'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]',
        collapsed ? 'lg:w-[3.75rem]' : 'lg:w-[13.5rem]',
        className,
      )}
    >
      {/* Sleek Floating Collapse/Expand Toggle Button on the Right Border */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'group/toggle absolute -right-3.5 top-1/2 -translate-y-1/2 z-40',
          'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full',
          // A full-strength hairline, not a 90%-opacity slate: the control
          // floats on the page surface just outside the sidebar's own edge, and
          // at 28px it was reading as part of the background rather than as a
          // button somebody could press.
          'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)]',
          'shadow-[0_2px_10px_rgba(7,20,38,0.12),0_1px_3px_rgba(7,20,38,0.08)]',
          'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)] hover:text-white',
          'hover:shadow-[0_4px_14px_rgba(11,94,215,0.28)] hover:scale-110 active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
        )}
      >
        <CaretLeft
          size={12}
          weight="bold"
          className={cn(
            'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            collapsed ? 'rotate-180 translate-x-[0.5px]' : 'rotate-0 -translate-x-[0.5px]',
          )}
        />
      </button>

      {/* Brand header: Centred mark with balanced vertical breathing room */}
      <DashboardBrand
        collapsed={collapsed}
        onNavigate={(e) => onNavigate?.('/dashboard', e)}
        className={cn(
          'shrink-0 justify-center border-b border-[var(--tone-line)] pt-5 pb-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          collapsed ? 'px-1' : 'px-4',
        )}
      />

      {/* The register */}
      <nav
        aria-label="Dashboard"
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pt-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          collapsed ? 'px-1.5' : 'px-2',
        )}
      >
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <DashboardNavItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* The way out, separated by the hairline with generous bottom padding */}
      <div
        className={cn(
          'shrink-0 border-t border-[var(--tone-line)] pt-3 pb-7 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          collapsed ? 'px-1.5' : 'px-2',
        )}
      >
        <DashboardNavItem
          item={DASHBOARD_SIGN_OUT}
          collapsed={collapsed}
          onClick={logout}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  )
}

