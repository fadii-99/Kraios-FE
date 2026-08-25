/**
 * The dashboard's shared responsive geometry, declared once.
 *
 * Every page had been re-typing its own gutter scale, and they had drifted:
 * Projects, Subscription and the project workspace ran `px-5 sm:px-7 lg:px-10
 * xl:px-12`, Profile ran `px-5 sm:px-8 lg:px-12 xl:px-14`, and the Design
 * Assistant ran a third scale of its own. The result was that moving between
 * two dashboard pages shifted the left datum by up to 8px — small enough that
 * nobody names it, large enough that the product feels loose.
 *
 * ONE scale, applied by every page header and every page body:
 *
 *   base   20px   phones — compact, but the content never touches the edge
 *   sm     28px   large phones / tablet portrait
 *   lg     40px   the sidebar has just appeared and taken 13.5rem, so the
 *                 workspace tightens rather than widens here
 *   xl     48px   laptop and up, where there is width to spend
 *
 * The workspace's own grey gutter (`DashboardLayout`'s padding on `main`) sits
 * outside this and is deliberately much smaller — it is the sheet's margin on
 * the desk, not the text margin on the sheet.
 */
export const DASHBOARD_GUTTER = 'px-5 sm:px-7 lg:px-10 xl:px-12'

/**
 * The vertical rhythm a scrolling page body uses. Paired with the gutter above
 * so a page never sets one and forgets the other.
 */
export const DASHBOARD_BODY_PADDING = 'py-6 sm:py-8 lg:py-10 xl:py-12'
