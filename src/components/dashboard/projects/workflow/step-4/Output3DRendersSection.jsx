import {
  CheckCircle,
  Cube,
  DownloadSimple,
  Eye,
} from '@phosphor-icons/react'

import { downloadAssetUrl, downloadProjectArchive } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { formatProjectDate } from '@/lib/date'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Output3DRendersSection — the approved 3D model, and the project's other
 * renders.
 *
 * The gallery used to be three hardcoded cards — 3D_Model_v6/v7/v8, dated May
 * 2026, all pointing at the same local SVG — shown whatever the project
 * actually contained. It lists the project's real `ThreeDVersion` history now,
 * and a project with only one render shows one.
 */
export default function Output3DRendersSection({
  projectId,
  projectName,
  render3DSource,
  versions = [],
  onViewSource,
  compact = false,
  onViewAll,
}) {
  const approvedName = render3DSource?.assetName || 'approved-3d-model.png'
  const approvedImageUrl = render3DSource?.imageUrl || null
  // The real approval date, not the hardcoded "May 24, 2026" that used to sit
  // under every approved card whatever the project's history.
  const approvedAt = render3DSource?.at ? formatProjectDate(render3DSource.at) : null

  // The approved render has its own card above; this is everything else.
  const otherVersions = versions.filter((version) => version.id !== render3DSource?.id)

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
      showErrorToast('That render could not be downloaded.', { id: 'render-download-failed' })
    }
  }

  const handleDownloadAll = async () => {
    try {
      const saved = await downloadProjectArchive({
        projectId,
        projectName,
        scope: 'THREE_D',
      })

      if (saved) showSuccessToast('3D renders downloaded.', { id: 'archive-THREE_D' })
      else showErrorToast('There are no 3D renders to download yet.', { id: 'archive-empty-3d' })
    } catch (thrown) {
      showErrorToast(thrown?.message || 'That download could not be prepared.', {
        id: 'archive-failed-3d',
      })
    }
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-blue-100 text-[var(--color-brand-deep)] shadow-2xs">
            <Cube size={16} weight="bold" />
          </div>
          <h2
            className="font-display text-[0.875rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            3D Renders
          </h2>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download All Button */}
          <button
            type="button"
            onClick={handleDownloadAll}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-[var(--color-brand-deep)] bg-blue-50/70 px-3 text-[0.75rem] font-bold uppercase tracking-wider text-[var(--color-brand-deep)] shadow-2xs transition-colors hover:bg-blue-100/70"
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Download All (ZIP)</span>
          </button>
        </div>
      </div>

      {/* Nothing approved and nothing generated is a real state for a project
          that has not reached this stage — said plainly rather than shown as an
          empty grid. */}
      {!render3DSource && otherVersions.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--tone-line-strong)] bg-white p-8 text-center">
          <h3
            className="text-[0.875rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            No 3D Renders Yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
            Generate and approve a 3D design in the 3D Rendering stage to see it here.
          </p>
        </div>
      )}

      {/* ── Cards Grid ── */}
      <div className={`grid gap-4 sm:gap-5 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {/* Card 1: the APPROVED render */}
        {render3DSource && (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[var(--color-brand-deep)]/60 bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:shadow-md">
          {/* Top Approved Tag */}
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-500/10 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-700">
              <CheckCircle size={12} weight="fill" className="text-emerald-600" />
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
                className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Eye size={12} weight="bold" className="shrink-0" />
                <span className="truncate">Preview</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload({ imageUrl: approvedImageUrl, name: approvedName })}
                className="min-w-0 flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
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
              <Cube size={20} weight="bold" />
            </div>
            <span className="mt-3 text-[0.8125rem] font-bold text-[var(--tone-ink)] group-hover:text-[var(--color-brand-deep)]">
              +{otherVersions.length} More Render{otherVersions.length > 1 ? 's' : ''}
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
    </section>
  )
}
