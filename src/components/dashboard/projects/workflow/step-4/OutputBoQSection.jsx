import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  CheckCircle,
  Eye,
  FileCsv,
  PencilSimple,
} from '@phosphor-icons/react'

import { downloadBoqCsv } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { OUTPUT_COPY } from '@/lib/dashboard/workflow/step-4/outputConfig'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast } from '@/lib/toast'

/**
 * OutputBoQSection — the APPROVED Bill of Quantities, previewed, with the
 * backend's own CSV export.
 *
 * Two corrections here. The preview used to fall back to five invented rows —
 * excavation, RCC, brickwork, with rates and amounts — whenever no BoQ was
 * approved, so a project with no costing showed a costed schedule. And the CSV
 * was generated in the browser from whatever rows were on screen; it is now
 * `GET /step-3/versions/{id}/download-csv/`, so the file is the version that
 * was actually approved.
 */
export default function OutputBoQSection({
  projectId,
  projectName,
  boqResult,
  onOpenFullModal,
}) {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)

  const rows = boqResult?.rows ?? []

  const handleDownloadCsv = async () => {
    if (downloading || !boqResult?.id) return

    setDownloading(true)
    try {
      const saved = await downloadBoqCsv(projectId, boqResult.id, projectName)
      if (!saved) {
        showErrorToast('That BoQ could not be downloaded.', { id: 'boq-csv-failed' })
      }
    } catch (thrown) {
      showErrorToast(thrown?.message || 'That BoQ could not be downloaded.', {
        id: 'boq-csv-failed',
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleEditBoQ = () => {
    if (projectId) {
      navigate(projectStagePath(projectId, 'boq') + '/assistant')
    }
  }

  return (
    <section className="flex flex-col justify-between rounded-lg border border-[var(--tone-line-strong)] bg-white p-6 sm:p-8 lg:p-9 shadow-2xs h-full">
      <div>
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-emerald-100 text-emerald-700 shadow-2xs">
              <Calculator size={16} weight="bold" />
            </div>
            <h2
              className="font-display text-[0.875rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              BOQ (Bill of Quantities)
            </h2>
          </div>

          {/* The badge states an APPROVAL, so it appears only when there is
              one. It used to read "LATEST" over whatever rows were on screen,
              including the sample ones. */}
          {boqResult && (
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-500/10 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 font-display">
              <CheckCircle size={13} weight="fill" className="text-emerald-600" />
              {OUTPUT_COPY.boqApprovedBadge}
            </span>
          )}
        </div>

        {/* ── Structured Table View, or the honest absence of one ── */}
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
            <h3
              className="text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {OUTPUT_COPY.noBoqHeading}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
              {OUTPUT_COPY.noBoqBlurb}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-left text-[0.8125rem]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 font-display">
              <tr>
                <th className="px-4 py-3">Sr. No.</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-3.5 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Rate ($)</th>
                <th className="px-4 py-3 text-right">Amount ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.slice(0, 3).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-500">{row.item || idx + 1}</td>
                  <td className="px-4 py-3.5 font-sans font-medium text-slate-900 truncate max-w-[150px]" title={row.description}>
                    {row.description}
                  </td>
                  <td className="px-3.5 py-3.5 text-slate-600">{row.unit}</td>
                  <td className="px-4 py-3.5 text-right text-slate-700">{row.qty}</td>
                  <td className="px-4 py-3.5 text-right text-slate-700">{row.rate}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* ── Bottom Controls ── */}
      <div className="mt-5 sm:mt-6 pt-4 sm:pt-4.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Left Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEditBoQ}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-[0.75rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <PencilSimple size={14} weight="bold" />
            <span>Edit BOQ</span>
          </button>

          <button
            type="button"
            onClick={onOpenFullModal}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-[0.75rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Eye size={14} weight="bold" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right Download Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={downloading || !boqResult}
            aria-busy={downloading || undefined}
            title={boqResult ? undefined : 'Approve a Bill of Quantities to export it.'}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-[0.75rem] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/70 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileCsv size={15} weight="bold" className="text-emerald-600" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </section>
  )
}
