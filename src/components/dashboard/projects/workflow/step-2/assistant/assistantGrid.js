/**
 * The Design Assistant's content grid, declared once.
 *
 * All three zones — header, conversation, composer — sit on the SAME centred
 * measure and the same gutters. That is the whole reason this module exists:
 * with each zone choosing its own padding, the back action, the transcript and
 * the prompt field each started at a different x, and a workspace whose
 * elements do not share a left edge reads as scattered no matter how well any
 * one of them is drawn.
 *
 * 64rem (1024px) is the measure. Below it the grid simply fills the workspace;
 * above it — the sidebar leaves ~1590px at 1920 — it stops the transcript from
 * running into a banner and keeps a comfortable line length for prose.
 */
export const ASSISTANT_GRID = 'mx-auto w-full max-w-[64rem]'

/**
 * The workspace gutters — the dashboard's shared scale, not a third one.
 * Applied to the zone rather than the grid, so the header and composer
 * hairlines still run the full width of the sheet.
 */
export { DASHBOARD_GUTTER as ASSISTANT_GUTTER } from '@/lib/dashboard/layout'
