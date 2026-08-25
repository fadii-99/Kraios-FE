import { DownloadSimple, Eye, File, FileImage, FilePdf, FileText, FolderOpen } from '@phosphor-icons/react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { OUTPUT_COPY } from '@/lib/dashboard/workflow/step-4/outputConfig'
import { downloadBlob, downloadAssetUrl } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { formatFileSize } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { canPreviewDocument } from '@/lib/dashboard/workflow/step-3/boqDocuments'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Uploaded Supporting Documents Section.
 *
 * Lists all supporting documents uploaded in Step 3 / BoQ Assistant, with
 * preview capability for supported image/PDF formats and direct download actions.
 *
 * "View" is offered on TWO conditions, not one: a previewable kind AND a source
 * the viewer can actually open. Extension alone used to be enough, so a record
 * carrying only metadata still showed View and opened an empty lightbox.
 * `canPreviewDocument` is the single answer to that question, shared with the
 * module that builds the records.
 */
export default function UploadedDocumentsSection({
  documents = [],
  onViewSource,
}) {
  const hasDocuments = documents.length > 0

  const getFileIcon = (doc) => {
    const ext = (doc.extension || doc.name?.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf') return FilePdf
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return FileImage
    return File
  }

  const handleView = (doc) => {
    const source = doc.previewUrl || doc.url
    if (!source) {
      showErrorToast('This file is not available to preview.', { id: 'output-doc-preview' })
      return
    }

    onViewSource({
      previewUrl: source,
      imageUrl: source,
      name: doc.name || 'Supporting Document',
      extension: doc.extension || doc.name?.split('.').pop() || 'PDF',
    })
  }

  const handleDownload = async (doc) => {
    // A record with neither a blob nor a URL is metadata, not a file — it used
    // to fall through here silently and look like a dead button.
    if (doc.file) {
      downloadBlob(doc.file, doc.name)
      showSuccessToast(`${doc.name} downloaded.`)
      return
    }

    if (doc.url && (await downloadAssetUrl(doc.url, doc.name))) {
      showSuccessToast(`${doc.name} downloaded.`)
      return
    }

    showErrorToast('This file is not available yet.', { id: 'output-doc-download' })
  }

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-xs bg-amber-100 text-amber-700 shadow-2xs">
              <FileText size={14} weight="bold" />
            </div>

            <h2
              className="font-display text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {OUTPUT_COPY.docsSectionTitle}
            </h2>

            {hasDocuments && (
              <span className="rounded-xs border border-slate-200 bg-white px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-600 font-display">
                {documents.length} {documents.length === 1 ? 'File' : 'Files'}
              </span>
            )}
          </div>

          <p className="text-[0.8125rem] text-[var(--tone-muted-dark)] pl-8">
            {OUTPUT_COPY.docsSectionBlurb}
          </p>
        </div>
      </div>

      {/* ── Content Area: Documents List or Clean Empty State ── */}
      {hasDocuments ? (
        <div className="overflow-hidden rounded-md border border-[var(--tone-line-strong)] bg-white shadow-2xs">
          <div className="divide-y divide-[var(--tone-line)]">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc)
              const previewSupported = canPreviewDocument(doc)
              const ext = (doc.extension || doc.name?.split('.').pop() || 'FILE').toUpperCase()

              return (
                <div
                  key={doc.id || doc.name}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5 transition-colors hover:bg-slate-50/70"
                >
                  {/* Left File Information */}
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-slate-200 bg-slate-50 text-[var(--color-brand-deep)] shadow-2xs">
                      <Icon size={20} weight="bold" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[0.8125rem] font-bold text-[var(--tone-ink)]" title={doc.name}>
                          {doc.name}
                        </p>
                        <span className="rounded-xs border border-slate-200 bg-slate-100/90 px-1.5 py-0.2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-700">
                          {ext}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem] text-[var(--tone-muted-dark)]">
                        <span className="font-medium text-slate-600">{doc.typeLabel || 'Supporting Document'}</span>
                        {doc.size && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>{formatFileSize(doc.size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex shrink-0 items-center gap-2 pl-13 sm:pl-0">
                    {previewSupported && (
                      <PrimaryButton
                        type="button"
                        onClick={() => handleView(doc)}
                        variant="outline"
                        size="xs"
                        align="center"
                        withArrow={false}
                        className="whitespace-nowrap shadow-2xs"
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <Eye size={13} weight="bold" />
                          <span>View</span>
                        </span>
                      </PrimaryButton>
                    )}

                    <PrimaryButton
                      type="button"
                      onClick={() => handleDownload(doc)}
                      variant="outline"
                      size="xs"
                      align="center"
                      withArrow={false}
                      className="whitespace-nowrap shadow-2xs"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <DownloadSimple size={13} weight="bold" />
                        <span>Download</span>
                      </span>
                    </PrimaryButton>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Clean Zero-Documents Empty State (Read-only) */
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--tone-line-strong)] bg-white/70 p-8 text-center sm:p-10 shadow-2xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xs border border-slate-200 bg-slate-50 text-slate-400 shadow-2xs">
            <FolderOpen size={24} weight="regular" />
          </div>

          <h3
            className="mt-3.5 font-display text-[0.8125rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {OUTPUT_COPY.noDocsHeading}
          </h3>

          <p className="mt-1 max-w-sm text-[0.75rem] text-[var(--tone-muted-dark)]">
            {OUTPUT_COPY.noDocsBlurb}
          </p>
        </div>
      )}
    </div>
  )
}
