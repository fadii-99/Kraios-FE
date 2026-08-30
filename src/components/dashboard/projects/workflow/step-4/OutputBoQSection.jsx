import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  CheckCircle,
  Eye,
  FileCsv,
  PencilSimple,
} from '@phosphor-icons/react'

import {
  downloadText,
  generateBoqCsv,
  projectSlug,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'

const SAMPLE_BOQ_ROWS = [
  { item: '1', description: 'Excavation in foundation', unit: 'Cum', qty: '12.50', rate: '350.00', amount: '4,375.00' },
  { item: '2', description: 'RCC (M20) in footings & columns', unit: 'Cum', qty: '15.75', rate: '6,200.00', amount: '97,650.00' },
  { item: '3', description: 'Brick Work (1:6) superstructure', unit: 'Sqm', qty: '125.00', rate: '850.00', amount: '1,06,250.00' },
  { item: '4', description: 'Internal Cement Plaster (1:4)', unit: 'Sqm', qty: '280.00', rate: '220.00', amount: '61,600.00' },
  { item: '5', description: 'Vitrified Floor Tiles (600x600)', unit: 'Sqm', qty: '110.00', rate: '950.00', amount: '1,04,500.00' },
]

/**
 * OutputBoQSection — Itemized Bill of Quantities mini-table preview with CSV download.
 */
export default function OutputBoQSection({
  projectId,
  projectName,
  boqResult,
  onOpenFullModal,
}) {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)

  const rows =
    boqResult?.rows && boqResult.rows.length > 0
      ? boqResult.rows
      : SAMPLE_BOQ_ROWS

  const handleDownloadCsv = () => {
    try {
      setDownloading(true)
      const csv = generateBoqCsv(rows)
      const sanitizedProject = projectSlug(projectName)
      downloadText(csv, `${sanitizedProject}-boq.csv`)
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

          <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-500/10 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 font-display">
            <CheckCircle size={13} weight="fill" className="text-emerald-600" />
            LATEST
          </span>
        </div>

        {/* ── Structured Table View ── */}
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
            disabled={downloading}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-50 px-4 py-2 text-[0.75rem] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/70 transition-colors"
          >
            <FileCsv size={15} weight="bold" className="text-emerald-600" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </section>
  )
}
