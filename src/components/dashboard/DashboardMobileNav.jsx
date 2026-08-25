import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { List, X } from '@phosphor-icons/react'
import Logo from '@/components/ui/Logo'
import DashboardBrand from '@/components/dashboard/DashboardBrand'
import DashboardNavItem from '@/components/dashboard/DashboardNavItem'
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_SIGN_OUT,
} from '@/lib/dashboard/dashboardNavigation'
import { site } from '@/lib/content'

/**
 * Mobile and tablet top bar & drawer navigation for the Kraios dashboard
 * (light theme). Active below 1024px.
 *
 * The drawer is the desktop rail: same brand lockup, same rows, same active
 * marker, same Log out band, all from the same components and the same config.
 * It is one navigation system rendered at two widths, not a second one.
 */
export default function DashboardMobileNav({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const closeRef = useRef(null)
  const toggleRef = useRef(null)

  // Find active item label for the top-bar title
  const currentItem = DASHBOARD_NAV_ITEMS.find((item) =>
    item.end
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path),
  )

  const handleMobileNav = (path, e) => {
    if (onNavigate) {
      const allowed = onNavigate(path, e)
      if (allowed === false) {
        setOpen(false)
        return false
      }
    }
    setOpen(false)
    return true
  }

  // Body scroll lock & Escape listener
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    const toggle = toggleRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
      // Hand focus back to the control that opened the drawer, so closing it
      // with Escape does not drop the keyboard user at the top of the document.
      toggle?.focus()
    }
  }, [open])

  return (
    <>
      {/* Top bar. The mark travels alone here — the wordmark belongs to the
          drawer, where the rail's own head is reproduced. */}
      <header className="tone-light flex h-14 shrink-0 items-center justify-between border-b border-[var(--tone-line)] bg-white px-4 lg:hidden">
        <Link
          to="/dashboard"
          onClick={(e) => handleMobileNav('/dashboard', e)}
          className="flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]"
          aria-label={`${site.name} — dashboard home`}
        >
          <Logo size="nav" className="h-7 w-7" />
        </Link>

        {/* Where you currently are */}
        {currentItem && (
          <span className="label-ui min-w-0 truncate px-2 text-[var(--color-brand-deep)]">
            {currentItem.label}
          </span>
        )}

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open dashboard navigation"
          aria-expanded={open}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-[var(--tone-ink)] transition-colors hover:text-[var(--color-brand-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]"
        >
          <List size={22} weight="regular" aria-hidden="true" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#071426]/40 backdrop-blur-xs transition-opacity duration-200"
          />

          <aside className="tone-light relative flex h-full w-[17rem] max-w-[85vw] flex-col border-r border-[var(--tone-line)] bg-white">
            {/* Same head as the rail, with the close control beside it. */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--tone-line)] pt-5 pr-2 pb-5 pl-4">
              <DashboardBrand onNavigate={(e) => handleMobileNav('/dashboard', e)} />

              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="-mt-0.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-[var(--tone-muted)] transition-colors hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]"
              >
                <X size={20} weight="regular" aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Dashboard"
              className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pt-4"
            >
              {DASHBOARD_NAV_ITEMS.map((item) => (
                <DashboardNavItem
                  key={item.id}
                  item={item}
                  onClick={() => setOpen(false)}
                  onNavigate={onNavigate}
                />
              ))}
            </nav>

            <div className="shrink-0 border-t border-[var(--tone-line)] pt-2 pb-3">
              <DashboardNavItem
                item={DASHBOARD_SIGN_OUT}
                onClick={() => setOpen(false)}
                onNavigate={onNavigate}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
