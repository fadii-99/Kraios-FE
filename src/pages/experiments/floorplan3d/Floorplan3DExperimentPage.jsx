import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Flask, Trash, WarningCircle } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import DashboardPageSurface from '@/components/dashboard/DashboardPageSurface'
import ConversionProgress from '@/components/floorplan3d/ConversionProgress'
import PlanUploader from '@/components/floorplan3d/PlanUploader'
import { archiveConversion, listConversions } from '@/lib/api/floorplan3d'
import { conversionToView, formatBytes } from '@/lib/floorplan3d/adapters'
import { useChunkedUpload } from '@/lib/floorplan3d/useChunkedUpload'
import { useConversionPolling } from '@/lib/floorplan3d/useConversionPolling'
import { DASHBOARD_BODY_PADDING, DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { cn } from '@/lib/cn'

/**
 * `/dashboard/experiments/floorplan-3d` — upload a plan, and the list of what
 * has already been converted.
 *
 * A SEPARATE EXPERIMENT LANDING PAGE, not a stage of the project workflow. It
 * has its own uploads, its own state and its own conversions, and it is
 * deliberately not wired into the four-stage workflow or the sidebar — see
 * `README.md` in this directory for the isolation contract.
 *
 * It is a route INSIDE `dashboard`, so it inherits the authenticated boundary,
 * the sidebar and the page surface rather than rebuilding them.
 */

const STATUS_COPY = {
  QUEUED: { label: 'Queued', tone: 'text-[var(--tone-ink-soft)]' },
  PROCESSING: { label: 'Converting', tone: 'text-[var(--color-brand-deep)]' },
  NEEDS_REVIEW: { label: 'Needs review', tone: 'text-[var(--color-warning)]' },
  READY: { label: 'Ready', tone: 'text-[var(--color-success)]' },
  FAILED: { label: 'Failed', tone: 'text-[var(--color-danger)]' },
}

export default function Floorplan3DExperimentPage() {
  const navigate = useNavigate()
  const [conversions, setConversions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Which conversion the poller is following. A REF, not state: nothing renders
  // differently because of it, and as state it would need either an effect to
  // act on (a cascading render) or a dependency that restarts the poll.
  const trackedId = useRef(null)
  // `refresh` reaches the poller through a ref, because the poller is created
  // below it and a `useCallback` cannot close over something that does not
  // exist yet.
  const pollingRef = useRef(null)

  const upload = useChunkedUpload()

  /**
   * Load the list, and pick up anything already running.
   *
   * The follow-what-is-running decision is made HERE rather than in an effect
   * watching the list. A user who uploaded a plan, navigated away and came back
   * must see it still converting rather than a stale "Queued" row - and the
   * moment the list arrives is the moment that is known. An effect that reacted
   * to the list would be a setState cascade for something that is not rendered.
   */
  const refresh = useCallback(
    () =>
      // A PROMISE CHAIN, not `async`/`await`. Every `setState` here happens in a
      // promise callback rather than in the body of whatever called it, which
      // is what lets an effect call this without a synchronous state update -
      // the pattern `Subscription.jsx` already uses for the same reason.
      listConversions()
        .then((rows) => {
          const views = rows.map(conversionToView)
          setConversions(views)
          setLoadError('')

          const running = views.find((row) => row.isRunning)
          if (running && trackedId.current !== running.id) {
            trackedId.current = running.id
            pollingRef.current?.track(running.id)
          }
          if (!running) trackedId.current = null
        })
        .catch((caught) => {
          setLoadError(caught?.message || 'The conversion list could not be loaded.')
        })
        .finally(() => {
          setLoading(false)
        }),
    [],
  )

  const polling = useConversionPolling({
    onFinished: useCallback(
      (progress) => {
        refresh()
        if (progress.isFailed) {
          toast.error(progress.errorMessage || 'That plan could not be converted.')
          return
        }
        toast.success(
          progress.status === 'NEEDS_REVIEW'
            ? 'Model ready, with items to review.'
            : 'Model ready.',
        )
        navigate(`/dashboard/experiments/floorplan-3d/${progress.id}`)
      },
      [navigate, refresh],
    ),
  })

  useEffect(() => {
    pollingRef.current = polling
  }, [polling])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleUpload = useCallback(
    async (file) => {
      const result = await upload.upload(file)
      if (!result) return
      await refresh()
      const conversionId = result.conversion?.id
      if (conversionId) {
        trackedId.current = conversionId
        polling.track(conversionId)
        toast.success('Uploaded. Reading the drawing…')
      } else {
        toast.success('Uploaded.')
      }
      upload.reset()
    },
    [upload, refresh, polling],
  )

  const handleArchive = useCallback(
    async (conversion) => {
      try {
        await archiveConversion(conversion.id)
        setConversions((current) => current.filter((row) => row.id !== conversion.id))
        toast.success('Removed from your list. The plan and its revisions are kept.')
      } catch (caught) {
        toast.error(caught?.message || 'That conversion could not be removed.')
      }
    },
    [],
  )

  const running = useMemo(
    () => conversions.filter((row) => row.isRunning),
    [conversions],
  )
  const finished = useMemo(
    () => conversions.filter((row) => !row.isRunning),
    [conversions],
  )

  return (
    <DashboardPageSurface>
      <DashboardPageHeader eyebrow="Experiment" title="Floor plan to 3D building">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[0.6875rem] font-medium text-[var(--tone-ink-soft)]">
          <Flask size={13} />
          Experimental
        </span>
      </DashboardPageHeader>

      <div className={cn('min-h-0 flex-1 overflow-y-auto', DASHBOARD_GUTTER, DASHBOARD_BODY_PADDING)}>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* The honest framing, first. This is a recognition pipeline with a
              review step, and saying so up front is better than a user
              discovering it from a flagged wall. */}
          <section className="rounded-md border border-[var(--tone-line)] bg-white p-4">
            <h2 className="text-sm font-medium text-[var(--tone-ink)]">
              What this does, and what it does not
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--tone-ink-soft)]">
              A plan is read into structured architectural data — walls, rooms,
              doors, windows, stairs, columns and furniture — which is then built
              into an editable 3D model in your browser and into Blender files you
              can download. High-confidence elements are automated; anything the
              engine could not decide is flagged for you to confirm or correct.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--tone-ink-soft)]">
              Plans without a printed scale, with handwriting, or with demolition
              and construction shown together will need more of that correction.
              The scale can be calibrated by clicking two points on your drawing.
            </p>
          </section>

          <PlanUploader
            onUpload={handleUpload}
            onCancel={upload.cancel}
            phase={upload.phase}
            progress={upload.progress}
            error={upload.error}
            filename={upload.filename}
            busy={upload.busy}
          />

          {polling.progress && (
            <ConversionProgress
              progress={polling.progress}
              stalled={polling.stalled}
              error={polling.error}
            />
          )}

          {loadError && (
            <p className="inline-flex items-start gap-1.5 rounded-md border border-[var(--color-danger)] bg-[color-mix(in_oklab,var(--color-danger)_6%,transparent)] p-3 text-xs text-[var(--tone-ink)]">
              <WarningCircle size={14} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
              {loadError}
            </p>
          )}

          <section>
            <h2 className="label-ui mb-2 text-[var(--tone-ink-soft)]">
              Recent conversions
            </h2>

            {loading ? (
              <p className="text-xs text-[var(--tone-ink-soft)]">Loading…</p>
            ) : conversions.length === 0 ? (
              <p className="rounded-md border border-[var(--tone-line)] bg-white p-4 text-xs text-[var(--tone-ink-soft)]">
                Nothing converted yet. Upload a plan above.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...running, ...finished].map((conversion) => {
                  const status = STATUS_COPY[conversion.status] ?? STATUS_COPY.QUEUED
                  return (
                    <li
                      key={conversion.id}
                      className="flex items-center gap-3 rounded-md border border-[var(--tone-line)] bg-white p-3"
                    >
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-sm border border-[var(--tone-line)] bg-[var(--color-light)]">
                        {conversion.thumbnailUrl ? (
                          <img
                            src={conversion.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--tone-ink)]">
                          {conversion.name}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-[var(--tone-ink-soft)]">
                          <span className={status.tone}>{status.label}</span>
                          {conversion.isRunning && <span>· {conversion.progress}%</span>}
                          {conversion.currentRevision && (
                            <span>
                              · r{conversion.currentRevision.number} ·{' '}
                              {conversion.currentRevision.grade}{' '}
                              {conversion.currentRevision.score}/100
                            </span>
                          )}
                          {conversion.source && (
                            <span>· {formatBytes(conversion.source.byteSize)}</span>
                          )}
                          {conversion.source?.pageCount > 1 && (
                            <span>· {conversion.source.pageCount} pages</span>
                          )}
                        </p>
                        {conversion.isFailed && conversion.errorMessage && (
                          <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--color-danger)]">
                            {conversion.errorMessage}
                            {conversion.errorCode && (
                              <span className="ml-1 font-mono text-[var(--tone-ink-soft)]">
                                ({conversion.errorCode})
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {conversion.isUsable && (
                          <Link
                            to={`/dashboard/experiments/floorplan-3d/${conversion.id}`}
                            className="label-ui inline-flex h-9 items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-3 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
                          >
                            Open
                            <ArrowRight size={13} />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleArchive(conversion)}
                          aria-label={`Remove ${conversion.name} from the list`}
                          className="cursor-pointer rounded-sm p-2 text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--color-danger)]"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </DashboardPageSurface>
  )
}
