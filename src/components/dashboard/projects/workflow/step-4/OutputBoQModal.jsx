import { useEffect } from 'react'
import {
  Calculator,
  CheckCircle,
  DownloadSimple,
  FileCsv,
  FileXls,
  X,
} from '@phosphor-icons/react'

import {
  downloadText,
  generateBoqCsv,
  projectSlug,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'

/**
 * OutputBoQModal — Full-screen inspection modal for finalized Bill of Quantities.
 */
export default function OutputBoQModal({
  open = false,
  onClose,
  projectName = 'Kraios Project',
  rows = [],
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleDownloadCsv = () => {
    const csv = generateBoqCsv(rows)
    const sanitizedProject = projectSlug(projectName)
    downloadText(csv, `${sanitizedProject}-boq.csv`)
  }

  const handleDownloadExcel = () => {
    const csv = generateBoqCsv(rows)
    const sanitizedProject = projectSlug(projectName)
    downloadText(csv, `${sanitizedProject}-boq.xls`, 'application/vnd.ms-excel')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--tone-line-strong)] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 shadow-2xs">
              <Calculator size={16} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[0.875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]">
                  Final Bill of Quantities (BoQ)
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.5625rem] font-bold uppercase text-emerald-700">
                  <CheckCircle size={10} weight="fill" />
                  APPROVED LATEST
                </span>
              </div>
              <p className="text-[0.6875rem] text-slate-500 font-medium">
                {projectName} • {rows.length} itemized material lines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-[0.6875rem] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/70"
            >
              <FileCsv size={14} weight="bold" className="text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-[0.6875rem] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/70"
            >
              <FileXls size={14} weight="bold" className="text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Scrollable Table Content */}
        <div className="flex-1 overflow-auto p-5">
          <table className="w-full text-left text-[0.75rem]">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 font-display">
              <tr>
                <th className="px-3 py-2.5">Sr. No.</th>
                <th className="px-3 py-2.5">Item Description</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Quantity</th>
                <th className="px-3 py-2.5 text-right">Rate ($)</th>
                <th className="px-3 py-2.5 text-right">Amount ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2 font-bold text-slate-500">{row.item || idx + 1}</td>
                  <td className="px-3 py-2 font-sans font-medium text-slate-900">{row.description}</td>
                  <td className="px-3 py-2 text-slate-600">{row.unit}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.qty}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.rate}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-700">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
