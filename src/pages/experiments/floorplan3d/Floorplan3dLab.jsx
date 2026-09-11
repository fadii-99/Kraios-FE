import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CubeTransparent, Flask, Trash, WarningCircle } from '@phosphor-icons/react'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import PageLoader from '@/components/ui/PageLoader'
import Fp3dUploader from '@/components/experiments/floorplan3d/Fp3dUploader'
import {
  deleteSource,
  getCapabilities,
  listSources,
  sourceFileUrl,
  uploadSource,
} from '@/lib/api/floorplan3d'
import {
  capabilitiesToView,
  formatFileSize,
  sourcesToView,
} from '@/lib/experiments/floorplan3d/adapters'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * `/dashboard/experiments/floorplan-3d` — the Lab's front door.
 *
 * Upload a plan, or open one already uploaded. A route INSIDE `dashboard`, so
 * it inherits the authenticated boundary, the sidebar and the page surface
 * from `DashboardLayout` rather than re-implementing them.
 *
 * NOT IN THE SIDEBAR. This is an experiment reachable by direct URL only, and
 * the page says so at the top rather than pretending to be a finished feature.
 *
 * This page and everything under `components/experiments/floorplan3d`,
 * `lib/experiments/floorplan3d` and `lib/api/floorplan3d.js` are a removable
 * feature — see `README.md` beside this file.
 */

// Stable ids so a user deleting three plans, or retrying a failed upload, gets
// one toast per action rather than a stack of them.
const TOAST_IDS = {
  upload: 'fp3d-upload',
  delete: 'fp3d-delete',
  load: 'fp3d-load',
}

export default function Floorplan3dLab() {
  const navigate = useNavigate()

  const [sources, setSources] = useState([])
  const [capabilities, setCapabilities] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)

  // A promise chain rather than an awaited call, matching the pattern the rest
  // of the dashboard uses: every setState lands in a callback, so nothing is
  // set synchronously in the effect body and a late answer to an unmounted
  // page is dropped by the `cancelled` flag rather than warned about.
  useEffect(() => {
    let cancelled = false

    Promise.all([listSources(), getCapabilities()])
      .then(([rows, capability]) => {
        if (cancelled) return
        setSources(sourcesToView(rows))
        setCapabilities(capabilitiesToView(capability))
        setFailure('')
      })
      .catch((caught) => {
        if (cancelled) return
        setFailure(
          caught?.status === 503
            ? 'The Floor Plan 3D Lab is not enabled on this deployment. '
              + 'Set FLOORPLAN3D_ENABLED=true on the backend to switch it on.'
            : caught?.message || 'The Lab could not be loaded.',
        )
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
      setUploadProgress(0)
      try {
        // Chunked whatever the size. The server decides the chunk size, because
        // the limit it is sized against is the deployed proxy's and not
        // anything the browser can see.
        const created = await uploadSource({
          file,
          onProgress: (fraction) => setUploadProgress(fraction),
        })
        showSuccessToast('Floor plan uploaded.', { id: TOAST_IDS.upload })
        // Straight into the workspace: the only reason to upload one is to
        // convert it.
        navigate(`/dashboard/experiments/floorplan-3d/${created.id}`)
      } catch (caught) {
        showErrorToast(
          caught?.message || 'That floor plan could not be uploaded.',
          { id: TOAST_IDS.upload },
        )
      } finally {
        setUploading(false)
        setUploadProgress(null)
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
      showErrorToast(
        caught?.message || 'That floor plan could not be deleted.',
        { id: TOAST_IDS.delete },
      )
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="Experiment" title="Floor Plan 3D Lab" />

      <div className={cn('flex-1 overflow-y-auto py-6 sm:py-8', DASHBOARD_GUTTER)}>
        <div className="mx-auto w-full max-w-[68rem]">
          <p
            className={cn(
              'mb-5 flex items-start gap-2 rounded-md border px-3 py-2.5',
              'border-[var(--tone-line-strong)] bg-[var(--color-light)]',
              'text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]',
            )}
          >
            <Flask
              size={16}
              weight="fill"
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--color-brand-deep)]"
            />
            <span>
              An experiment, separate from your projects. Upload a 2D floor plan
              and it becomes an editable 3D model — walls, rooms, doors,
              windows, structure, fixtures and furniture — which you can correct,
              edit in ordinary words, and export. Nothing here touches a project.
            </span>
          </p>

          {loading ? (
            <PageLoader variant="inline" label="Loading the Lab" className="min-h-64" />
          ) : failure ? (
            <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/70 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-amber-900">
              <WarningCircle
                size={16}
                weight="fill"
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              {failure}
            </p>
          ) : (
            <>
              <Fp3dUploader
                onUpload={onUpload}
                busy={uploading}
                progress={uploadProgress}
                limits={capabilities?.limits}
              />

              {capabilities && !capabilities.skpAvailable && (
                <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
                  Exports available here: JSON, GLB, glTF, OBJ and COLLADA
                  (.dae). Native SketchUp (.skp) is not — {capabilities.skpReason}{' '}
                  Import the .dae into SketchUp instead.
                </p>
              )}

              <div className="mt-8">
                <h2
                  className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--tone-muted-dark)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Your floor plans
                </h2>

                {sources.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--tone-line-strong)] px-4 py-8 text-center text-[0.8125rem] text-[var(--tone-muted-dark)]">
                    Nothing uploaded yet.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        onDelete={onDelete}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const STATUS_COPY = {
  queued: ['Queued', 'text-[var(--tone-muted-dark)]'],
  processing: ['Converting…', 'text-[var(--color-brand-deep)]'],
  completed: ['Model ready', 'text-[var(--color-success)]'],
  failed: ['Conversion failed', 'text-[var(--color-danger)]'],
  cancelled: ['Cancelled', 'text-[var(--tone-muted-dark)]'],
}

function SourceCard({ source, onDelete }) {
  const latest = source.latestConversion
  const [statusLabel, statusTone] = latest
    ? (STATUS_COPY[latest.status] ?? STATUS_COPY.queued)
    : ['Not converted yet', 'text-[var(--tone-muted-dark)]']

  return (
    <li className="group relative overflow-hidden rounded-md border border-[var(--tone-line)] bg-white transition-colors hover:border-[var(--tone-line-strong)]">
      <Link to={`/dashboard/experiments/floorplan-3d/${source.id}`} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--color-light)]">
          {source.isPdf || source.isDxf ? (
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <CubeTransparent
                size={36}
                weight="light"
                aria-hidden="true"
                className="text-[var(--tone-muted)]"
              />
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--tone-muted-dark)]">
                {source.kind}
              </span>
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
          <p className="mt-0.5 text-[0.6875rem] text-[var(--tone-muted-dark)]">
            {formatFileSize(source.size)}
            {source.pageCount > 1 && ` · ${source.pageCount} pages`}
          </p>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${source.name}`}
        onClick={() => onDelete(source)}
        className={cn(
          'absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-xs',
          'border border-[var(--tone-line-strong)] bg-white/90 text-[var(--tone-muted-dark)]',
          'opacity-0 backdrop-blur-[2px] transition-all duration-200',
          'group-hover:opacity-100 focus-visible:opacity-100',
          'hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500',
        )}
      >
        <Trash size={13} weight="bold" aria-hidden="true" />
      </button>
    </li>
  )
}
