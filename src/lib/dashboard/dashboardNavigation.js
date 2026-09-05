/**
 * Central navigation configuration for the Kraios dashboard.
 *
 * Single source of truth for the GLOBAL sidebar: Overview and Projects as the
 * application-level destinations, then the two account destinations —
 * Subscription and Profile — pinned last. The desktop rail and the mobile
 * drawer both read this list, so the two can never drift apart.
 *
 * Upload / 3D Rendering / BoQ / Output are per-project stages and never appear
 * here — their function lives inside a project.
 *
 * `disabled: true` renders an item as non-clickable "Coming soon" text; no item
 * currently uses it.
 */

export const DASHBOARD_NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/dashboard',
    end: true,
    icon: 'Layout',
  },
  {
    id: 'projects',
    label: 'Projects',
    path: '/dashboard/projects',
    end: false,
    icon: 'Blueprint',
  },
  {
    // Part of a removable feature - see src/pages/bim/README.md.
    id: 'bim',
    label: '3D Engine',
    path: '/dashboard/bim',
    end: false,
    icon: 'Cube',
  },
  {
    id: 'subscription',
    label: 'Subscription',
    path: '/dashboard/subscription',
    end: false,
    icon: 'CrownSimple',
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/dashboard/profile',
    end: false,
    icon: 'UserFocus',
  },
]

/**
 * The way out. It lives here rather than being typed into the rail and the
 * drawer separately, for the same reason the destinations do — but it is kept
 * OUT of `DASHBOARD_NAV_ITEMS` on purpose: it is an action, not a destination,
 * and it must never be iterated into the navigation register.
 *
 * `variant: 'signout'` is what tells `DashboardNavItem` to drop the active
 * marker and pick up the restrained danger hover.
 */
export const DASHBOARD_SIGN_OUT = {
  id: 'sign-out',
  label: 'Log out',
  path: '/login',
  end: true,
  icon: 'SignOut',
  variant: 'signout',
}
