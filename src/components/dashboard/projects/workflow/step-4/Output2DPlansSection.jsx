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
}) {
  const approvedName = plan2DSource?.name || 'approved-floor-plan.png'
  const approvedImageUrl = plan2DSource?.previewUrl || plan2DSource?.imageUrl || null
  // The real approval date, not a hardcoded one.
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
    <section className="flex flex-col justify-between rounded-lg border border-[var(--tone-line-strong)] bg-white p-5 sm:p-6 lg:p-7 shadow-2xs h-full">
      <div>
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-blue-100 text-[var(--color-brand-deep)] shadow-2xs">
              <Blueprint size={16} weight="bold" />
            </div>
            <h2
              className="font-display text-[0.875rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              2D Floor Plans
            </h2>
          </div>
        </div>

        {/* A project that has not completed Step 1 has no plan to show. */}
        {!plan2DSource && otherVersions.length === 0 && (
          <div className="rounded-md border border-dashed border-[var(--tone-line-strong)] bg-slate-50/60 p-8 text-center">
            <h3
              className="text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No 2D Floor Plans Yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
              Upload or generate a floor plan in the Upload stage to see it here.
            </p>
          </div>
        )}

        {/* ── Cards Grid (2 Columns Layout) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Card 1: the APPROVED plan — rendered only when there is one. */}
          {plan2DSource && (
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[var(--color-brand-deep)]/60 bg-white p-4 sm:p-4.5 shadow-2xs transition-all hover:shadow-md">
            {/* Top Tag */}
            <div className="mb-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                APPROVED LATEST
              </span>
            </div>

            {/* Image Viewport */}
            <div
              onClick={() => handlePreview({ imageUrl: approvedImageUrl, name: approvedName })}
              className="relative flex h-40 sm:h-44 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-slate-50 p-3.5"
            >
              <img
                src={approvedImageUrl}
                alt={approvedName}
                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            {/* Details */}
            <div className="mt-3.5">
              <h3 className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)]" title={approvedName}>
                {approvedName}
              </h3>
              <p className="text-[0.625rem] font-medium text-slate-400 mt-0.5">
                {approvedAt ? `Approved ${approvedAt}` : 'Approved'}
              </p>

              {/* Action Buttons Row */}
              <div className="mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePreview({ imageUrl: approvedImageUrl, name: approvedName })}
                  className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <Eye size={13} weight="bold" className="shrink-0" />
                  <span className="truncate">Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload({ imageUrl: approvedImageUrl, name: approvedName })}
                  className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1.5 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
                >
                  <DownloadSimple size={13} weight="bold" className="shrink-0" />
                  <span className="truncate">Download</span>
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Card 2: Previous 2D Version */}
          {otherVersions.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-[var(--tone-line-strong)] bg-white p-4 sm:p-4.5 shadow-2xs transition-all hover:shadow-md"
            >
              <div className="h-6" />

              {/* Image Viewport */}
              <div
                onClick={() => handlePreview(item)}
                className="relative flex h-40 sm:h-44 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-slate-50 p-3.5"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>

              {/* Details */}
              <div className="mt-3.5">
                <h3 className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)]" title={item.name}>
                  {item.name}
                </h3>
                <p className="text-[0.625rem] font-medium text-slate-400 mt-0.5">
                  {formatProjectDate(item.at)}
                </p>

                {/* Action Buttons Row */}
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreview(item)}
                    className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Eye size={13} weight="bold" className="shrink-0" />
                    <span className="truncate">Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1.5 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
                  >
                    <DownloadSimple size={13} weight="bold" className="shrink-0" />
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
