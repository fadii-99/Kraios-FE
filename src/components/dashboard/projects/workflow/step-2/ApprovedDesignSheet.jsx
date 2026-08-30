import { Link } from 'react-router-dom'

import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import SheetTitleBlock from '@/components/dashboard/projects/workflow/step-2/SheetTitleBlock'
import PrimaryButton from '@/components/ui/PrimaryButton'
import {
  RENDERING_COPY,
  renderStyleById,
  viewAngleById,
} from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * Step 2 once a design is signed off — the SAME sheet, resolved.
 *
 * The gateway's top band held a mark, a name and an action; this holds the
 * render, its settings and the way back in. The title block underneath is
 * literally the same component, so the two states share one datum and the page
 * reads as one object changing rather than two layouts swapping.
 *
 * A preview, not a viewer: it confirms WHICH design was approved and under
 * which settings, and hands inspection back to the assistant. `object-contain`
 * on a light ground, because a cropped model is a different model.
 *
 * The CTA drops to the outline variant here. The work is done; returning to
 * refine it is a secondary path, and the page's onward route is the shared
 * bottom navigation — never a second Next button in the body.
 */
export default function ApprovedDesignSheet({
  projectId,
  source,
  result,
  to,
  className,
}) {
  const style = renderStyleById(result.renderStyleId)
  const angle = viewAngleById(result.viewAngleId)
  const angleLabel = angle?.label || 'Isometric 45°'
  const styleLabel = style?.label || 'SketchUp'

  const meta = [
    { term: 'Render Style', value: styleLabel },
    { term: 'View Angle', value: angleLabel },
  ]

  return (
    <FloorPlanWorkArea className={cn('w-full', className)}>
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:gap-6 sm:px-7 sm:py-6">
        <div className="aspect-4/3 w-full shrink-0 overflow-hidden rounded-sm border border-[var(--tone-line)] bg-white sm:w-60 lg:w-68">
          <img
            src={result.imageUrl}
            alt={`Approved 3D floor model — ${angleLabel}, ${styleLabel}`}
            loading="eager"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-px w-5 bg-[var(--color-brand-deep)]" />
            <p className="label-ui text-[var(--color-brand-deep)]">Approved Design</p>
          </div>

          {/* Hairline-separated rows — the project card's status treatment,
              never nested boxes or badges. */}
          <dl className="mt-4">
            {meta.map(({ term, value }) => (
              <div
                key={term}
                className="flex items-center justify-between gap-4 border-t border-[var(--tone-line)] py-2.5"
              >
                <dt className="label-ui text-[0.5625rem] text-[var(--tone-muted-dark)]">
                  {term}
                </dt>
                <dd className="truncate text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* `mt-auto` puts the CTA on the foot of the preview's own box, so
              the two columns close on one line at every width above `sm`. */}
          <PrimaryButton
            as={Link}
            to={to}
            variant="outline"
            size="compact"
            align="center"
            withArrow={false}
            className="mt-5 w-full justify-center sm:mt-auto"
          >
            {RENDERING_COPY.assistantCta}
          </PrimaryButton>
        </div>
      </div>

      <SheetTitleBlock projectId={projectId} source={source} approved />
    </FloorPlanWorkArea>
  )
}
