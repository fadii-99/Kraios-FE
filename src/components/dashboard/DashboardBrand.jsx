import { Link } from 'react-router-dom'
import Logo from '@/components/ui/Logo'
import { site } from '@/lib/content'
import { cn } from '@/lib/cn'

/**
 * The application brand lockup at the head of the dashboard rail: the Kraios
 * mark with the wordmark set beside it.
 *
 * It exists as its own component so the desktop rail and the mobile drawer
 * cannot drift apart on it — the same reason `ui/Logo.jsx` is shared by the
 * public Navbar and Footer. The mark itself still comes from `Logo`, so there
 * is exactly one place the asset is referenced.
 *
 * Two deliberate calls:
 *
 * 1. The mark runs at 32px, not the 44px the rail used to carry. A mark that
 *    has a wordmark beside it is half of a lockup, not the whole brand, and it
 *    is sized against the wordmark's cap height rather than the rail's width.
 *
 * 2. Tracking is POSITIVE (+0.05em) where the `.display-*` scale is negative.
 *    That scale's negative tracking is tuned for headings set at 40px and up,
 *    where Inter's side bearings leave big caps looking loose. At 17px the
 *    opposite is true: six caps pulled tight read as a cramped word, and a
 *    wordmark has to read as a mark. This is the one place the display font is
 *    letterspaced open, and it is why the lockup is not a `.display-*` class.
 *
 * The link carries its own `aria-label`, so the mark's alt text and the
 * wordmark are not read out twice. It is a plain `Link`, not a `NavLink`:
 * `NavLink` would stamp `aria-current="page"` on the lockup while on
 * `/dashboard`, and the Overview row already owns that.
 */
export default function DashboardBrand({ className, onNavigate }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Link
        to="/dashboard"
        onClick={onNavigate}
        aria-label={`${site.name} — dashboard home`}
        className="inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-brand-deep)]"
      >
        <Logo size="sidebar" />
      </Link>
    </div>
  )
}
