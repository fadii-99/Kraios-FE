import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  CheckCircle,
  DownloadSimple,
  Eye,
  FileArchive,
  FileCsv,
  FilePdf,
  FileText,
  FileXls,
  PencilSimple,
} from '@phosphor-icons/react'

import { downloadAssetUrl, downloadBoqCsv } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { OUTPUT_COPY } from '@/lib/dashboard/workflow/step-4/outputConfig'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { formatFileSize } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { showErrorToast } from '@/lib/toast'

/**
 * OutputBoQSection — Full-width Bill of Quantities (BoQ) schedule + Integrated Supporting Documents.
 */
export default function OutputBoQSection({
  projectId,
  projectName,
  boqResult,
  documents = [],
  onOpenFullModal,
  onEditBoq,
}) {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)

  const rows = boqResult?.rows ?? []
  const displayDocs = documents ?? []

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

  /**
   * Edit opens the BoQ here, in place.
   *
   * It used to navigate back to the BoQ Assistant, because the table was only
   * editable there. The assistant no longer shows the table at all — it is
   * approved in Step 3 and worked on here — so the edit control opens the
   * full-screen table in edit mode instead. Falling back to the assistant
   * keeps the control useful if the stage is ever rendered without a handler.
   */
  const handleEditBoQ = () => {
    if (onEditBoq) {
      onEditBoq()
      return
    }
    if (projectId) {
      navigate(projectStagePath(projectId, 'boq') + '/assistant')
    }
  }

  const handleDownloadDoc = async (doc) => {
    const url = doc?.downloadUrl || doc?.url || doc?.previewUrl
    const saved = url ? await downloadAssetUrl(url, doc.name) : false

    if (!saved) {
      showErrorToast('That document could not be downloaded.', {
        id: 'document-download-failed',
      })
    }
  }

  const getDocVisuals = (doc) => {
    const ext = (doc.extension || doc.name?.split('.').pop() || 'PDF').toUpperCase()
    if (ext === 'PDF') {
      return { Icon: FilePdf, style: 'text-rose-600 bg-rose-50 border-rose-200' }
    }
    if (['XLS', 'XLSX', 'CSV'].includes(ext)) {
      return { Icon: FileXls, style: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
    }
    if (['ZIP', 'RAR', '7Z'].includes(ext)) {
      return { Icon: FileArchive, style: 'text-amber-600 bg-amber-50 border-amber-200' }
    }
    return { Icon: FileText, style: 'text-blue-600 bg-blue-50 border-blue-200' }
  }

  return (
    <section className="flex flex-col justify-between rounded-lg border border-[var(--tone-line-strong)] bg-white p-5 sm:p-6 shadow-2xs w-full space-y-6">
      <div>
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-emerald-100 text-emerald-700 shadow-2xs">
              <Calculator size={16} weight="bold" />
            </div>
            <div>
              <h2
                className="font-display text-[0.875rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                BOQ (Bill of Quantities) & Project Documents
              </h2>
              <p className="text-[0.6875rem] text-slate-500 font-medium mt-0.5">
                Itemized material schedule and uploaded project files from Step 3
              </p>
            </div>
          </div>

          {boqResult && (
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-500/10 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 font-display">
              <CheckCircle size={13} weight="fill" className="text-emerald-600" />
              {OUTPUT_COPY.boqApprovedBadge}
            </span>
          )}
        </div>

        {/* ── Structured Table View ── */}
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center my-4">
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
        <div className="overflow-x-auto rounded-md border border-slate-200 mt-4">
          <table className="w-full text-left text-[0.8125rem]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500 font-display">
              <tr>
                <th className="px-4 py-3 w-16">Sr. No.</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-3.5 py-3 w-24">Unit</th>
                <th className="px-4 py-3 text-right w-28">Quantity</th>
                <th className="px-4 py-3 text-right w-28">Rate ($)</th>
                <th className="px-4 py-3 text-right w-32">Amount ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.slice(0, 6).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-500">{row.item || idx + 1}</td>
                  <td className="px-4 py-3 font-sans font-medium text-slate-900 truncate max-w-[320px]" title={row.description}>
                    {row.description}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">{row.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.qty}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.rate}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 6 && (
            <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={onOpenFullModal}
                className="text-[0.6875rem] font-bold text-[var(--color-brand-deep)] hover:underline cursor-pointer"
              >
                + {rows.length - 6} more material item lines in Full Preview
              </button>
            </div>
          )}
        </div>
        )}

        {/* ── Table Action Controls ── */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEditBoQ}
              className="flex cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-3.5 py-1.5 text-[0.75rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <PencilSimple size={14} weight="bold" />
              <span>Edit BOQ</span>
            </button>

            <button
              type="button"
              onClick={onOpenFullModal}
              className="flex cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-3.5 py-1.5 text-[0.75rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Eye size={14} weight="bold" />
              <span>Full Preview</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={downloading || !boqResult}
              className="flex cursor-pointer items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-50 px-3.5 py-1.5 text-[0.75rem] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/70 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCsv size={15} weight="bold" className="text-emerald-600" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Integrated Supporting Documents Sub-Section ── */}
      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tone-ink)] font-display">
            Supporting Project Documents ({displayDocs.length})
          </h3>
          <span className="text-[0.6875rem] text-slate-400 font-medium">
            Uploaded in Step 3
          </span>
        </div>

        {displayDocs.length === 0 ? (
          <p className="text-[0.75rem] italic text-slate-400 bg-slate-50 p-3 rounded-md border border-dashed border-slate-200">
            No additional supporting document files uploaded for this BOQ.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayDocs.map((doc, idx) => {
              const { Icon, style } = getDocVisuals(doc)
              const ext = (doc.extension || doc.name?.split('.').pop() || 'FILE').toUpperCase()

              return (
                <div
                  key={doc.id || idx}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/70 p-3 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border ${style}`}>
                      <Icon size={16} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[0.75rem] font-bold text-slate-800" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[0.625rem] text-slate-500 font-medium">
                        {ext} • {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(doc)}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-slate-200 bg-white text-slate-600 hover:bg-[var(--color-brand-deep)] hover:text-white transition-colors"
                  >
                    <DownloadSimple size={13} weight="bold" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
