/**
 * Authenticated file access for KRAIOS project assets.
 *
 * Assets are behind the session cookie, so they cannot be reached with a bare
 * `<a href>` to an absolute backend URL: the browser would send the request to
 * another origin without the cookie and get a 401 rendered as a broken image or
 * an empty download.
 *
 * Two helpers cover every case:
 *
 *   - `assetSrc` — a SAME-ORIGIN url safe to put in `src` / `href`. The browser
 *     attaches the cookie because the request goes through the app's own proxy.
 *   - `downloadApiFile` — a real download: fetch with credentials, verify the
 *     response, then hand the blob to a temporary anchor.
 *
 * The backend's own `download_url` may be an absolute ngrok address. It is
 * deliberately NOT trusted for display: `assetSrc` normalizes anything that
 * points at the API back onto this origin, which is what keeps development,
 * Vercel and the final VPS behaving the same.
 */

import { API_BASE_URL } from './client'
import { PROJECT_ENDPOINTS } from './projects'

const base = () => API_BASE_URL.replace(/\/+$/, '')

/** Joins an endpoint path onto the API base. Absolute urls pass through. */
export function apiUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${base()}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * A same-origin url for one asset, usable directly in `src` or `href`.
 *
 * Accepts either an asset object (the nested `asset` on a version or document)
 * or a raw `download_url`. An absolute backend url is rewritten onto this
 * origin at `/api/...` so the session cookie travels with it; anything that is
 * not an API address — a local `/assets/…` file, a blob or data url — is left
 * exactly as it is.
 */
export function assetSrc(assetOrUrl, projectId) {
  if (!assetOrUrl) return null

  if (typeof assetOrUrl === 'object') {
    if (projectId && assetOrUrl.id) {
      return apiUrl(PROJECT_ENDPOINTS.assetDownload(projectId, assetOrUrl.id))
    }
    return assetSrc(assetOrUrl.download_url ?? assetOrUrl.url ?? null, projectId)
  }

  const url = String(assetOrUrl)
  if (url.startsWith('blob:') || url.startsWith('data:')) return url

  if (/^https?:\/\//i.test(url)) {
    // Keep only the path when it is an API address; a foreign url is not ours
    // to rewrite.
    try {
      const parsed = new URL(url)
      return parsed.pathname.startsWith('/api/')
        ? `${parsed.pathname}${parsed.search}`
        : url
    } catch {
      return url
    }
  }

  return url.startsWith('/api/') ? url : apiUrl(url)
}

/**
 * Fetches one authenticated file as a Blob.
 *
 * Throws when the response is not ok — an HTTP error body is never a file, and
 * silently packaging one is how a 401 page ends up inside a project ZIP.
 */
export async function fetchApiBlob(path, { signal } = {}) {
  const response = await fetch(assetSrc(path) ?? apiUrl(path), {
    credentials: 'include',
    headers: { 'ngrok-skip-browser-warning': 'true' },
    signal,
  })

  if (!response.ok) {
    const error = new Error('That file could not be downloaded.')
    error.status = response.status
    throw error
  }

  return response.blob()
}

/** The filename the server suggested, or null. */
function filenameFromDisposition(header) {
  if (!header) return null

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      return utf8[1]
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? null
}

/**
 * Downloads one authenticated file to the user's machine.
 *
 * Returns `true` only when a file was genuinely produced, so a caller never
 * announces a download that did not happen.
 *
 * @param {string} path      an API path, or an asset `download_url`
 * @param {string} [filename] falls back to the server's Content-Disposition
 * @returns {Promise<boolean>}
 */
export async function downloadApiFile(path, filename, { signal } = {}) {
  let response
  try {
    response = await fetch(assetSrc(path) ?? apiUrl(path), {
      credentials: 'include',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal,
    })
  } catch {
    return false
  }

  if (!response.ok) return false

  const suggested = filenameFromDisposition(response.headers.get('content-disposition'))
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename || suggested || 'download'
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoked on the next frame: revoking synchronously can beat the click in
  // some browsers and cancel the download it was for.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)

  return true
}

/** The path that downloads one project asset. */
export function assetDownloadPath(projectId, assetId) {
  return PROJECT_ENDPOINTS.assetDownload(projectId, assetId)
}

/** The path that downloads one BOQ version as CSV. */
export function boqCsvPath(projectId, versionId) {
  return PROJECT_ENDPOINTS.step3VersionCsv(projectId, versionId)
}

/**
 * Turns a canvas data URL into a real `File`, which is what the mask fields on
 * the 2D and 3D edit endpoints require. Kept here because it is the same
 * conversion for both steps.
 */
export function dataUrlToFile(dataUrl, filename = 'mask.png') {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null

  const [header, encoded] = dataUrl.split(',')
  if (!encoded) return null

  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/png'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new File([bytes], filename, { type: mime })
}
