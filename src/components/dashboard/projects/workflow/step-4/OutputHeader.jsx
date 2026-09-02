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
  downloadProjectArchive,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * OutputHeader — Hero banner with Project Deliverables summary chips on the left
 * and Quick Downloads command center on the right.
 *
 * Every count on this banner is now COUNTED, from the project's own output
 * bundle. It used to fall back to fixed numbers — 18 renders, 2 plans, 24
 * documents, 1 BoQ — whenever real data was missing, which meant a project with
 * nothing in it advertised 45 deliverables. A project with no documents says
 * zero.
 *
 * The three scoped downloads are real backend archives: each queues
 * `POST /download-all/` with its own scope, waits for the job, and saves what
 * it produced. Nothing is announced that did not download.
 */
export default function OutputHeader({
  projectId,
  projectName,
  render3DSource,
  boqCount = 0,
  docCount = 0,
  renderCount = 0,
  planCount = 0,
}) {
  const [downloadingScope, setDownloadingScope] = useState(null)
  const downloadingZip = downloadingScope !== null

  const runArchive = async (scope, label) => {
    if (downloadingZip) return

    setDownloadingScope(scope)
    try {
      const saved = await downloadProjectArchive({ projectId, projectName, scope })

      if (saved) {
        showSuccessToast(`${label} downloaded.`, { id: `archive-${scope}` })
      } else {
        showErrorToast(`There is nothing to download in ${label.toLowerCase()} yet.`, {
          id: `archive-empty-${scope}`,
        })
      }
    } catch (thrown) {
      showErrorToast(thrown?.message || 'That download could not be prepared.', {
        id: `archive-failed-${scope}`,
      })
    } finally {
      setDownloadingScope(null)
    }
  }

  const handleDownloadAllZip = () => runArchive('ALL', 'Project package')
  const handleDownloadAll3DZip = () => runArchive('THREE_D', '3D renders')

  const handleDownloadLatest3D = async () => {
    const url = render3DSource?.imageUrl
    if (!url) {
      showErrorToast('No approved 3D design to download yet.', { id: 'no-3d-download' })
      return
    }

    const saved = await downloadAssetUrl(url, render3DSource.assetName || 'approved-3d-model.png')
    if (!saved) {
      showErrorToast('That 3D design could not be downloaded.', { id: 'download-3d-failed' })
    }
  }

  const handleDownloadAll2DZip = () => runArchive('FLOOR_PLANS', '2D plans')

  const hasDeliverables = planCount + renderCount + boqCount + docCount > 0

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--tone-line-strong)] bg-white p-4 sm:p-5 lg:p-6 shadow-2xs">
      {/* Top Setting-Out Accent Line */}
      <span
        aria-hidden="true"
        className="absolute -top-px left-0 h-1 w-48 rounded-tl-lg bg-[var(--color-brand-deep)] shadow-[0_0_12px_rgba(11,94,215,0.4)]"
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* ── Left Column: Metadata, Title & Deliverables Stat Chips ── */}
        <div className="min-w-0 flex-1 space-y-2.5 max-w-2xl">
          {/* Eyebrow Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xs border border-[var(--color-brand-deep)]/25 bg-[var(--color-brand-deep)]/[0.06] px-2.5 py-0.5 text-[var(--color-brand-deep)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_6px_var(--color-brand)]" />
              <span
                className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                PROJECT OUTPUT
              </span>
            </div>

            {hasDeliverables ? (
              <div className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-800">
                <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                <span>DELIVERABLES READY</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-xs border border-[var(--tone-line-strong)] bg-white px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[var(--tone-muted-dark)]">
                <ClockClockwise size={12} weight="bold" className="text-[var(--tone-muted)]" />
                <span>NO DELIVERABLES YET</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-xl font-black uppercase leading-tight tracking-tight text-[var(--tone-ink)] sm:text-2xl lg:text-[1.625rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            YOUR PROJECT DELIVERABLES
          </h1>

          {/* Subtitle */}
          <p className="text-[0.8125rem] font-normal leading-relaxed text-[var(--tone-muted-dark)]">
            Review your approved plans, finalized BOQ and all supporting project documents. Download individual items or the complete project package.
          </p>

          {/* Deliverables Stat Badges Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-[0.6875rem] font-semibold text-slate-700 shadow-2xs">
              <Blueprint size={14} weight="bold" className="text-[var(--color-brand-deep)]" />
              <span>{planCount} Architectural Plans</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-[0.6875rem] font-semibold text-slate-700 shadow-2xs">
              <Cube size={14} weight="bold" className="text-[var(--color-brand-deep)]" />
              <span>{renderCount} 3D Images</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-[0.6875rem] font-semibold text-slate-700 shadow-2xs">
              <Calculator size={14} weight="bold" className="text-emerald-600" />
              <span>{boqCount} BOQ</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-[0.6875rem] font-semibold text-slate-700 shadow-2xs">
              <FileText size={14} weight="bold" className="text-amber-600" />
              <span>{docCount} Documents</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: QUICK DOWNLOADS Command Center Card ── */}
        <div className="w-full shrink-0 flex flex-col gap-3 rounded-lg border border-[var(--tone-line-strong)] bg-slate-50/80 p-3.5 sm:p-4 lg:w-[400px] xl:w-[430px] shadow-2xs">
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
