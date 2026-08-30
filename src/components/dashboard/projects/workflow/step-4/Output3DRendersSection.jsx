import {
  CheckCircle,
  Cube,
  DownloadSimple,
  Eye,
} from '@phosphor-icons/react'

import { DEMO_ASSETS } from '@/lib/dashboard/workflow/step-4/outputConfig'
import { downloadAssetUrl } from '@/lib/dashboard/workflow/step-4/outputDownloads'

/**
 * Sample 3D render versions list for display demonstration,
 * augmenting the active approved render from Step 2.
 */
const DEFAULT_3D_VERSIONS = [
  {
    id: 'render-v8',
    name: '3D_Model_v8',
    date: 'May 20, 2026',
    imageUrl: '/assets/plan-3d-light.svg',
    isApproved: false,
  },
  {
    id: 'render-v7',
    name: '3D_Model_v7',
    date: 'May 18, 2026',
    imageUrl: '/assets/plan-3d-light.svg',
    isApproved: false,
  },
  {
    id: 'render-v6',
    name: '3D_Model_v6',
    date: 'May 15, 2026',
    imageUrl: '/assets/plan-3d-light.svg',
    isApproved: false,
  },
]

/**
 * Output3DRendersSection — Displays approved 3D model with historical renders gallery.
 */
export default function Output3DRendersSection({
  render3DSource,
  onViewSource,
}) {
  const approvedName = render3DSource?.title || 'Approved_3D_Model_v9'
  const approvedImageUrl = render3DSource?.imageUrl || DEMO_ASSETS.render3DUrl

  const handlePreview = (item) => {
    onViewSource?.({
      previewUrl: item.imageUrl,
      imageUrl: item.imageUrl,
      name: item.name,
      extension: 'SVG',
    })
  }

  const handleDownload = async (item) => {
    await downloadAssetUrl(item.imageUrl, `${item.name}.svg`)
  }

  const handleDownloadAll = async () => {
    await downloadAssetUrl(approvedImageUrl, `${approvedName}.svg`)
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

      {/* ── Cards Grid (4 Columns Layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Approved Latest Render */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[var(--color-brand-deep)]/60 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:shadow-md">
          {/* Top Approved Tag */}
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-500/10 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700">
              <CheckCircle size={13} weight="fill" className="text-emerald-600" />
              APPROVED LATEST
            </span>
          </div>

          {/* Image Viewport */}
          <div
            onClick={() => handlePreview({ imageUrl: approvedImageUrl, name: approvedName })}
            className="relative flex h-44 sm:h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-slate-50 p-4"
          >
            <img
              src={approvedImageUrl}
              alt={approvedName}
              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          {/* Details */}
          <div className="mt-4">
            <h3 className="truncate text-[0.8125rem] font-bold text-[var(--tone-ink)]" title={approvedName}>
              {approvedName}
            </h3>
            <p className="text-[0.6875rem] font-medium text-slate-400 mt-1">
              Approved on May 24, 2026
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

        {/* Cards 2, 3, 4: Historical Renders */}
        {DEFAULT_3D_VERSIONS.map((item) => (
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
                {item.date}
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
    </section>
  )
}
