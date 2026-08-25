import { Blueprint, CheckCircle, Cube, DownloadSimple, Eye, FilePdf, ImageSquare, Sparkle } from '@phosphor-icons/react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * Deliverable Plan / 3D Model Presentation Card.
 *
 * Provides a rich architectural drawing viewport with drafting grid,
 * corner registration marks, scale badges, and View/Download actions.
 */
export default function OutputPlanCard({
  title,
  badgeText,
  isApproved = false,
  source,
  fallbackImageUrl,
  fallbackName,
  fallbackExtension = 'SVG',
  onView,
  onDownload,
  className,
}) {
  const imageUrl = source?.previewUrl || source?.imageUrl || fallbackImageUrl
  const isImage = Boolean(imageUrl)
  const isPdf = source?.kind === 'pdf' || source?.extension?.toLowerCase() === 'pdf'
  const displayName = source?.name || fallbackName || title
  const displayExt = (source?.extension || fallbackExtension || (isImage ? 'IMG' : 'PDF')).toUpperCase()
  const Icon = isApproved ? Cube : Blueprint

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border bg-white shadow-2xs transition-all duration-300',
        isApproved
          ? 'border-emerald-500/40 hover:border-emerald-500/70 hover:shadow-xs'
          : 'border-[var(--tone-line-strong)] hover:border-[var(--color-brand-deep)]/50 hover:shadow-xs',
        className,
      )}
    >
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--tone-line)] bg-slate-50/80 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-xs shadow-2xs',
              isApproved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-[var(--color-brand-deep)]',
            )}
          >
            <Icon size={14} weight="bold" />
          </div>

          <span
            className="font-display text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </span>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider',
            isApproved
              ? 'border-emerald-500/35 bg-emerald-50 text-emerald-800'
              : 'border-[var(--color-brand-deep)]/25 bg-[var(--color-brand-deep)]/[0.06] text-[var(--color-brand-deep)]',
          )}
        >
          {isApproved && <CheckCircle size={12} weight="fill" className="text-emerald-600 shrink-0" />}
          <span>{badgeText}</span>
        </div>
      </div>

      {/* ── Clean Minimal Viewport Stage (Strictly object-contain) ── */}
      <div className="relative flex h-64 sm:h-72 items-center justify-center overflow-hidden bg-slate-50/70 p-4 sm:p-6 border-b border-[var(--tone-line)]">
        {/* Minimal Corner Crosshair Registration Marks */}
        <div aria-hidden="true" className="pointer-events-none absolute left-3 top-3 select-none font-mono text-[0.625rem] text-slate-300">
          +
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-3 top-3 select-none font-mono text-[0.625rem] text-slate-300">
          +
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 select-none font-mono text-[0.625rem] text-slate-300">
          +
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-3 bottom-3 select-none font-mono text-[0.625rem] text-slate-300">
          +
        </div>

        {/* Viewport Scale Indicator */}
        <div className="pointer-events-none absolute bottom-2.5 left-3.5 rounded-xs border border-slate-200 bg-white/90 px-2 py-0.5 font-mono text-[0.5625rem] font-semibold text-slate-500 shadow-2xs">
          {isApproved ? 'PERSPECTIVE 3D RENDER' : '1:100 SCALE ARCHITECTURAL DRAFT'}
        </div>


        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="relative z-10 h-full w-full object-contain filter drop-shadow-xs transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : isPdf ? (
          <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 text-center text-slate-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-slate-200 bg-white text-red-500 shadow-2xs">
              <FilePdf size={28} weight="fill" />
            </div>
            <p className="max-w-xs text-[0.75rem] font-medium text-slate-600 truncate">{displayName}</p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-center text-slate-400">
            <ImageSquare size={32} weight="light" />
            <span className="text-[0.75rem] font-medium">No Preview Available</span>
          </div>
        )}
      </div>

      {/* ── Metadata & Action Controls ── */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
        {/* File Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[0.8125rem] font-bold text-[var(--tone-ink)]" title={displayName}>
              {displayName}
            </p>
            <span className="rounded-xs border border-slate-200 bg-slate-100/90 px-1.5 py-0.2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-700">
              {displayExt}
            </span>
          </div>
          <p className="mt-0.5 text-[0.6875rem] text-[var(--tone-muted-dark)]">
            {isApproved ? 'Approved Architectural Deliverable' : 'Project Baseline Document'}
          </p>
        </div>

        {/* Action Buttons: VIEW & DOWNLOAD */}
        <div className="flex shrink-0 items-center gap-2">
          <PrimaryButton
            type="button"
            onClick={onView}
            variant="outline"
            size="xs"
            align="center"
            withArrow={false}
            className="whitespace-nowrap shadow-2xs"
          >
            <span className="flex items-center justify-center gap-1.5">
              <Eye size={14} weight="bold" />
              <span>View</span>
            </span>
          </PrimaryButton>

          <PrimaryButton
            type="button"
            onClick={onDownload}
            variant="outline"
            size="xs"
            align="center"
            withArrow={false}
            className="whitespace-nowrap shadow-2xs"
          >
            <span className="flex items-center justify-center gap-1.5">
              <DownloadSimple size={14} weight="bold" />
              <span>Download</span>
            </span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
