import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CubeTransparent, Trash, WarningCircle } from '@phosphor-icons/react'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import PageLoader from '@/components/ui/PageLoader'
import BimUploader from '@/components/bim/BimUploader'
import { deleteSource, listSources, sourceFileUrl, uploadSource } from '@/lib/api/bim'
import { sourcesToView } from '@/lib/bim/bimAdapters'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { cn } from '@/lib/cn'

// Stable ids so a user clicking Delete on three cards, or retrying a failed
// upload, gets one toast per action rather than a stack of them.
const TOAST_IDS = {
  upload: 'bim-upload',
  delete: 'bim-delete',
}

/**
 * The BIM engine's front door: upload a 2D plan, or open one already uploaded.
 *
 * This page and everything under `components/bim`, `lib/bim` and `lib/api/bim.js`
 * are a removable feature — see `README.md` beside this file.
 *
 * It is a route inside `dashboard`, so it inherits the authenticated boundary,
 * the sidebar and the page surface from `DashboardLayout` rather than
 * re-implementing them. "Separate" here means a separate workspace with its own
 * uploads and its own state, not a second application shell.
 */
export default function BimWorkspace() {
  const navigate = useNavigate()

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [uploading, setUploading] = useState(false)

  // A promise chain rather than an awaited call, matching the pattern the rest
  // of the dashboard uses: every setState lands in a callback, so nothing is
  // set synchronously in the effect body and a late answer to an unmounted page
  // is dropped by the `cancelled` flag rather than warned about.
  useEffect(() => {
    let cancelled = false

    listSources()
      .then((rows) => {
        if (cancelled) return
        setSources(sourcesToView(rows))
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const onUpload = useCallback(
    async (file) => {
      setUploading(true)
      try {
        const created = await uploadSource({ file })
        showSuccessToast('Floor plan uploaded.', { id: TOAST_IDS.upload })
        // Straight into the workspace for the plan just uploaded: the only
        // reason to upload one is to extract from it.
        navigate(`/dashboard/bim/${created.id}`)
      } catch (caught) {
        showErrorToast(caught?.message || 'That floor plan could not be uploaded.', {
          id: TOAST_IDS.upload,
        })
      } finally {
        setUploading(false)
      }
    },
    [navigate],
  )

  const onDelete = useCallback(async (source) => {
    try {
      await deleteSource(source.id)
      setSources((current) => current.filter((row) => row.id !== source.id))
      showSuccessToast('Floor plan deleted.', { id: TOAST_IDS.delete })
    } catch (caught) {
      showErrorToast(caught?.message || 'That floor plan could not be deleted.', {
        id: TOAST_IDS.delete,
      })
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="BIM Engine" title="3D Model Templates" />

      <div className={cn('flex-1 overflow-y-auto py-6 sm:py-8', DASHBOARD_GUTTER)}>
        <div className="mx-auto w-full max-w-[64rem]">
          <p className="mb-5 max-w-2xl text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)]">
            Upload a 2D floor plan and the engine reads it into a structured
            building model — walls, doors, windows, rooms and levels — then
            checks that model against your drawing and tells you what it had to
            assume.
          </p>

          <BimUploader onUpload={onUpload} busy={uploading} />

          <div className="mt-8">
            <h2
              className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--tone-muted-dark)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Your floor plans
            </h2>

            {loading ? (
              <PageLoader variant="inline" label="Loading floor plans" className="min-h-40" />
            ) : failed ? (
              <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-50/70 px-3 py-2.5 text-[0.8125rem] text-amber-900">
                <WarningCircle size={16} weight="fill" aria-hidden="true" className="shrink-0" />
                Your floor plans could not be loaded. Refresh to try again.
              </p>
            ) : sources.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--tone-line-strong)] px-4 py-8 text-center text-[0.8125rem] text-[var(--tone-muted-dark)]">
                Nothing uploaded yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sources.map((source) => (
                  <SourceCard key={source.id} source={source} onDelete={onDelete} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUS_COPY = {
  queued: ['Queued', 'text-[var(--tone-muted-dark)]'],
  processing: ['Extracting…', 'text-[var(--color-brand-deep)]'],
  completed: ['Model ready', 'text-[var(--color-success)]'],
  failed: ['Extraction failed', 'text-[var(--color-danger)]'],
}

function SourceCard({ source, onDelete }) {
  const latest = source.latestExtraction
  const [statusLabel, statusTone] = latest
    ? (STATUS_COPY[latest.status] ?? STATUS_COPY.queued)
    : ['Not extracted yet', 'text-[var(--tone-muted-dark)]']

  return (
    <li className="group relative overflow-hidden rounded-md border border-[var(--tone-line)] bg-white transition-colors hover:border-[var(--tone-line-strong)]">
      <Link to={`/dashboard/bim/${source.id}`} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--color-light)]">
          {source.isPdf ? (
            <div className="flex h-full items-center justify-center">
              <CubeTransparent
                size={40}
                weight="light"
                aria-hidden="true"
                className="text-[var(--tone-muted)]"
              />
            </div>
          ) : (
            <img
              src={sourceFileUrl(source.id)}
              alt={`Floor plan: ${source.name}`}
              loading="lazy"
              className="h-full w-full object-contain p-2"
            />
          )}
        </div>

        <div className="border-t border-[var(--tone-line)] px-3 py-2.5">
          <p className="truncate text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
            {source.name}
          </p>
          <p className={cn('mt-0.5 text-[0.75rem]', statusTone)}>
            {statusLabel}
            {latest?.status === 'completed' && latest.grade
              ? ` · grade ${latest.grade} (${latest.score}/100)`
              : ''}
          </p>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${source.name}`}
        onClick={() => onDelete(source)}
        className={cn(
          'absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-xs',
          'border border-[var(--tone-line-strong)] bg-white/90 text-[var(--tone-muted-dark)] backdrop-blur-[2px]',
          'opacity-0 transition-all duration-200 group-hover:opacity-100 focus-visible:opacity-100',
          'hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500',
        )}
      >
        <Trash size={13} weight="bold" aria-hidden="true" />
      </button>
    </li>
  )
}
