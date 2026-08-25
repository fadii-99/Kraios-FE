import DashboardBrand from '@/components/dashboard/DashboardBrand'
import DashboardNavItem from '@/components/dashboard/DashboardNavItem'
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_SIGN_OUT,
} from '@/lib/dashboard/dashboardNavigation'
import { cn } from '@/lib/cn'

/**
 * The desktop dashboard rail (>= 1024px), light theme.
 *
 * Three bands and nothing else: the brand lockup in its own ruled header, the
 * four destinations grouped together beneath it, and the way out held at the
 * foot by a flexible gap. No search, no section headings, no account block —
 * everything the rail carries is either a place you can go or the door.
 *
 * 12rem / 192px. Measured, not picked: "Subscription" is the longest label and
 * sets at ~81px at 13px, so a row runs 16 + 16 + 10 + 81 + 12 = 135px; the
 * centred brand lockup runs 32 + 10 + ~69 = 111px inside a 160px track. Both
 * clear it with room, and the narrower rail hands the width back to the
 * workspace, which is what actually needs it.
 *
 * Structure comes from whitespace and one hairline — no cards, no radius, no
 * shadow. The rail is part of the shell, not a panel floating on it.
 */
export default function DashboardSidebar({ className, onNavigate }) {
  return (
    <aside
      aria-label="Dashboard sidebar"
      className={cn(
        'tone-light z-20 hidden h-dvh shrink-0 select-none flex-col overflow-hidden border-r border-[var(--tone-line)] bg-white lg:sticky lg:top-0 lg:flex lg:w-[13.5rem]',
        className,
      )}
    >
      {/* Brand header: Centred mark with balanced vertical breathing room */}
      <DashboardBrand
        onNavigate={(e) => onNavigate?.('/dashboard', e)}
        className="shrink-0 justify-center border-b border-[var(--tone-line)] px-4 pt-5 pb-5"
      />

      {/* The register. `pt-4` is the intentional gap under the rule; `gap-0.5`
          holds the four rows as one group rather than a spread list.
          `min-h-0` + `overflow-y-auto` lets a very short viewport scroll the
          rows instead of crushing the Log out band below. */}
      <nav
        aria-label="Dashboard"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pt-4"
      >
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <DashboardNavItem
            key={item.id}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* The way out, separated by the hairline with generous bottom padding */}
      <div className="shrink-0 border-t border-[var(--tone-line)] pt-3 pb-7">
        <DashboardNavItem
          item={DASHBOARD_SIGN_OUT}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  )
}
