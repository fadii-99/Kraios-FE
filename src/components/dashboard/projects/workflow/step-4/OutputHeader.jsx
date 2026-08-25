import { useState } from 'react'
import { Blueprint, Calculator, CheckCircle, DownloadSimple, FileText, Package, Sparkle } from '@phosphor-icons/react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { OUTPUT_COPY } from '@/lib/dashboard/workflow/step-4/outputConfig'
import { downloadProjectPackageZip } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Step 4 Header Bar — Premium architectural hero banner with deliverables stats and ZIP CTA.
 */
export default function OutputHeader({
  projectName,
  plan2DSource,
  render3DSource,
  boqRows = [],
  uploadedDocs = [],
}) {
  const [downloadingZip, setDownloadingZip] = useState(false)

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true)
      await downloadProjectPackageZip({
        projectName,
        plan2DSource,
        render3DSource,
        boqRows,
        uploadedDocs,
      })
      showSuccessToast('Project package downloaded.')
    } catch {
      showErrorToast('Unable to download the project package.', {
        id: 'output-download-zip',
      })
    } finally {
      setDownloadingZip(false)
    }
  }

  const docCount = uploadedDocs.length
  const boqCount = boqRows.length

  return (
    <div className="relative overflow-hidden rounded-md border border-[var(--tone-line-strong)] bg-white/95 p-5 shadow-2xs sm:p-6 lg:p-7">
      {/* Top Setting-Out Accent Line */}
      <span
        aria-hidden="true"
        className="absolute -top-px left-0 h-[3.5px] w-40 rounded-tl-md bg-[var(--color-brand-deep)] shadow-[0_0_10px_rgba(11,94,215,0.35)]"
      />

      {/* Technical Corner Crosshairs */}
      <div aria-hidden="true" className="pointer-events-none absolute right-3 top-3 select-none font-mono text-[0.625rem] text-slate-300">
        +
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 select-none font-mono text-[0.625rem] text-slate-300">
        +
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        {/* Left Info Stack */}
        <div className="min-w-0 max-w-2xl space-y-3">
          {/* Eyebrow Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xs border border-[var(--color-brand-deep)]/25 bg-[var(--color-brand-deep)]/[0.06] px-2.5 py-0.5 text-[var(--color-brand-deep)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_6px_var(--color-brand)]" />
              <span
                className="font-display text-[0.625rem] font-bold uppercase tracking-[0.16em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {OUTPUT_COPY.eyebrow}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xs border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-800">
              <CheckCircle size={12} weight="fill" className="text-emerald-600" />
              <span>Deliverables Ready</span>
            </div>
          </div>

          {/* Heading */}
          <h1
            className="text-[1.75rem] font-black uppercase leading-tight tracking-[-0.03em] text-[var(--tone-ink)] sm:text-[2.125rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {OUTPUT_COPY.title}
          </h1>

          {/* Subcopy */}
          <p className="text-[0.875rem] font-normal leading-relaxed text-[var(--tone-muted-dark)] sm:text-[0.9375rem]">
            {OUTPUT_COPY.blurb}
          </p>

          {/* Deliverables Stat Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[0.6875rem] font-semibold text-slate-700">
              <Blueprint size={14} weight="bold" className="text-[var(--color-brand-deep)]" />
              <span>2 Architectural Plans</span>
            </div>

            {/* BoQ is optional and only an APPROVED one is a deliverable, so
                this chip reports what the package actually contains. */}
            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[0.6875rem] font-semibold text-slate-700">
              <Calculator size={14} weight="bold" className="text-emerald-600" />
              <span>
                {boqCount > 0
                  ? `${OUTPUT_COPY.boqStatChip} (${boqCount} Items)`
                  : OUTPUT_COPY.boqStatChipNone}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xs border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[0.6875rem] font-semibold text-slate-700">
              <FileText size={14} weight="bold" className="text-amber-600" />
              <span>{docCount} Supporting {docCount === 1 ? 'Doc' : 'Docs'}</span>
            </div>
          </div>
        </div>

        {/* Right CTA Area */}
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <PrimaryButton
            type="button"
            onClick={handleDownloadZip}
            loading={downloadingZip}
            loadingLabel="Packaging ZIP…"
            size="default"
            align="center"
            withArrow={false}
            className="w-full sm:w-auto whitespace-nowrap shadow-[0_4px_16px_rgba(11,94,215,0.25)]"
          >
            <span className="flex items-center justify-center gap-2.5 whitespace-nowrap">
              <Package size={18} weight="bold" />
              <span>{OUTPUT_COPY.downloadZipCta}</span>
            </span>
          </PrimaryButton>

          <span className="text-[0.6875rem] font-medium text-slate-400">
            {boqCount > 0
              ? 'Includes 2D Plan, 3D Render, BoQ CSV & Documents'
              : 'Includes 2D Plan, 3D Render & Documents'}
          </span>
        </div>
      </div>
    </div>
  )
}
