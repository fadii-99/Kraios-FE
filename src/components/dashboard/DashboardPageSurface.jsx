import { cn } from '@/lib/cn'
import DashboardBlueprintField from '@/components/ui/DashboardBlueprintField'

/**
 * DashboardPageSurface — The single reusable white canvas & background
 * across all KRAIOS dashboard pages and subpages.
 *
 * Provides:
 * - Clean white drafting sheet surface (`bg-white`)
 * - Outer hairline border, --radius-lg corners and subtle elevation shadow
 * - Pure, subtle About Us-style square/grid geometry
 * - Full-height viewport containment and responsive layout flow
 */
export default function DashboardPageSurface({
  children,
  className,
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={cn(
        'relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-[var(--tone-line)] bg-white shadow-[0_1px_4px_rgba(7,20,38,0.03)]',
        className,
      )}
      {...rest}
    >
      {/* ─── Layer 0: Pure About Us Square/Grid Background ─── */}
      <DashboardBlueprintField />

      {/* ─── Dynamic Page Content Layer ─── */}
      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </Tag>
  )
}
