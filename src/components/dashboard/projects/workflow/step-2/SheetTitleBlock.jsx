import ApprovalStatus from '@/components/dashboard/projects/workflow/step-2/ApprovalStatus'
import ReferenceSourceStrip from '@/components/dashboard/projects/workflow/step-2/ReferenceSourceStrip'
import { cn } from '@/lib/cn'

/**
 * The foot of the Step 2 sheet — a drawing's title block.
 *
 * On a real sheet this band carries what the drawing was set out from and
 * whether it has been signed off, and that is precisely Step 2's remaining
 * content: the reference plan, and the approval stamp. Giving each of them a
 * panel of its own is what turned this stage into a widget board.
 *
 * BOTH stage states render this same band, which is what makes the pending
 * gateway and the approved sheet read as one object changing rather than two
 * layouts. The tone change to `--color-light` is the separator, the way a
 * drafting sheet divides its title block from the drawing — not a second frame.
 */
export default function SheetTitleBlock({ projectId, source, approved, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-6 gap-y-3',
        // rounded-b-md: the block closes the work-area sheet, so it has to
        // carry the sheet's own bottom corners rather than square them off.
        'rounded-b-md border-t border-[var(--tone-line)] bg-[var(--color-light)] px-5 py-3 sm:px-7 sm:py-3.5',
        className,
      )}
    >
      <ReferenceSourceStrip projectId={projectId} source={source} className="flex-1" />
      <ApprovalStatus approved={approved} />
    </div>
  )
}
