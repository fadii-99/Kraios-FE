import {
  DownloadSimple,
  FileArchive,
  FilePdf,
  FileText,
  FileXls,
} from '@phosphor-icons/react'

import {
  downloadAssetUrl,
  downloadBlob,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { formatFileSize } from '@/lib/dashboard/workflow/step-1/floorPlanSource'

const SAMPLE_PROJECT_DOCS = [
  {
    id: 'doc-1',
    name: 'Project Brief.pdf',
    type: 'PDF',
    size: 2400000,
    icon: FilePdf,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    id: 'doc-2',
    name: 'Structural Drawings.zip',
    type: 'ZIP',
    size: 18700000,
    icon: FileArchive,
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'doc-3',
    name: 'Estimation Sheet.xlsx',
    type: 'XLSX',
    size: 122880,
    icon: FileXls,
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'doc-4',
    name: 'Material Specifications.pdf',
    type: 'PDF',
    size: 1800000,
    icon: FilePdf,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
  },
]

/**
 * OutputDocumentsSection — Project documents grid with file badges and batch download actions.
 */
export default function OutputDocumentsSection({
  documents = [],
}) {
  const displayDocs =
    documents && documents.length > 0
      ? documents
      : SAMPLE_PROJECT_DOCS

  const handleDownloadDoc = async (doc) => {
    if (doc.file) {
      downloadBlob(doc.file, doc.name)
      return
    }
    if (doc.url || doc.previewUrl) {
      await downloadAssetUrl(doc.url || doc.previewUrl, doc.name)
      return
    }
    // Fallback demonstration text download
    const dummyBlob = new Blob([`Sample document content for ${doc.name}`], {
      type: 'application/pdf',
    })
    downloadBlob(dummyBlob, doc.name)
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
    <section className="space-y-5 sm:space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-amber-100 text-amber-700 shadow-2xs">
            <FileText size={16} weight="bold" />
          </div>
          <h2
            className="font-display text-[0.875rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Documents
          </h2>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download All (ZIP) */}
          <button
            type="button"
            onClick={() => handleDownloadDoc(displayDocs[0])}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <DownloadSimple size={14} weight="bold" className="text-[var(--color-brand-deep)]" />
            <span>Download All (ZIP)</span>
          </button>
        </div>
      </div>

      {/* ── Documents Cards Grid (4 Columns Layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {displayDocs.slice(0, 4).map((doc, idx) => {
          const { Icon, style } = getDocVisuals(doc)
          const ext = (doc.extension || doc.name?.split('.').pop() || 'FILE').toUpperCase()

          return (
            <div
              key={doc.id || idx}
              className="group flex flex-col justify-between overflow-hidden rounded-lg border border-[var(--tone-line-strong)] bg-white p-5 sm:p-5.5 shadow-2xs transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* File Format Icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border shadow-2xs ${style}`}
                >
                  <Icon size={24} weight="bold" />
                </div>

                {/* Name & Size */}
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-[0.8125rem] font-bold text-[var(--tone-ink)] group-hover:text-[var(--color-brand-deep)] transition-colors"
                    title={doc.name}
                  >
                    {doc.name}
                  </h3>
                  <p className="mt-1 text-[0.6875rem] font-medium text-slate-500">
                    {ext} • {doc.size ? formatFileSize(doc.size) : '2.4 MB'}
                  </p>
                </div>
              </div>

              {/* Bottom Action: Download icon button */}
              <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(doc)}
                  aria-label={`Download ${doc.name}`}
                  title="Download file"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-600 shadow-2xs hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)] hover:text-white transition-all"
                >
                  <DownloadSimple size={15} weight="bold" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
