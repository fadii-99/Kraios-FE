import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowClockwise, ArrowLeft, CubeTransparent, WarningCircle } from '@phosphor-icons/react'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import PageLoader from '@/components/ui/PageLoader'
import PrimaryButton from '@/components/ui/PrimaryButton'
import BimDetailsPanel from '@/components/bim/BimDetailsPanel'
import BimDrawingPanel from '@/components/bim/BimDrawingPanel'
import BimModelWorkspace from '@/components/bim/BimModelWorkspace'
import { getSource, listExtractions } from '@/lib/api/bim'
import { extractionsToView, planFactsToView, sourceToView } from '@/lib/bim/bimAdapters'
import { useExtractionPolling } from '@/lib/bim/useExtractionPolling'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { cn } from '@/lib/cn'

// One id: Build model and Run again are the same action, and a user who clicks
// twice should see one toast.
const TOAST_IDS = { extract: 'bim-extract' }

/**
 * One floor plan: the drawing, the model built from it, and the verdict.
 *
 * THE PAGE DOES NOT SCROLL. It is two regions that divide the content area
 * between them — the drawing and the model on top, the details below — and each
 * scrolls internally. A scrolling page put the model, which is the subject and
 * the only thing here that needs room, wherever the reader happened to have
 * scrolled to.
 *
 * EXPANDING THE MODEL HIDES ITS SIBLINGS; it does not go `fixed`. A fixed
 * overlay escaped the dashboard shell and covered the sidebar, which is not
 * what "full screen" means inside an application. Hiding the drawing and the
 * details lets the model fill the content area exactly, with the navigation
 * still there.
 *
 * The page holds no plan state of its own: `useExtractionPolling` owns the
 * extraction and the plan is read out of it, so there is nothing to keep in
 * sync.
 */
