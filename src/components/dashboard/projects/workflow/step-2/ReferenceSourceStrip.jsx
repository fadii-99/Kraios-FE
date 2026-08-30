import { Link } from 'react-router-dom'
import { ArrowRight, FilePdf, Image as ImageIcon, Sparkle, Warning } from '@phosphor-icons/react'

import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import {
  FLOOR_PLAN_SOURCE_TYPES,
  formatFileSize,
} from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { RENDERING_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { cn } from '@/lib/cn'

/**
 * The Step 1 source, as one cell of the gateway's title block.
 *
 * A drawing sheet names what it was set out from in its title block, not on a
 * panel of its own — which is exactly the right weight for this. The reference
 * plan is context for the gateway, so it gets a thumbnail and two lines inside
 * the sheet it belongs to. It used to be a half-height card in a second column,
 * and that column is what made Step 2 read as a dashboard of widgets.
 *
 * Reads the same derived Step 1 source the upload stage shows, so an uploaded file,
 * a generated plan and no plan at all are each shown honestly.
 */
export default function ReferenceSourceStrip({ projectId, source, className }) {
  if (!source) return <MissingSource projectId={projectId} className={className} />

  const isGenerated = source.type === FLOOR_PLAN_SOURCE_TYPES.generated
  const isImage = source.kind === 'image' && Boolean(source.previewUrl)
  const plateIcon = isGenerated ? Sparkle : source.kind === 'pdf' ? FilePdf : ImageIcon

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {/* `object-contain` on a light ground — a plan cropped to a thumbnail is
          an abstract texture, not a drawing. */}
      <div className="relative flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xs border border-[var(--tone-line)] bg-white">
        {isImage ? (
          <img
            src={source.previewUrl}
            alt={
              isGenerated
                ? 'Generated 2D floor plan used as the 3D source'
                : `Uploaded 2D floor plan — ${source.name}`
            }
            loading="eager"
            className="h-full w-full object-contain"
          />
        ) : (
          <TechnicalIconFrame icon={plateIcon} size={30} iconSize={15} />
        )}
      </div>

      <div className="min-w-0">
        <p className="label-ui flex items-center gap-1.5 text-[0.5625rem] text-[var(--color-brand-deep)]">
          <span>{RENDERING_COPY.referenceTitle}</span>
          <span aria-hidden="true" className="h-px w-3 bg-[var(--color-brand-deep)]/40" />
          <span className="text-[var(--tone-muted-dark)]">
            {RENDERING_COPY.referenceReady}
          </span>
        </p>

        <p
          className="mt-1 truncate text-[0.75rem] font-semibold text-[var(--tone-ink)] tabular-nums"
          title={source.name}
        >
          {source.name}
          <span className="font-normal text-[var(--tone-muted-dark)]">
            {' · '}
            {(source.extension || 'PLAN').toUpperCase()}
            {source.size ? ` · ${formatFileSize(source.size)}` : ''}
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * No Step 1 plan yet — stated inline, with the one action that fixes it.
 *
 * Deliberately the same two-line cell, not a large empty error panel: nothing
 * here has failed, the previous stage simply has not been done.
 */
function MissingSource({ projectId, className }) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xs border border-[var(--tone-line)] bg-white text-[var(--tone-muted-dark)]"
        >
          <Warning size={17} weight="regular" />
        </span>

        <div className="min-w-0">
          <p className="label-ui text-[0.5625rem] text-[var(--tone-muted-dark)]">
            {RENDERING_COPY.referenceTitle}
          </p>
          <p className="mt-1 max-w-[38ch] text-[0.75rem] leading-snug text-[var(--tone-muted-dark)]">
            {RENDERING_COPY.referenceMissing}
          </p>
        </div>
      </div>

      <Link
        to={projectStagePath(projectId, 'upload')}
        className={cn(
          'group label-ui inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-3 text-[0.5625rem] touch:min-h-11',
          'border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)]',
          'transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
        )}
      >
        <span>{RENDERING_COPY.referenceMissingCta}</span>
        <ArrowRight
          size={12}
          weight="bold"
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </div>
  )
}
