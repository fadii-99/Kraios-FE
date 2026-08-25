/**
 * Step 3 — the supporting-document record, and its blob-URL lifecycle.
 *
 * ONE shape, declared here, for a document added in the BoQ stage. It exists
 * because Step 3 and Step 4 disagreed about what a document is: Step 3 stored
 * `{ id, name, size, typeId, typeLabel, at }` — pure metadata — while Step 4's
 * Uploaded Documents list needed a `file`, a `url` or a `previewUrl` to preview
 * it, download it, or write it into the deliverables ZIP. A record built here
 * satisfies both, so neither stage has to guess.
 *
 * It deliberately mirrors `createUploadSource` in `step-1/floorPlanSource.js`:
 * same field names, same `ownsPreviewUrl` flag, same release helper. Kraios has
 * one way of describing a user-supplied file and this is it.
 *
 * OWNERSHIP: `previewUrl` is an object URL and this module's caller does not
 * revoke it — `ProjectsProvider` does, when the document is removed, when the
 * project is deleted, and when the dashboard unmounts. `ownsPreviewUrl` marks
 * it as ours to free, so a future remote URL from a real document service flows
 * through the same path untouched.
 */

import { documentTypeById } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif']
const PDF_EXTENSION = 'pdf'

/** Lowercase extension without the dot, or '' when the name carries none. */
export function documentExtension(name = '') {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index + 1).toLowerCase() : ''
}

/** 'image', 'pdf', or null for a file with no preview representation. */
export function documentKind(file) {
  const mime = (file?.type || '').toLowerCase()
  const extension = documentExtension(file?.name)

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension)) return 'image'
  if (mime === 'application/pdf' || extension === PDF_EXTENSION) return 'pdf'
  return null
}

let issued = 0

/**
 * Wraps a picked file as a BoQ supporting document.
 *
 * A preview URL is minted only for a kind the viewer can actually show. That is
 * what lets Step 4 offer "View" on the strength of a real source rather than an
 * optimistic guess from the file extension.
 */
export function createBoqDocument(file, { typeId } = {}) {
  if (!file) return null

  issued += 1
  const kind = documentKind(file)
  const type = documentTypeById(typeId)
  const previewable = kind === 'image' || kind === 'pdf'

  return {
    id: `doc-${Date.now()}-${issued}`,
    name: file.name,
    size: file.size,
    mime: file.type || (kind === 'pdf' ? 'application/pdf' : ''),
    extension: documentExtension(file.name),
    kind,
    typeId: type.id,
    typeLabel: type.label,
    /** The Blob itself — what the ZIP bundler and Download read. */
    file,
    previewUrl: previewable ? URL.createObjectURL(file) : null,
    ownsPreviewUrl: previewable,
    addedAt: Date.now(),
  }
}

/** Frees the blob URL a document owns. Safe on null, and on a remote URL. */
export function releaseBoqDocument(document) {
  if (document?.ownsPreviewUrl && document.previewUrl) {
    URL.revokeObjectURL(document.previewUrl)
  }
}

/** Frees every blob URL in a list. */
export function releaseBoqDocuments(documents = []) {
  documents.forEach(releaseBoqDocument)
}

/**
 * Whether Step 4 can genuinely open this document in the shared viewer.
 *
 * BOTH halves are required: a previewable kind AND a usable source. A row that
 * knows a file is a PDF but holds no URL for it must not offer "View" — the
 * viewer would open on nothing.
 */
export function canPreviewDocument(document) {
  if (!document) return false
  const source = document.previewUrl || document.url
  if (!source) return false

  const kind = document.kind
  if (kind) return kind === 'image' || kind === 'pdf'

  const extension = (document.extension || documentExtension(document.name)).toLowerCase()
  return extension === PDF_EXTENSION || IMAGE_EXTENSIONS.includes(extension)
}
