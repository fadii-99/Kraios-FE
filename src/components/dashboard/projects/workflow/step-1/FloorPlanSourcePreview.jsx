import {
  ArrowsClockwise,
  FilePdf,
  ImageSquare,
  Sparkle,
  X,
} from '@phosphor-icons/react'
import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import {
  FLOOR_PLAN_SOURCE_TYPES,
  formatFileSize,
} from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { cn } from '@/lib/cn'

/**
 * The active floor-plan source preview.
 *
 * Displays the uploaded floor-plan image or PDF document filling the entire
 * right-side work area, featuring top-right remove action.
 */
export default function FloorPlanSourcePreview({
  source,
  onRemove,
  onRegenerate,
  className,
}) {
  const isGenerated = source.type === FLOOR_PLAN_SOURCE_TYPES.generated
  const isImage = source.kind === 'image' && Boolean(source.previewUrl)
  const plateIcon = isGenerated ? Sparkle : isImage ? ImageSquare : FilePdf

  return (
    <FloorPlanWorkArea
      className={cn(
        'relative flex w-full h-[430px] sm:h-[445px] lg:h-[455px] flex-1 flex-col overflow-hidden p-0',
        className,
      )}
      data-preview-reveal
    >
      {/* ─── Top-Right Floating Quick Action Buttons ─── */}
      <div className="absolute right-3.5 top-3.5 z-30 flex items-center gap-2">
        {/* Red Cross Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove uploaded floor plan"
          title="Remove floor plan"
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-red-200 bg-red-50/95 text-red-600 shadow-xs backdrop-blur-xs transition-all duration-200',
            'hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-sm',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600',
          )}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      {/* ─── Main Preview Canvas (Whole Div with Embedded Gradient Overlay) ─── */}
      <div className="relative flex min-h-[300px] sm:min-h-[340px] flex-1 items-center justify-center bg-slate-900/95 overflow-hidden">
        {isImage ? (
          <div className="group/img relative flex h-full w-full items-center justify-center">
            <img
              src={source.previewUrl}
              alt={
                isGenerated
                  ? 'Generated 2D floor plan'
                  : `Uploaded 2D floor plan — ${source.name}`
              }
              className="max-h-[350px] w-full object-contain drop-shadow-xs"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-white">
            <TechnicalIconFrame
              icon={FilePdf}
              size={64}
              iconSize={30}
              interactive={false}
              className="border-white/20 bg-white/10 text-white"
            />
            <p className="mt-3 font-display text-[0.9375rem] font-bold text-white">
              {source.name}
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.8125rem] text-white/70">
              PDF architectural document is attached and ready.
            </p>
          </div>
        )}

        {/* ─── Bottom Meta Info Smooth Gradient Overlay ─── */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4.5 pb-3.5 pt-12 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <TechnicalIconFrame
              icon={plateIcon}
              size={32}
              iconSize={16}
              interactive={false}
              className="border-white/20 bg-white/15 text-white shadow-xs backdrop-blur-xs"
            />
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-bold text-white drop-shadow-xs sm:text-[0.875rem]" title={source.name}>
                {source.name}
              </p>
              <p className="text-[0.6875rem] font-medium text-white/75">
                {source.extension ? source.extension.toUpperCase() : 'PLAN'} • {formatFileSize(source.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-white/25 bg-white/15 px-3 text-[0.6875rem] font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/25"
              >
                <ArrowsClockwise size={13} weight="bold" aria-hidden="true" />
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>
    </FloorPlanWorkArea>
  )
}
