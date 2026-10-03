import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flask, WarningCircle } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import DashboardPageSurface from '@/components/dashboard/DashboardPageSurface'
import ConversionProgress from '@/components/floorplan3d/ConversionProgress'
import ConversionRow from '@/components/floorplan3d/ConversionRow'
import PlanUploader from '@/components/floorplan3d/PlanUploader'
import { archiveConversion, cancelConversion, listConversions } from '@/lib/api/floorplan3d'
import { conversionToView } from '@/lib/floorplan3d/adapters'
import { useChunkedUpload } from '@/lib/floorplan3d/useChunkedUpload'
import { useConversionPolling } from '@/lib/floorplan3d/useConversionPolling'
import { DASHBOARD_BODY_PADDING, DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { cn } from '@/lib/cn'
import { showErrorToast, showInfoToast } from '@/lib/toast'

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
        // Stopped by the user: `handleStop` has already said so, and there is
        // no model to open.
        if (progress.isCancelled) return
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

  // Which conversion a stop request is in flight for, so its buttons can show
  // it and refuse a second press.
  const [stoppingId, setStoppingId] = useState(null)

  /**
   * Stop a running conversion on the server. The worker is terminated and any
   * late result is discarded, so the row settles as "Stopped" and the plan can
   * simply be converted again.
   */
  const handleStop = useCallback(
    async (conversionId) => {
      if (!conversionId || stoppingId) return
      setStoppingId(conversionId)
      try {
        const result = await cancelConversion(conversionId)
        if (trackedId.current === conversionId) {
          trackedId.current = null
          polling.reset()
        }
        await refresh()
        if (result?.stopped) {
          showInfoToast('Conversion stopped. Nothing was saved.', {
            id: `fp3d-stop-${conversionId}`,
          })
        }
      } catch (caught) {
        showErrorToast(caught?.message || 'That conversion could not be stopped.', {
          id: `fp3d-stop-${conversionId}`,
        })
      } finally {
        setStoppingId(null)
      }
    },
    [polling, refresh, stoppingId],
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
              onStop={() => handleStop(polling.progress.id)}
              stopping={stoppingId === polling.progress.id}
            />
          )}

          {loadError && (
            <p className="inline-flex items-start gap-1.5 rounded-md border border-[var(--color-danger)] bg-[color-mix(in_oklab,var(--color-danger)_6%,transparent)] p-3 text-xs text-[var(--tone-ink)]">
              <WarningCircle size={14} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
              {loadError}
            </p>
          )}

          <section>
            <h2 className="label-ui mb-2 flex items-baseline gap-2 text-[var(--tone-ink-soft)]">
              Recent conversions
              {!loading && conversions.length > 0 && (
                <span className="font-normal tabular-nums text-[var(--tone-ink-soft)]">
                  {conversions.length}
                </span>
              )}
            </h2>

            {loading ? (
              <ul className="space-y-2" aria-busy="true" aria-label="Loading conversions">
                {[0, 1, 2].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-md border border-[var(--tone-line)] bg-white p-3 sm:gap-4"
                  >
                    <div className="h-16 w-24 shrink-0 animate-pulse rounded-sm bg-[var(--color-light)] motion-reduce:animate-none sm:h-[4.5rem] sm:w-28" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 animate-pulse rounded-sm bg-[var(--color-light)] motion-reduce:animate-none" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded-sm bg-[var(--color-light)] motion-reduce:animate-none" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : conversions.length === 0 ? (
              <p className="rounded-md border border-[var(--tone-line)] bg-white p-4 text-xs text-[var(--tone-ink-soft)]">
                Nothing converted yet. Upload a plan above.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...running, ...finished].map((conversion) => (
                  <ConversionRow
                    key={conversion.id}
                    conversion={conversion}
                    onStop={() => handleStop(conversion.id)}
                    onArchive={() => handleArchive(conversion)}
                    stopping={stoppingId === conversion.id}
                    stopDisabled={Boolean(stoppingId)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </DashboardPageSurface>
  )
}
