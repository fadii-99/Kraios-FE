import { useState } from 'react'
import { Calculator, CheckCircle, FileCsv, ListChecks } from '@phosphor-icons/react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import FinalBoQTable from '@/components/dashboard/projects/workflow/step-4/FinalBoQTable'
import { OUTPUT_COPY } from '@/lib/dashboard/workflow/step-4/outputConfig'
import {
  downloadText,
  generateBoqCsv,
  projectSlug,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Final BoQ Section — Displays the finalized Bill of Quantities data table
 * with architectural styling and individual CSV export action.
 *
 * `boqResult` is the APPROVED BoQ or nothing. It used to fall back to a demo
 * fixture whenever the real one was missing, which meant a skipped or
 * unapproved BoQ still rendered a full priced table under a "BOQ APPROVED"
 * badge and a working CSV export. The fixture still exists for UI work
 * (`workflow/step-3/boqDemoData.js`); it just no longer stands in for a
 * deliverable nobody approved.
 *
 * BoQ is optional, so "not finalized" is a normal state and gets the same
 * dashed empty presentation Output already uses for "no documents".
 */
export default function FinalBoQSection({
  projectName,
  boqResult,
}) {
  const [downloading, setDownloading] = useState(false)

  const rows = boqResult?.rows ?? []
  const hasFinalBoq = rows.length > 0
  const itemCount = rows.length

  const handleDownloadCsv = () => {
    try {
      setDownloading(true)
      const csv = generateBoqCsv(rows)
      const sanitizedProject = projectSlug(projectName)

      downloadText(csv, `${sanitizedProject}-boq.csv`)
      showSuccessToast(`BoQ exported as ${sanitizedProject}-boq.csv.`)
    } catch {
      showErrorToast('Unable to export the BoQ.', { id: 'output-export-boq' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-xs bg-emerald-100 text-emerald-700 shadow-2xs">
              <Calculator size={14} weight="bold" />
            </div>

            <h2
              className="font-display text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Final Bill of Quantities (BoQ)
            </h2>

            {/* Approved Status & Item Count Badge — only for a real approved BoQ */}
            {hasFinalBoq && (
              <div className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-500/35 bg-emerald-50 px-2.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-800">
                <CheckCircle size={12} weight="fill" className="text-emerald-600 shrink-0" />
                <span>{OUTPUT_COPY.boqApprovedBadge}</span>
                <span className="text-emerald-500">·</span>
                <span>{itemCount} Items</span>
              </div>
            )}
          </div>

          <p className="text-[0.8125rem] text-[var(--tone-muted-dark)] pl-8">
            {OUTPUT_COPY.boqSectionBlurb}
          </p>
        </div>

        {/* ── Download BoQ CSV CTA — nothing to export without a final BoQ ── */}
        {hasFinalBoq && (
        <div className="flex shrink-0 items-center pl-8 sm:pl-0">
          <PrimaryButton
            type="button"
            onClick={handleDownloadCsv}
            loading={downloading}
            loadingLabel="Exporting CSV…"
            variant="outline"
            size="xs"
            align="center"
            withArrow={false}
            className="whitespace-nowrap shadow-2xs"
          >
            <span className="flex items-center justify-center gap-1.5">
              <FileCsv size={15} weight="bold" className="text-emerald-600" />
              <span>{OUTPUT_COPY.boqDownloadCta}</span>
              <span className="rounded-xs bg-slate-100 px-1 py-0.2 text-[0.5625rem] font-bold text-slate-600">
                .CSV
              </span>
            </span>
          </PrimaryButton>
        </div>
        )}
      </div>

      {/* ── Structured Architectural BoQ Table, or the not-finalized state ── */}
      {hasFinalBoq ? (
        <FinalBoQTable rows={rows} />
      ) : (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--tone-line-strong)] bg-white/70 p-8 text-center sm:p-10 shadow-2xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xs border border-slate-200 bg-slate-50 text-slate-400 shadow-2xs">
            <ListChecks size={24} weight="regular" />
          </div>

          <h3
            className="mt-3.5 font-display text-[0.8125rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {OUTPUT_COPY.noBoqHeading}
          </h3>

          <p className="mt-1 max-w-sm text-[0.75rem] text-[var(--tone-muted-dark)]">
            {OUTPUT_COPY.noBoqBlurb}
          </p>
        </div>
      )}
    </div>
  )
}
