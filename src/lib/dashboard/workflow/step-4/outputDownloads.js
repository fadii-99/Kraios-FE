/**
 * Step 4 — Client-side export and ZIP packaging utilities.
 *
 * Provides standalone, zero-dependency CSV generation, single asset downloads,
 * and a standards-compliant PKZIP 2.0 package bundler.
 */

/**
 * Generates an RFC 4180 compliant CSV string from BoQ table rows.
 */
export function generateBoqCsv(rows = []) {
  const headers = ['Item', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).trim()
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return `"${str}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const dataLines = rows.map((r) =>
    [r.item || '', r.description || '', r.qty || '', r.unit || '', r.rate || '—', r.amount || '—']
      .map(escapeCell)
      .join(','),
  )

  return [headerLine, ...dataLines].join('\r\n')
}

/** Forward slash and backslash — `String.fromCharCode(92)` is the latter. */
const PATH_SEPARATORS = ['/', String.fromCharCode(92)]

/**
 * Normalizes a user-supplied name into ONE safe path segment.
 *
 * Document names and project names reach the ZIP builder verbatim, and a ZIP
 * entry path is not a string the archive validates for you: a name containing
 * `/`, `\` or `..` writes a directory structure — or escapes the package
 * folder entirely — when the archive is extracted. Everything outside a
 * conservative set is replaced, and an empty result falls back rather than
 * producing a nameless entry.
 *
 * `keepExtension` preserves a single trailing `.ext` so a sanitized document
 * still opens in the right application.
 */
export function safeFileName(name, { fallback = 'file', keepExtension = true } = {}) {
  const raw = String(name ?? '').trim()

  // Take the last segment: a name that arrived as a path keeps only its leaf.
  // Both separators are listed as plain characters rather than a regex class,
  // so the backslash needs no escaping and cannot be mis-edited into a
  // different pattern later.
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

/** The project name as a lowercase slug — folder names and download filenames. */
export function projectSlug(name, fallback = 'kraios-project') {
  const slug = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || fallback
}

/**
 * Triggers a browser download for a Blob object.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Downloads a text or CSV string as a file.
 */
export function downloadText(content, filename, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}

/**
 * Downloads an asset from a URL (e.g. SVG or image or PDF).
 *
 * Returns TRUE only when the file was fetched and handed to the browser as a
 * blob — the one outcome that is definitely a saved file. A failed fetch still
 * gets the existing best-effort direct link, but that path cannot be verified
 * from here, so it reports FALSE: the caller must not announce a download it
 * cannot confirm happened.
 */
export async function downloadAssetUrl(url, filename) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Fetch failed')
    const blob = await res.blob()
    downloadBlob(blob, filename)
    return true
  } catch {
    // Fallback: direct navigation download
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return false
  }
}

/* ---------------------------------------------------------------------------
   CRC32 & Lightweight Pure-JS ZIP Builder (PKZIP 2.0 Store Mode)
   --------------------------------------------------------------------------- */

let crcTable = null
function getCrcTable() {
  if (crcTable) return crcTable
  crcTable = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crcTable[i] = c
  }
  return crcTable
}

function crc32(bytes) {
  const table = getCrcTable()
  let crc = 0 ^ -1
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

/**
 * Builds a valid standard .zip archive Blob from an array of files.
 * @param {Array<{ path: string, data: Uint8Array | string }>} entries
 * @returns {Blob}
 */
export function buildZipArchive(entries) {
  const encoder = new TextEncoder()
  const fileRecords = []
  let localOffset = 0

  // 1. Local File Headers + File Data
  const localChunks = []

  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.path)
    const dataBytes =
      typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data

    const crc = crc32(dataBytes)
    const size = dataBytes.length
    const fnLen = filenameBytes.length

    // Local file header (30 bytes)
    const localHeader = new Uint8Array(30 + fnLen)
    const view = new DataView(localHeader.buffer)

    view.setUint32(0, 0x04034b50, true) // Local header signature
    view.setUint16(4, 20, true) // Version needed (2.0)
    view.setUint16(6, 0, true) // General purpose bit flag
    view.setUint16(8, 0, true) // Compression method (0 = store)
    view.setUint16(10, 0, true) // File mod time
    view.setUint16(12, 0, true) // File mod date
    view.setUint32(14, crc, true) // CRC-32
    view.setUint32(18, size, true) // Compressed size
    view.setUint32(22, size, true) // Uncompressed size
    view.setUint16(26, fnLen, true) // Filename length
    view.setUint16(28, 0, true) // Extra field length

    localHeader.set(filenameBytes, 30)

    localChunks.push(localHeader)
    localChunks.push(dataBytes)

    fileRecords.push({
      pathBytes: filenameBytes,
      crc,
      size,
      offset: localOffset,
    })

    localOffset += localHeader.length + dataBytes.length
  }

  // 2. Central Directory Entries
  const cdOffset = localOffset
  const cdChunks = []
  let cdSize = 0

  for (const rec of fileRecords) {
    const fnLen = rec.pathBytes.length
    const cdHeader = new Uint8Array(46 + fnLen)
    const view = new DataView(cdHeader.buffer)

    view.setUint32(0, 0x02014b50, true) // Central directory signature
    view.setUint16(4, 20, true) // Version made by
    view.setUint16(6, 20, true) // Version needed
    view.setUint16(8, 0, true) // General purpose bit flag
    view.setUint16(10, 0, true) // Compression method (store)
    view.setUint16(12, 0, true) // Mod time
    view.setUint16(14, 0, true) // Mod date
    view.setUint32(16, rec.crc, true) // CRC-32
    view.setUint32(20, rec.size, true) // Compressed size
    view.setUint32(24, rec.size, true) // Uncompressed size
    view.setUint16(28, fnLen, true) // Filename length
    view.setUint16(30, 0, true) // Extra field length
    view.setUint16(32, 0, true) // File comment length
    view.setUint16(34, 0, true) // Disk number start
    view.setUint16(36, 0, true) // Internal file attributes
    view.setUint32(38, 0, true) // External file attributes
    view.setUint32(42, rec.offset, true) // Relative offset of local header

    cdHeader.set(rec.pathBytes, 46)
    cdChunks.push(cdHeader)
    cdSize += cdHeader.length
  }

  // 3. End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  const numFiles = fileRecords.length

  eocdView.setUint32(0, 0x06054b50, true) // EOCD signature
  eocdView.setUint16(4, 0, true) // Disk number
  eocdView.setUint16(6, 0, true) // Start disk
  eocdView.setUint16(8, numFiles, true) // Number of central dir records on this disk
  eocdView.setUint16(10, numFiles, true) // Total number of central dir records
  eocdView.setUint32(12, cdSize, true) // Size of central directory
  eocdView.setUint32(16, cdOffset, true) // Offset of start of central directory
  eocdView.setUint16(20, 0, true) // ZIP comment length

  return new Blob([...localChunks, ...cdChunks, eocd], { type: 'application/zip' })
}

/**
 * Packages project deliverables into a standard ZIP and triggers download.
 */
export async function downloadProjectPackageZip({
  projectName = 'Kraios-Project',
  plan2DSource,
  render3DSource,
  boqRows = [],
  uploadedDocs = [],
}) {
  const folderName = projectSlug(projectName)
  const entries = []

  /**
   * Fetches an asset, or reports it unavailable.
   *
   * `response.ok` is the whole point: `fetch` resolves for a 404 as happily as
   * for a 200, so without this check the SPA's HTML error body was packaged as
   * the user's floor plan — a file that opens as a broken image inside an
   * otherwise plausible deliverables ZIP. A missing asset is now simply left
   * out of the archive.
   */
  const fetchBytes = async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const buffer = await res.arrayBuffer()
      return new Uint8Array(buffer)
    } catch {
      return null
    }
  }

  // 1. 2D Floor Plan
  const plan2DUrl = plan2DSource?.previewUrl || plan2DSource?.imageUrl || '/assets/plan-2d-primary.svg'
  const plan2DBytes = await fetchBytes(plan2DUrl)
  if (plan2DBytes) {
    const ext = plan2DSource?.extension ? `.${plan2DSource.extension.toLowerCase()}` : '.svg'
    const name = safeFileName(plan2DSource?.name || `2d-floor-plan${ext}`, {
      fallback: '2d-floor-plan',
    })
    entries.push({ path: `${folderName}/${name}`, data: plan2DBytes })
  }

  // 2. Approved 3D Design
  const render3DUrl = render3DSource?.imageUrl || '/assets/plan-3d-light.svg'
  const render3DBytes = await fetchBytes(render3DUrl)
  if (render3DBytes) {
    const ext = render3DSource?.extension ? `.${render3DSource.extension.toLowerCase()}` : '.svg'
    const name = safeFileName(render3DSource?.name || `approved-3d-design${ext}`, {
      fallback: 'approved-3d-design',
    })
    entries.push({ path: `${folderName}/${name}`, data: render3DBytes })
  }

  // 3. Final BoQ CSV
  if (boqRows && boqRows.length > 0) {
    const csvContent = generateBoqCsv(boqRows)
    entries.push({
      path: `${folderName}/boq/${folderName}-boq.csv`,
      data: csvContent,
    })
  }

  // 4. Uploaded Supporting Documents. Names come from the user's filesystem,
  //    so every one of them is normalized before it becomes a ZIP path.
  for (const doc of uploadedDocs) {
    const name = safeFileName(doc.name, { fallback: 'document' })

    if (doc.file) {
      try {
        const buffer = await doc.file.arrayBuffer()
        entries.push({
          path: `${folderName}/documents/${name}`,
          data: new Uint8Array(buffer),
        })
      } catch {
        // Skip on unreadable blob
      }
    } else if (doc.previewUrl || doc.url) {
      const bytes = await fetchBytes(doc.previewUrl || doc.url)
      if (bytes) {
        entries.push({
          path: `${folderName}/documents/${name}`,
          data: bytes,
        })
      }
    }
  }

  // Build and trigger ZIP download
  const zipBlob = buildZipArchive(entries)
  downloadBlob(zipBlob, `${folderName}-deliverables.zip`)
}
