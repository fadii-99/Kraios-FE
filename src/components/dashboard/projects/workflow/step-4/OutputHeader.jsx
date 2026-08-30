import { useState } from 'react'
import {
  Blueprint,
  Calculator,
  CheckCircle,
  ClockClockwise,
  Cube,
  DownloadSimple,
  FileCode,
  FileText,
  Package,
} from '@phosphor-icons/react'

import {
  downloadAssetUrl,
  downloadProjectPackageZip,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { DEMO_ASSETS } from '@/lib/dashboard/workflow/step-4/outputConfig'

/**
 * OutputHeader — Hero banner with Project Deliverables summary chips on the left
 * and Quick Downloads command center on the right.
 */
export default function OutputHeader({
  projectName,
  plan2DSource,
  render3DSource,
  boqRows = [],
  uploadedDocs = [],
  renderCount = 18,
  planCount = 2,
}) {
  const [downloadingZip, setDownloadingZip] = useState(false)

  const handleDownloadAllZip = async () => {
    try {
      setDownloadingZip(true)
      await downloadProjectPackageZip({
        projectName,
        plan2DSource,
        render3DSource,
        boqRows,
        uploadedDocs,
      })
    } finally {
      setDownloadingZip(false)
    }
  }

  const handleDownloadLatest3D = async () => {
    const url = render3DSource?.imageUrl || DEMO_ASSETS.render3DUrl
    const name = render3DSource?.title ? `${render3DSource.title}.svg` : 'Approved-3D-Model.svg'
    await downloadAssetUrl(url, name)
  }

  const handleDownloadAll3DZip = async () => {
    // Downloads 3D package
    await handleDownloadAllZip()
  }

  const handleDownloadAll2DZip = async () => {
    const url = plan2DSource?.previewUrl || plan2DSource?.imageUrl || DEMO_ASSETS.floorPlan2DUrl
    const name = plan2DSource?.name || 'Approved-Floor-Plan.svg'
    await downloadAssetUrl(url, name)
  }

  const docCount = uploadedDocs.length || 24
  const boqCount = boqRows.length || 1

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--tone-line-strong)] bg-white p-6 shadow-xs sm:p-8 lg:p-9">
      {/* Top Setting-Out Accent Line */}
      <span
        aria-hidden="true"
        className="absolute -top-px left-0 h-1 w-64 rounded-tl-lg bg-[var(--color-brand-deep)] shadow-[0_0_14px_rgba(11,94,215,0.45)]"
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        {/* ── Left Column: Metadata, Title & Deliverables Stat Chips ── */}
        <div className="min-w-0 flex-1 space-y-4 max-w-2xl">
          {/* Eyebrow Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-xs border border-[var(--color-brand-deep)]/25 bg-[var(--color-brand-deep)]/[0.06] px-3 py-1 text-[var(--color-brand-deep)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_6px_var(--color-brand)]" />
              <span
                className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.16em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                PROJECT OUTPUT
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800">
              <CheckCircle size={13} weight="fill" className="text-emerald-600" />
              <span>DELIVERABLES READY</span>
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-[1.75rem] font-black uppercase leading-tight tracking-tight text-[var(--tone-ink)] sm:text-[2rem] lg:text-[2.25rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            YOUR PROJECT DELIVERABLES
          </h1>

          {/* Subtitle */}
          <p className="text-[0.875rem] font-normal leading-relaxed text-[var(--tone-muted-dark)] sm:text-[0.9375rem]">
            Review your approved plans, finalized BOQ and all supporting project documents. Download individual items or the complete project package.
          </p>

          {/* Deliverables Stat Badges Chips */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="inline-flex items-center gap-2 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3.5 py-1.5 text-[0.75rem] font-semibold text-slate-700 shadow-2xs">
              <Blueprint size={16} weight="bold" className="text-[var(--color-brand-deep)]" />
              <span>{planCount} Architectural Plans</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3.5 py-1.5 text-[0.75rem] font-semibold text-slate-700 shadow-2xs">
              <Cube size={16} weight="bold" className="text-[var(--color-brand-deep)]" />
              <span>{renderCount} 3D Images</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3.5 py-1.5 text-[0.75rem] font-semibold text-slate-700 shadow-2xs">
              <Calculator size={16} weight="bold" className="text-emerald-600" />
              <span>{boqCount} BOQ</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3.5 py-1.5 text-[0.75rem] font-semibold text-slate-700 shadow-2xs">
              <FileText size={16} weight="bold" className="text-amber-600" />
              <span>{docCount} Documents</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: QUICK DOWNLOADS Command Center Card ── */}
        <div className="w-full shrink-0 flex flex-col gap-4 rounded-lg border border-[var(--tone-line-strong)] bg-slate-50/80 p-5 sm:p-5.5 lg:w-[460px] xl:w-[490px] shadow-2xs">
          {/* Quick Downloads Card Header */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
            <DownloadSimple size={16} weight="bold" className="text-[var(--color-brand-deep)]" />
            <span
              className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tone-ink)] font-display"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Quick Downloads
            </span>
          </div>

          {/* Primary Main ZIP Action Button */}
          <button
            type="button"
            onClick={handleDownloadAllZip}
            disabled={downloadingZip}
            className="group flex w-full cursor-pointer items-center justify-between rounded-sm bg-[var(--btn-bg)] text-[var(--btn-ink)] px-4.5 py-3.5 shadow-[0_4px_14px_rgba(11,94,215,0.2)] transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)] hover:bg-[var(--btn-bg-hover)] active:translate-y-px select-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-white/15 text-[var(--btn-ink)] shadow-2xs">
                <Package size={22} weight="bold" />
              </div>
              <div className="text-left">
                <p className="text-[0.875rem] font-black tracking-tight uppercase leading-tight font-display">
                  Download All (ZIP)
                </p>
                <p className="text-[0.6875rem] text-blue-100 font-medium leading-tight mt-0.5">
                  Complete project package
                </p>
              </div>
            </div>

            <DownloadSimple size={20} weight="bold" className="shrink-0 text-white/90 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-y-0.5" />
          </button>

          {/* Secondary 3-Column Sub-Grid */}
          <div className="grid grid-cols-3 gap-3 pt-1.5">
            {/* 1. Latest 3D */}
            <button
              type="button"
              onClick={handleDownloadLatest3D}
              className="flex flex-col items-start rounded-md border border-slate-200 bg-white p-3 text-left transition-all hover:border-[var(--color-brand-deep)]/50 hover:bg-blue-50/50 hover:shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--tone-ink)] leading-tight group-hover:text-[var(--color-brand-deep)] transition-colors">
                <ClockClockwise size={14} weight="bold" className="text-[var(--color-brand-deep)] shrink-0" />
                <span>Latest 3D</span>
              </div>
              <span className="text-[0.625rem] text-slate-500 font-medium mt-1 leading-snug">
                Approved only
              </span>
            </button>

            {/* 2. All 3D Images */}
            <button
              type="button"
              onClick={handleDownloadAll3DZip}
              className="flex flex-col items-start rounded-md border border-slate-200 bg-white p-3 text-left transition-all hover:border-[var(--color-brand-deep)]/50 hover:bg-blue-50/50 hover:shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--tone-ink)] leading-tight group-hover:text-[var(--color-brand-deep)] transition-colors">
                <Cube size={14} weight="bold" className="text-[var(--color-brand-deep)] shrink-0" />
                <span>3D Images</span>
              </div>
              <span className="text-[0.625rem] text-slate-500 font-medium mt-1 leading-snug">
                All renders (ZIP)
              </span>
            </button>

            {/* 3. All 2D Plans */}
            <button
              type="button"
              onClick={handleDownloadAll2DZip}
              className="flex flex-col items-start rounded-md border border-slate-200 bg-white p-3 text-left transition-all hover:border-[var(--color-brand-deep)]/50 hover:bg-blue-50/50 hover:shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--tone-ink)] leading-tight group-hover:text-[var(--color-brand-deep)] transition-colors">
                <FileCode size={14} weight="bold" className="text-[var(--color-brand-deep)] shrink-0" />
                <span>2D Plans</span>
              </div>
              <span className="text-[0.625rem] text-slate-500 font-medium mt-1 leading-snug">
                All plans (ZIP)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
