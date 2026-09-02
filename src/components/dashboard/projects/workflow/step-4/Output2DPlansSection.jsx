import {
  Blueprint,
  CheckCircle,
  DownloadSimple,
  Eye,
} from '@phosphor-icons/react'

import { downloadAssetUrl } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { formatProjectDate } from '@/lib/date'
import { showErrorToast } from '@/lib/toast'

/**
 * Output2DPlansSection — the project's 2D architectural floor plans.
 *
 * The version list is the project's real `FloorPlanVersion` history rather than
 * the single hardcoded "Floor_Plan_v1, May 18 2026" card it used to show.
 */
export default function Output2DPlansSection({
  plan2DSource,
  versions = [],
  onViewSource,
  compact = false,
  onViewAll,
}) {
  const approvedName = plan2DSource?.name || 'approved-floor-plan.png'
  const approvedImageUrl = plan2DSource?.previewUrl || plan2DSource?.imageUrl || null
  const approvedAt = plan2DSource?.addedAt ? formatProjectDate(plan2DSource.addedAt) : null

  const otherVersions = versions.filter((version) => version.id !== plan2DSource?.versionId)

  const handlePreview = (item) => {
    onViewSource?.({
      previewUrl: item.imageUrl,
      imageUrl: item.imageUrl,
      name: item.name,
      extension: (item.name?.split('.').pop() || 'PNG').toUpperCase(),
    })
  }

  const handleDownload = async (item) => {
    const saved = await downloadAssetUrl(item.imageUrl, item.name)
    if (!saved) {
      showErrorToast('That floor plan could not be downloaded.', { id: 'plan-download-failed' })
    }
  }

  return (
    <section className="flex flex-col justify-between rounded-lg border border-[var(--tone-line-strong)] bg-white p-4 sm:p-5 shadow-2xs h-full">
      <div>
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-xs bg-blue-100 text-[var(--color-brand-deep)] shadow-2xs">
              <Blueprint size={15} weight="bold" />
            </div>
            <h2
              className="font-display text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              2D Floor Plans
            </h2>
          </div>
        </div>

        {!plan2DSource && otherVersions.length === 0 && (
          <div className="rounded-md border border-dashed border-[var(--tone-line-strong)] bg-slate-50/60 p-6 text-center">
            <h3
              className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No 2D Floor Plans Yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
              Upload or generate a floor plan in the Upload stage to see it here.
            </p>
          </div>
        )}

        {/* ── Cards Grid ── */}
        <div className={`grid gap-3.5 sm:gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
          {plan2DSource && (
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[var(--color-brand-deep)]/60 bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:shadow-md">
            {/* Top Tag */}
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-xs bg-emerald-500/10 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle size={11} weight="fill" className="text-emerald-600" />
                APPROVED LATEST
              </span>
            </div>

            {/* Image Viewport */}
            <div
              onClick={() => handlePreview({ imageUrl: approvedImageUrl, name: approvedName })}
              className="relative flex h-32 sm:h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-slate-50 p-2.5"
            >
              <img
                src={approvedImageUrl}
                alt={approvedName}
                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            {/* Details */}
            <div className="mt-2.5">
              <h3 className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)]" title={approvedName}>
                {approvedName}
              </h3>
              <p className="text-[0.625rem] font-medium text-slate-400 mt-0.5">
                {approvedAt ? `Approved ${approvedAt}` : 'Approved'}
              </p>

              {/* Action Buttons Row */}
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePreview({ imageUrl: approvedImageUrl, name: approvedName })}
                  className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <Eye size={12} weight="bold" className="shrink-0" />
                  <span className="truncate">Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload({ imageUrl: approvedImageUrl, name: approvedName })}
                  className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
                >
                  <DownloadSimple size={12} weight="bold" className="shrink-0" />
                  <span className="truncate">Download</span>
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Compact Mode: Show "+ X More (View All)" card if there are extra versions */}
          {compact && otherVersions.length > 0 && (
            <button
              type="button"
              onClick={onViewAll}
              className="group flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition-all hover:border-[var(--color-brand-deep)] hover:bg-blue-50/50 hover:shadow-xs cursor-pointer min-h-[220px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-brand-deep)] shadow-2xs group-hover:scale-110 transition-transform">
                <Blueprint size={20} weight="bold" />
              </div>
              <span className="mt-3 text-[0.8125rem] font-bold text-[var(--tone-ink)] group-hover:text-[var(--color-brand-deep)]">
                +{otherVersions.length} More Plan{otherVersions.length > 1 ? 's' : ''}
              </span>
              <span className="mt-1 text-[0.6875rem] text-slate-500 font-medium">
                Click to View All Versions
              </span>
            </button>
          )}

          {/* Non-compact Mode: Render all other versions */}
          {!compact && otherVersions.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-[var(--tone-line-strong)] bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:shadow-md"
            >
              <div className="h-4" />

              <div
                onClick={() => handlePreview(item)}
                className="relative flex h-32 sm:h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-slate-50 p-2.5"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>

              <div className="mt-3.5">
                <h3 className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)]" title={item.name}>
                  {item.name}
                </h3>
                <p className="text-[0.625rem] font-medium text-slate-400 mt-0.5">
                  {formatProjectDate(item.at)}
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreview(item)}
                    className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Eye size={12} weight="bold" className="shrink-0" />
                    <span className="truncate">Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
                  >
                    <DownloadSimple size={12} weight="bold" className="shrink-0" />
                    <span className="truncate">Download</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
