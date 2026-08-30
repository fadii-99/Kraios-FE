import {
  DownloadSimple,
  FileArchive,
  FilePdf,
  FileText,
  FileXls,
} from '@phosphor-icons/react'

import {
  downloadAssetUrl,
  downloadProjectArchive,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { formatFileSize } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { OUTPUT_COPY } from '@/lib/dashboard/workflow/step-4/outputConfig'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * OutputDocumentsSection — the project's supporting documents.
 *
 * Two fictions are gone from this section. It used to display four invented
 * files — Project Brief.pdf, Structural Drawings.zip and so on — whenever the
 * project had none, and Download produced a Blob containing the sentence
 * "Sample document content for <name>" when it could not find a real file. A
 * project with no documents now says so, and Download either saves the real
 * asset or reports that it could not.
 */
export default function OutputDocumentsSection({
  projectId,
  projectName,
  documents = [],
}) {
  const displayDocs = documents ?? []

  const handleDownloadDoc = async (doc) => {
    const url = doc?.downloadUrl || doc?.url || doc?.previewUrl
    const saved = url ? await downloadAssetUrl(url, doc.name) : false

    if (!saved) {
      showErrorToast('That document could not be downloaded.', {
        id: 'document-download-failed',
      })
    }
  }

  const handleDownloadAll = async () => {
    try {
      const saved = await downloadProjectArchive({
        projectId,
        projectName,
        scope: 'DOCUMENTS',
      })

      if (saved) showSuccessToast('Documents downloaded.', { id: 'archive-DOCUMENTS' })
      else showErrorToast('There are no documents to download yet.', { id: 'archive-empty-docs' })
    } catch (thrown) {
      showErrorToast(thrown?.message || 'That download could not be prepared.', {
        id: 'archive-failed-docs',
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
            onClick={handleDownloadAll}
            disabled={displayDocs.length === 0}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadSimple size={14} weight="bold" className="text-[var(--color-brand-deep)]" />
            <span>Download All (ZIP)</span>
          </button>
        </div>
      </div>

      {/* ── Empty State: a project genuinely may have no documents ── */}
      {displayDocs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--tone-line-strong)] bg-white p-8 text-center">
          <h3
            className="text-[0.875rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {OUTPUT_COPY.noDocsHeading}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
            {OUTPUT_COPY.noDocsBlurb}
          </p>
        </div>
      ) : (
      /* ── Documents Cards Grid (4 Columns Layout) ── */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {displayDocs.map((doc, idx) => {
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
                    {ext} • {formatFileSize(doc.size)}
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
      )}
    </section>
  )
}
