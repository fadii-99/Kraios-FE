/**
 * Step 4 — downloading deliverables.
 *
 * Every file this stage offers is an authenticated backend asset, so nothing
 * here builds a file in the browser. That is a deliberate reversal: this module
 * used to hold a hand-rolled PKZIP 2.0 writer (CRC32, local headers, central
 * directory, EOCD) that assembled the project package from whatever the browser
 * happened to be holding, in browser memory, from client-side state. The
 * backend now creates real archives from the stored project files, so the
 * package is built where the files actually live and a large project is no
 * longer limited by a tab's heap.
 *
 * What remains is the honest half:
 *
 *   - name normalization, so a user-supplied project or document name becomes a
 *     safe filename,
 *   - authenticated single-asset and CSV downloads,
 *   - the archive flow — queue the job, watch it, download what it produced.
 *
 * Two rules every function keeps: a download is announced only when a file was
 * actually produced, and an HTTP error response is never saved as a file.
 */

import { downloadApiFile } from '@/lib/api/files'
import { jobIdFromResponse, waitForJob } from '@/lib/api/jobs'
import { PROJECT_ENDPOINTS, queueProjectArchive } from '@/lib/api/projects'

/**
 * An RFC 4180 CSV string from BoQ table rows.
 *
 * Kept for the inspection modal, which exports exactly the rows on screen. The
 * project's own BoQ export does NOT use this — it downloads the backend's
 * rendering of the approved version (`downloadBoqCsv`), so the project CSV is
 * always the version that was approved rather than a re-derivation of it.
 */
export function generateBoqCsv(rows = []) {
  const headers = ['Item', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).trim()
    return `"${str.replace(/"/g, '""')}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const dataLines = rows.map((r) =>
    [r.item || '', r.description || '', r.qty || '', r.unit || '', r.rate || '—', r.amount || '—']
      .map(escapeCell)
      .join(','),
  )

  return [headerLine, ...dataLines].join('\r\n')
}

/** Saves a string as a file. */
export function downloadText(content, filename, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = safeFileName(filename, { fallback: 'export' })
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

/** Forward slash and backslash — `String.fromCharCode(92)` is the latter. */
const PATH_SEPARATORS = ['/', String.fromCharCode(92)]

/**
 * Normalizes a user-supplied name into ONE safe filename.
 *
 * Document names and project names reach a download verbatim, and a name
 * containing `/`, `\` or `..` is not something to hand a filesystem.
 * Everything outside a conservative set is replaced, and an empty result falls
 * back rather than producing a nameless file.
 *
 * `keepExtension` preserves a single trailing `.ext` so a sanitized document
 * still opens in the right application.
 */
export function safeFileName(name, { fallback = 'file', keepExtension = true } = {}) {
  const raw = String(name ?? '').trim()

  // Take the last segment: a name that arrived as a path keeps only its leaf.
  const leaf = PATH_SEPARATORS.reduce((value, separator) => value.split(separator).pop(), raw)

  let base = leaf
  let extension = ''

  if (keepExtension) {
    const dot = leaf.lastIndexOf('.')
    if (dot > 0) {
      base = leaf.slice(0, dot)
      extension = leaf.slice(dot + 1).replace(/[^A-Za-z0-9]/g, '')
    }
  }

  const clean = (value) =>
    value
      .replace(/[^A-Za-z0-9._ -]/g, '-')
      .replace(/\.{2,}/g, '.')
      .replace(/-{2,}/g, '-')
      .replace(/^[.\-\s]+|[.\-\s]+$/g, '')

  const safeBase = clean(base) || fallback
  return extension ? `${safeBase}.${extension}` : safeBase
}

/** The project name as a lowercase slug — used for download filenames. */
export function projectSlug(name, fallback = 'kraios-project') {
  const safe = safeFileName(name, { fallback, keepExtension: false })

  return (
    safe
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  )
}

/**
 * Downloads one asset by url.
 *
 * Kept under its original name because four Step 4 sections call it. What
 * changed is underneath: the request carries the session cookie and the
 * response is verified, so a 401 or a 404 returns `false` instead of being
 * saved as a file named like a floor plan.
 *
 * @returns {Promise<boolean>} whether a file was actually produced
 */
export async function downloadAssetUrl(url, filename) {
  if (!url) return false
  return downloadApiFile(url, filename ? safeFileName(filename) : undefined)
}

/** Downloads one project asset by id. */
export async function downloadAsset(projectId, assetId, filename) {
  if (!projectId || !assetId) return false
  return downloadApiFile(
    PROJECT_ENDPOINTS.assetDownload(projectId, assetId),
    filename ? safeFileName(filename) : undefined,
  )
}

/**
 * Downloads one BOQ version as CSV.
 *
 * The backend renders it (`text/csv`, not JSON) from the stored version, so the
 * file matches the version exactly — a browser-side CSV built from the rows on
 * screen could differ from the version that was approved.
 */
export async function downloadBoqCsv(projectId, versionId, projectName) {
  if (!projectId || !versionId) return false

  return downloadApiFile(
    PROJECT_ENDPOINTS.step3VersionCsv(projectId, versionId),
    `${projectSlug(projectName)}-boq.csv`,
  )
}

/**
 * The deliverables archive: queue it, watch it, download it.
 *
 * `POST /download-all/` answers the job DIRECTLY rather than nesting it under a
 * version, and re-queuing a scope that is already running returns that same job
 * instead of a duplicate — so a second click joins the first archive rather
 * than starting another.
 *
 * @param {object} options
 * @param {string} options.projectId
 * @param {string} [options.projectName] used for the saved filename
 * @param {'ALL'|'FLOOR_PLANS'|'THREE_D'|'BOQ'|'DOCUMENTS'} [options.scope]
 * @param {(job: object) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<boolean>} whether a ZIP was actually produced and saved
 */
export async function downloadProjectArchive({
  projectId,
  projectName,
  scope = 'ALL',
  onProgress,
  signal,
} = {}) {
  if (!projectId) return false

  const queued = await queueProjectArchive(projectId, { scope })
  const jobId = jobIdFromResponse(queued) ?? queued?.id

  if (!jobId) return false

  const job = await waitForJob(jobId, { signal, onProgress })
  const assetId = job?.output_asset

  // A completed archive job with no asset produced no file. Saying so is the
  // whole point of returning a boolean.
  if (!assetId) return false

  const suffix = scope === 'ALL' ? 'deliverables' : scope.toLowerCase().replace(/_/g, '-')

  return downloadAsset(projectId, assetId, `${projectSlug(projectName)}-${suffix}.zip`)
}
