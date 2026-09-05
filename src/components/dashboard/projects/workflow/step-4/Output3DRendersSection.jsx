import { useState } from 'react'

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
 *
 * The shell is deliberately identical to `Output2DPlansSection`: the two sit
 * side by side in the "All" tab as equal deliverables, and this one used to be
 * a bare section against the 2D panel's white card — which read as the 3D
 * renders being an afterthought rather than the other half of the row. Card,
 * header sizes, grid gaps and button metrics are shared between the two, so
 * any change to one has to be made to the other.
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
  const [archiving, setArchiving] = useState(false)

  const approvedName = render3DSource?.assetName || 'approved-3d-model.png'
  const approvedImageUrl = render3DSource?.imageUrl || null
  // The real approval date, not the hardcoded "May 24, 2026" that used to sit
  // under every approved card whatever the project's history.
  const approvedAt = render3DSource?.at ? formatProjectDate(render3DSource.at) : null

  // The approved render has its own card above; this is everything else.
  const otherVersions = versions.filter((version) => version.id !== render3DSource?.id)

  const hasRenders = Boolean(render3DSource) || otherVersions.length > 0

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

  // Scoped to THREE_D, and labelled as such. The button used to sit outside any
  // card reading only "Download All (ZIP)", which left it ambiguous whether it
  // packaged the 3D renders or the whole project.
  const handleDownloadAll = async () => {
    if (archiving) return

    setArchiving(true)
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
    } finally {
      setArchiving(false)
    }
  }

  return (
    <section className="flex flex-col justify-between rounded-lg border border-[var(--tone-line-strong)] bg-white p-4 sm:p-5 shadow-2xs h-full">
      <div>
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xs bg-blue-100 text-[var(--color-brand-deep)] shadow-2xs">
              <Cube size={15} weight="bold" />
            </div>
            <h2
              className="truncate font-display text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              3D Renders
            </h2>
          </div>

          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={archiving || !hasRenders}
            title="Download every 3D render in this project as a ZIP"
            className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm border border-[var(--color-brand-deep)] bg-blue-50/70 px-2.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-brand-deep)] shadow-2xs transition-colors hover:bg-blue-100/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadSimple size={13} weight="bold" className="shrink-0" />
            <span>{archiving ? 'Preparing…' : 'Download All (ZIP)'}</span>
          </button>
        </div>

        {/* Nothing approved and nothing generated is a real state for a project
            that has not reached this stage — said plainly rather than shown as an
            empty grid. */}
        {!hasRenders && (
          <div className="rounded-md border border-dashed border-[var(--tone-line-strong)] bg-slate-50/60 p-6 text-center">
            <h3
              className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No 3D Renders Yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
              Generate and approve a 3D design in the 3D Rendering stage to see it here.
            </p>
          </div>
        )}

        {/* ── Cards Grid ── */}
        <div className={`grid gap-3.5 sm:gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
          {/* Card 1: the APPROVED render */}
          {render3DSource && (
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[var(--color-brand-deep)]/60 bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:shadow-md">
            {/* Top Approved Tag */}
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
