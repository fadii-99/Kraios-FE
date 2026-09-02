/**
 * Step 3 — backend payloads to the BoQ Assistant view model.
 *
 * The awkward part of Step 3 is `structured_data`: the contract allows an
 * object or an array, with either objects-per-row or a `columns` + rows-as-
 * arrays table, and column names in the backend's Title Case. The table
 * component reads `{ item, description, qty, unit, rate, amount }`.
 *
 * Both directions of that translation live here, and only here. `toBoqRows`
 * accepts every shape the contract allows; `toStructuredData` writes the ONE
 * shape a manual version is saved in, so a table edited in the browser goes
 * back as a real immutable version rather than as browser state.
 */

import { assetSrc } from '@/lib/api/files'
import {
  byCreatedAt,
  isVersionCompleted,
  isVersionFailed,
  isVersionPending,
  messageRole,
  pendingJobFromVersions,
  toEpoch,
} from '@/lib/dashboard/workflow/apiShapes'
import {
  BOQ_ASSISTANT_COPY,
  documentTypeByApiValue,
  documentTypeById,
} from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-3/boqAssistantState'

const FAILED_VERSION_MESSAGE =
  'Unable to generate the BoQ. Please check your project inputs and try again.'

/** The column order a manual version is written back in. */
export const BOQ_COLUMNS = ['Item', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']

/**
 * Which backend column name feeds which UI field.
 *
 * Several spellings are accepted for the same field because the contract shows
 * `Quantity` while an AI-produced table may equally say `Qty` — reading both is
 * cheaper than a failed table.
 */
const FIELD_ALIASES = {
  item: ['item', 'item no', 'item_no', 'no', 's/n', 'sr', 'sr no', 'code', 'ref'],
  description: ['description', 'desc', 'work', 'particulars', 'material'],
  qty: ['quantity', 'qty', 'quantities', 'amount of work'],
  unit: ['unit', 'units', 'uom'],
  rate: ['rate', 'unit rate', 'unit_rate', 'price', 'unit price'],
  amount: ['amount', 'total', 'cost', 'total amount', 'total cost'],
}

const normalizeKey = (key) => String(key ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ')

/** One backend row object as a UI row. Unknown columns are simply not shown. */
function rowFromObject(source, index) {
  const lookup = {}
  Object.entries(source ?? {}).forEach(([key, value]) => {
    lookup[normalizeKey(key)] = value
  })

  const pick = (field) => {
    for (const alias of FIELD_ALIASES[field]) {
      const value = lookup[alias]
      if (value !== undefined && value !== null && value !== '') return String(value)
    }
    return ''
  }

  return {
    item: pick('item') || String(index + 1).padStart(2, '0'),
    description: pick('description'),
    qty: pick('qty'),
    unit: pick('unit'),
    rate: pick('rate') || '—',
    amount: pick('amount') || '—',
  }
}

/**
 * Every shape `structured_data` may arrive in, as UI rows.
 *
 * Returns an empty array rather than throwing: a BOQ version whose payload
 * cannot be read is an empty table with an honest zero count, never a crash
 * inside the transcript.
 */
export function toBoqRows(structuredData) {
  if (!structuredData) return []

  // { columns: [...], rows: [[...], ...] } — rows as positional arrays.
  if (!Array.isArray(structuredData) && Array.isArray(structuredData.rows)) {
    const columns = Array.isArray(structuredData.columns) ? structuredData.columns : null

    return structuredData.rows.map((row, index) => {
      if (Array.isArray(row) && columns) {
        const asObject = {}
        columns.forEach((column, i) => {
          asObject[column] = row[i]
        })
        return rowFromObject(asObject, index)
      }
      return rowFromObject(row, index)
    })
  }

  // A bare array of row objects.
  if (Array.isArray(structuredData)) {
    return structuredData.map((row, index) => rowFromObject(row, index))
  }

  // { items: [...] } and similar single-key wrappers.
  const nested = Object.values(structuredData).find((value) => Array.isArray(value))
  if (nested) return nested.map((row, index) => rowFromObject(row, index))

  return []
}

/** UI rows back into the one shape a manual version is saved in. */
export function toStructuredData(rows = []) {
  return {
    columns: BOQ_COLUMNS,
    rows: rows.map((row) => ({
      Item: row.item ?? '',
      Description: row.description ?? '',
      Quantity: row.qty ?? '',
      Unit: row.unit ?? '',
      Rate: row.rate === '—' ? '' : (row.rate ?? ''),
      Amount: row.amount === '—' ? '' : (row.amount ?? ''),
    })),
  }
}

/* ---------------------------------------------------------------------------
   Row editing
   --------------------------------------------------------------------------- */

/** Item numbers are positional: 01, 02, 03 … renumbered after every change. */
function renumber(rows) {
  return rows.map((row, index) => ({ ...row, item: String(index + 1).padStart(2, '0') }))
}

/**
 * The rows a table gains when "Add Row" is pressed.
 *
 * Pure, and deliberately not a reducer case: the result of an edit is a NEW
 * backend version, so this produces the rows and the caller posts them. The
 * row arithmetic is the only part worth keeping from the old in-place edit.
 */
export function withAddedRow(rows = [], row) {
  return renumber([
    ...rows,
    row ?? {
      item: '',
      description: 'New BoQ specification / item',
      qty: '1',
      unit: 'm²',
      rate: '—',
      amount: '—',
    },
  ])
}

/** The rows a table has after one is deleted. */
export function withDeletedRow(rows = [], rowIndex) {
  return renumber(rows.filter((_, index) => index !== rowIndex))
}

/** One `BOQVersion` as a result the transcript and Step 4 can render. */
export function versionToResult(version) {
  if (!version) return null

  const rows = toBoqRows(version.structured_data)

  return {
    id: version.id,
    title: 'Bill of Quantities',
    summary: `${rows.length} Items · Version ${version.version_number ?? '—'}`,
    rows,
    versionNumber: version.version_number ?? null,
    source: version.source,
    status: version.status,
    prompt: '',
    at: toEpoch(version.completed_at || version.created_at),
  }
}

/** Every completed BOQ version, keyed by version id. */
export function resultsFromVersions(versions = []) {
  const results = {}

  byCreatedAt(versions).forEach((version) => {
    if (!isVersionCompleted(version)) return
    results[version.id] = versionToResult(version)
  })

  return results
}

/** The approved BOQ version id — `selected_boq` first, `selected` as fallback. */
export function approvedVersionId(versions = [], project) {
  if (project?.selected_boq) return project.selected_boq
  return versions.find((version) => version?.selected)?.id ?? null
}

/** One `ProjectDocument` in the record shape Step 3 and Step 4 already read. */
export function documentToRecord(document, projectId) {
  if (!document) return null

  const asset = document.asset ?? {}
  const mime = asset.content_type || ''
  const name = asset.original_name || document.title || 'Document'
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  const kind = mime.startsWith('image/')
    ? 'image'
    : mime === 'application/pdf' || extension === 'pdf'
      ? 'pdf'
      : null

  const type = documentTypeByApiValue(document.document_type)

  return {
    id: document.id,
    name,
    title: document.title || name,
    size: asset.size ?? 0,
    mime,
    extension,
    kind,
    typeId: type.id,
    typeLabel: document.document_type_display || type.label,
    documentType: document.document_type,
    assetId: asset.id ?? null,
    // A remote url, so nothing here is a blob this app has to revoke.
    previewUrl: kind ? assetSrc(asset, projectId) : null,
    downloadUrl: assetSrc(asset, projectId),
    ownsPreviewUrl: false,
    file: null,
    addedAt: toEpoch(document.created_at),
  }
}

export function documentsToRecords(documents = [], projectId) {
  return documents.map((document) => documentToRecord(document, projectId)).filter(Boolean)
}

/** The backend enum for one UI document-type id. */
export function documentTypeToApi(id) {
  return documentTypeById(id).apiValue
}

/**
 * Rebuilds the whole Step 3 assistant state.
 *
 * BOQ versions carry `source_message` (an id) rather than a nested prompt
 * message, so the transcript is assembled by matching that id against the
 * conversation — the same "result under its own instruction" ordering Steps 1
 * and 2 get, reached a slightly different way.
 */
export function hydrateBoqState({
  conversation = [],
  versions = [],
  documents = [],
  project,
  projectId,
}) {
  const results = resultsFromVersions(versions)
  const ordered = byCreatedAt(versions)
  const messages = []

  const byMessage = new Map()
  ordered.forEach((version) => {
    const messageId = version.source_message
    if (!messageId) return
    const existing = byMessage.get(messageId)
    if (existing) existing.push(version)
    else byMessage.set(messageId, [version])
  })

  /*
   * A completed version does not get a message of its own.
   *
   * The version and the agent's reply are two halves of ONE answer: the reply
   * is the compiled table the user reads, the version is the same table in
   * structured form. Emitting both as separate transcript entries showed the
   * user two responses for one question. So the version is carried forward and
   * attached to the reply it belongs to — the reply renders, and the version
   * rides along as `resultId`, which is what puts Approve in that message's
   * header.
   */
  let carriedResultId = null

  conversation.forEach((message) => {
    if (message.content) {
      const role = messageRole(message)
      const carries = role === 'assistant' && Boolean(carriedResultId)

      messages.push({
        id: message.id,
        at: toEpoch(message.created_at),
        role,
        kind: carries ? MESSAGE_KINDS.result : MESSAGE_KINDS.text,
        text: message.content,
        resultId: carries ? carriedResultId : undefined,
        serverMessageId: message.id,
      })

      if (carries) carriedResultId = null
    }

    ;(byMessage.get(message.id) ?? []).forEach((version) => {
      if (isVersionPending(version)) {
        messages.push({
          id: `pending-${version.id}`,
          at: toEpoch(version.created_at),
          role: 'assistant',
          kind: MESSAGE_KINDS.pending,
          text: version.job?.message || BOQ_ASSISTANT_COPY.generating,
          versionId: version.id,
          jobId: version.job?.id ?? null,
        })
        return
      }

      if (isVersionFailed(version)) {
        messages.push({
          id: `failed-${version.id}`,
          at: toEpoch(version.created_at),
          role: 'assistant',
          kind: MESSAGE_KINDS.notice,
          text: version.job?.error || FAILED_VERSION_MESSAGE,
          retry: message.content ? { prompt: message.content, pendingText: null } : null,
        })
        return
      }

      if (results[version.id]) {
        carriedResultId = version.id
      }
    })
  })

  /*
   * A version whose reply never arrived still needs somewhere to be approved
   * from, so it falls back to a message of its own. Without this a completed
   * BoQ with no assistant reply would be unapprovable.
   */
  if (carriedResultId) {
    messages.push({
      id: `result-${carriedResultId}`,
      at: results[carriedResultId]?.at ?? Date.now(),
      role: 'assistant',
      kind: MESSAGE_KINDS.result,
      resultId: carriedResultId,
      text: null,
    })
  }

  /*
   * A MANUAL version has no conversation turn — it is a save from the Output
   * table editor, which approves it as it writes. It is deliberately NOT added
   * to the transcript: it would render as an empty assistant bubble per save.
   * `approvedResultId` below still resolves to it, because approval is read
   * from the versions list rather than from the messages.
   */

  const approved = approvedVersionId(versions, project)

  return {
    messages,
    results,
    approvedResultId: approved && results[approved] ? approved : null,
    uploadedDocuments: documentsToRecords(documents, projectId),
    pending: pendingJobFromVersions(versions),
  }
}