export default function BimPlanPage() {
  const { sourceId } = useParams()

  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { extraction, start, track, starting, running, stalled, error } =
    useExtractionPolling()

  useEffect(() => {
    let cancelled = false

    Promise.all([getSource(sourceId), listExtractions(sourceId)])
      .then(([loadedSource, history]) => {
        if (cancelled) return
        setSource(sourceToView(loadedSource))
        // Resume whatever the newest run is. Reloading the page during an
        // extraction must pick the progress back up, not look like nothing
        // ever happened.
        const runs = extractionsToView(history)
        if (runs.length > 0) track(runs[0])
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
  }, [sourceId, track])

  // The adapter already nulls both unless the run completed, so there is no
  // status test here to keep in step with it.
  const plan = extraction?.plan ?? null
  const quality = extraction?.quality ?? null
  const facts = useMemo(() => planFactsToView(plan), [plan])

  const onExtract = useCallback(async () => {
    const created = await start(sourceId)
    if (created) {
      showSuccessToast('Building the model…', { id: TOAST_IDS.extract })
    } else {
      showErrorToast('The extraction could not be started.', { id: TOAST_IDS.extract })
    }
  }, [sourceId, start])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader variant="inline" label="Loading floor plan" />
      </div>
    )
  }

  if (failed || !source) {
    return (
      <div className={cn('py-10', DASHBOARD_GUTTER)}>
        <p className="flex items-center gap-2 text-[0.875rem] text-amber-900">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          This floor plan could not be loaded.
        </p>
        <Link
          to="/dashboard/bim"
          className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-brand-deep)]"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden="true" />
          Back to floor plans
        </Link>
      </div>
    )
  }

  const notices = [
    stalled && {
      tone: 'warning',
      text: 'This extraction has not reported back for several minutes. It may have stopped — run it again.',
    },
    error && !running && { tone: 'warning', text: error },
    extraction?.hasFailed && { tone: 'danger', text: extraction.error },
  ].filter(Boolean)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="BIM Engine" title={source.name}>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard/bim"
            className="inline-flex items-center gap-1.5 rounded-xs border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[0.75rem] font-semibold text-[var(--tone-ink)] hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]"
          >
            <ArrowLeft size={13} weight="bold" aria-hidden="true" />
            All plans
          </Link>
          <PrimaryButton
            type="button"
            size="compact"
            withArrow={false}
            loading={starting || running}
            loadingLabel={running ? 'Extracting' : 'Starting'}
            disabled={starting || running}
            onClick={onExtract}
          >
            {extraction ? 'Run again' : 'Build model'}
          </PrimaryButton>
        </div>
      </DashboardPageHeader>

      {/* Below `lg` the two regions stop being a fixed split and the body
          scrolls instead — a 38%-tall details panel on a phone is four rows. */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3 lg:overflow-hidden lg:py-4',
          DASHBOARD_GUTTER,
        )}
      >
        {notices.length > 0 && !expanded && (
          <div className="flex shrink-0 flex-col gap-2">
            {notices.map((notice, index) => (
              <Notice key={index} tone={notice.tone}>
                {notice.text}
              </Notice>
            ))}
          </div>
        )}

        {running && !expanded && <ProgressBar extraction={extraction} />}

        {/* TOP — the drawing, then the model. */}
        <div className="flex shrink-0 flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row">
          {!expanded && (
            <BimDrawingPanel
              source={source}
              className="h-56 shrink-0 lg:h-auto lg:w-56 xl:w-72"
            />
          )}

          {plan ? (
            <BimModelWorkspace
              plan={plan}
              quality={quality}
              expanded={expanded}
              onToggleExpanded={() => setExpanded((current) => !current)}
              className="h-[28rem] lg:h-auto lg:min-w-0 lg:flex-1"
            />
          ) : (
            <EmptyModel
              running={running}
              stalled={stalled}
              extraction={extraction}
              className="h-[28rem] lg:h-auto lg:min-w-0 lg:flex-1"
            />
          )}
        </div>

        {/* BOTTOM — everything else. */}
        {!expanded &&
          (plan ? (
            <BimDetailsPanel
              facts={facts}
              quality={quality}
              plan={plan}
              filename={`${source.name.replace(/\.[^.]+$/, '')}-plan.json`}
              className="shrink-0 lg:h-[38%] lg:min-h-[14rem]"
            />
          ) : (
            <p className="shrink-0 rounded-md border border-dashed border-[var(--tone-line-strong)] px-4 py-5 text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
              No model has been built from this drawing yet. Building one takes
              about a minute: the engine reads the drawing, traces it, checks the
              result against your image, and retries on its own if the first pass
              is not good enough.
            </p>
          ))}
      </div>
    </div>
  )
}

function EmptyModel({ running, stalled, extraction, className }) {
  const failed = Boolean(extraction?.hasFailed)
  const Icon = running ? ArrowClockwise : CubeTransparent

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--tone-line-strong)] bg-[var(--color-light)] px-6 text-center',
        className,
      )}
    >
      <Icon
        size={30}
        weight="light"
        aria-hidden="true"
        className={cn(
          'text-[var(--tone-muted)]',
          running && 'animate-spin motion-reduce:animate-none',
        )}
      />
      <p className="text-[0.8125rem] text-[var(--tone-muted-dark)]">
        {running
          ? extraction?.message || 'Building the model…'
          : stalled
            ? 'The extraction stopped responding.'
            : failed
              ? 'No model was produced.'
              : 'No model yet.'}
      </p>
    </div>
  )
}

function ProgressBar({ extraction }) {
  const percent = Math.min(100, Math.max(0, extraction?.progress ?? 0))

  return (
    <div className="shrink-0">
      <div
        className="h-1.5 w-full overflow-hidden rounded-xs bg-[var(--color-light)]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Extraction progress"
      >
        <div
          className="h-full rounded-xs bg-[var(--color-brand-deep)] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-[0.75rem] text-[var(--tone-muted-dark)]" aria-live="polite">
        {extraction?.message || 'Working…'}
      </p>
    </div>
  )
}

const NOTICE_TONE = {
  warning: 'border-amber-500/40 bg-amber-50/70 text-amber-900',
  danger: 'border-rose-500/40 bg-rose-50/70 text-rose-900',
}

function Notice({ tone, children }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-[0.8125rem] leading-relaxed',
        NOTICE_TONE[tone] ?? NOTICE_TONE.warning,
      )}
    >
      <WarningCircle size={15} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
