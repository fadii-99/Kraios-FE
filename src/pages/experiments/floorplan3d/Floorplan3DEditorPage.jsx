import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsIn,
  ArrowsOut,
  CaretLeft,
  CaretRight,
  FloppyDisk,
  Image as ImageIcon,
  SlidersHorizontal,
  WarningCircle,
} from '@phosphor-icons/react'
import toast from 'react-hot-toast'

import DownloadMenu from '@/components/floorplan3d/DownloadMenu'
import PlanOverlay from '@/components/floorplan3d/PlanOverlay'
import PropertyInspector from '@/components/floorplan3d/PropertyInspector'
import ReviewPanel from '@/components/floorplan3d/ReviewPanel'
import ScaleCalibrationModal from '@/components/floorplan3d/ScaleCalibrationModal'
import SceneViewport from '@/components/floorplan3d/SceneViewport'
import ViewportToolbar from '@/components/floorplan3d/ViewportToolbar'
import {
  calibrateScale,
  getAssetCatalog,
  getConversion,
  regenerateArtifacts,
  saveRevision,
} from '@/lib/api/floorplan3d'
import { conversionToView, formatMetres, reviewToView } from '@/lib/floorplan3d/adapters'
import * as commands from '@/lib/floorplan3d/editCommands'
import {
  applyCommand,
  changeSummary,
  createHistory,
  markSaved,
  redo,
  undo,
} from '@/lib/floorplan3d/editCommands'
import { indexCatalog } from '@/lib/floorplan3d/furniture'
import {
  assumedElementIds,
  documentBounds,
  levels as documentLevels,
} from '@/lib/floorplan3d/semanticModel'
import { useConversionPolling } from '@/lib/floorplan3d/useConversionPolling'
import { cn } from '@/lib/cn'

/**
 * `/dashboard/experiments/floorplan-3d/:conversionId` — the editor.
 *
 * THE LAYOUT DOES NOT SCROLL. It is two regions dividing the content area: the
 * viewport, and a collapsible right panel that switches between the property
 * inspector and the review lists. The panel scrolls internally. A scrolling
 * page would put the model — the subject, and the only thing here that needs
 * room — wherever the reader happened to have scrolled to.
 *
 * THE MODEL GETS THE WIDTH. There was a third region, a left-hand tree listing
 * every wall, door and window in the building. It answered a question nobody
 * standing in front of their own floor plan asks — the model IS the list, and
 * clicking a wall is a faster way to reach it than finding its row. It cost the
 * viewport a quarter of the frame to do it, so it is gone; selection happens in
 * the viewport, and the Properties panel says what was selected.
 *
 * "EXPANDED" HIDES THE PANEL; IT DOES NOT GO `fixed`. A fixed overlay escapes
 * the dashboard shell and covers the sidebar, which is not what full screen
 * means inside an application. Collapsing the panel lets the viewport fill the
 * content area with the navigation still there.
 *
 * THE DOCUMENT IS THE STATE. `history.present` is the whole building, and every
 * edit produces a new one through a command. The viewport rebuilds from it and
 * the inspector reads it. There is no second copy of the geometry anywhere,
 * which is why undo, save and regenerate all mean the same thing.
 *
 * SAVING IS EXPLICIT, AND THE SERVER'S ANSWER WINS. `POST revisions/` re-runs
 * the same deterministic repair the pipeline runs, so the response can differ
 * slightly from what was sent. The returned document is adopted, and the
 * warnings are shown — otherwise the editor and the database diverge silently.
 */

const COMMAND_MAP = {
  moveFurniture: commands.moveFurniture,
  setFurniturePosition: commands.setFurniturePosition,
  rotateFurniture: commands.rotateFurniture,
  scaleFurniture: commands.scaleFurniture,
  setFurnitureAsset: commands.setFurnitureAsset,
  setElementColor: commands.setElementColor,
  setElementMaterial: commands.setElementMaterial,
  duplicateFurniture: commands.duplicateFurniture,
  addFurniture: commands.addFurniture,
  setWallEndpoint: commands.setWallEndpoint,
  setWallDimensions: commands.setWallDimensions,
  addWall: commands.addWall,
  deleteElement: commands.deleteElement,
  addOpening: commands.addOpening,
  setOpeningPlacement: commands.setOpeningPlacement,
  setOpeningDimensions: commands.setOpeningDimensions,
  setRoomProperties: commands.setRoomProperties,
  setLevelProperties: commands.setLevelProperties,
  setLevelWallHeight: commands.setLevelWallHeight,
  setColumnProperties: commands.setColumnProperties,
  setStairProperties: commands.setStairProperties,
  setSlabOutline: commands.setSlabOutline,
  confirmElement: commands.confirmElement,
}

export default function Floorplan3DEditorPage() {
  const { conversionId } = useParams()

  const [conversion, setConversion] = useState(null)
  const [history, setHistory] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [showCalibration, setShowCalibration] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [isolatedLevelId, setIsolatedLevelId] = useState(null)
  const [view, setView] = useState('iso')
  const [projection, setProjection] = useState('orthographic')
  const [quality, setQuality] = useState('high')
  const [axesVisible, setAxesVisible] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [measurement, setMeasurement] = useState(null)
  const [rightOpen, setRightOpen] = useState(true)
  const [rightTab, setRightTab] = useState('review')
  const [planMode, setPlanMode] = useState('off')

  const sceneRef = useRef(null)

  /**
   * Load the conversion and the furniture catalogue together.
   *
   * A promise chain rather than `async`/`await` so every `setState` happens in a
   * callback rather than in the body of the effect — the pattern
   * `Subscription.jsx` uses, and what `react-hooks/set-state-in-effect` asks for.
   */
  const load = useCallback(
    () =>
      Promise.all([getConversion(conversionId), getAssetCatalog()])
        .then(([row, catalogPayload]) => {
          const view = conversionToView(row)
          setConversion(view)
          setCatalog({ payload: catalogPayload, index: indexCatalog(catalogPayload) })
          setHistory(
            view.currentRevision?.document
              ? createHistory(view.currentRevision.document)
              : null,
          )
          setLoadError('')
        })
        .catch((caught) => {
          setLoadError(caught?.message || 'This conversion could not be loaded.')
        }),
    [conversionId],
  )

  /**
   * Whether a Blender rebuild this page STARTED is still being waited on.
   *
   * A ref rather than a dependency of the callbacks below: those are held by
   * the poller for the life of the watch, and rebuilding them on every state
   * change is how a watch loses the handler that was supposed to end it.
   */
  const rebuildingRef = useRef(false)

  const polling = useConversionPolling({
    /**
     * The watch ended. SAY WHAT HAPPENED.
     *
     * This used to reload and clear a flag, silently — which is most of why a
     * rebuild was impossible to follow: it announced its start with a toast and
     * then never mentioned itself again, whether it succeeded, failed or never
     * ran. A failed Blender run is NOT a failed conversion (the model on screen
     * is untouched), so it is reported as what it is: the downloads are stale
     * and the building is fine.
     */
    onFinished: useCallback(
      (finished) => {
        load().then(() => {
          if (!rebuildingRef.current) return
          rebuildingRef.current = false
          setRegenerating(false)
          if (finished?.blenderFailed) {
            toast.error(
              finished.errorMessage ||
                'Blender could not rebuild the files. The model on screen is unaffected.',
            )
            return
          }
          toast.success('The downloads now match the revision you are viewing.')
        })
      },
      [load],
    ),
    onStalled: useCallback(() => {
      if (!rebuildingRef.current) return
      rebuildingRef.current = false
      setRegenerating(false)
      toast.error(
        'We lost track of the rebuild. The model is fine — try the rebuild again.',
      )
    }, []),
  })

  useEffect(() => {
    load()
  }, [load])

  const document = history?.present ?? null

  const review = useMemo(() => (document ? reviewToView(document) : null), [document])
  const assumedCount = useMemo(
    () => (document ? assumedElementIds(document).size : 0),
    [document],
  )
  const levels = useMemo(
    () =>
      documentLevels(document).map((level) => ({ id: level.id, name: level.name })),
    [document],
  )
  const canEdit = Boolean(document) && !conversion?.isRunning

  // ------------------------------------------------------------------
  // Commands
  // ------------------------------------------------------------------
  const run = useCallback((name, payload) => {
    const command = COMMAND_MAP[name]
    if (!command) return
    setHistory((current) => {
      if (!current) return current
      const result = applyCommand(current, command, payload)
      if (result.newElementId) setSelectedId(result.newElementId)
      return result.history
    })
  }, [])

  const handleDelete = useCallback(
    (elementId) => {
      run('deleteElement', { elementId })
      setSelectedId(null)
    },
    [run],
  )

  const handleDuplicate = useCallback(
    (elementId) => {
      run('duplicateFurniture', { elementId })
    },
    [run],
  )

  const handleUndo = useCallback(() => setHistory((current) => undo(current)), [])
  const handleRedo = useCallback(() => setHistory((current) => redo(current)), [])

  /**
   * Keyboard shortcuts, on the window.
   *
   * Guarded against firing while the user is typing in a field: without the
   * check, pressing Z inside the room-name input would undo their last wall
   * move instead of typing a letter.
   */
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      if (typing) return

      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
        return
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handleRedo()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedId && canEdit) {
          event.preventDefault()
          handleDelete(selectedId)
        }
        return
      }
      if (event.key === 'Escape') {
        setSelectedId(null)
        setMeasuring(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo, handleDelete, selectedId, canEdit])

  // ------------------------------------------------------------------
  // Server round trips
  // ------------------------------------------------------------------
  const handleSave = useCallback(() => {
    if (!history?.dirty || !document) return
    setSaving(true)
    saveRevision(conversionId, {
      document,
      changeSummary: changeSummary(history),
      parentRevision: conversion?.currentRevision?.id,
    })
      .then((result) => {
        // THE SERVER'S DOCUMENT WINS. It re-ran the deterministic repair, so it
        // may have adjusted something; keeping the local copy would leave the
        // editor showing geometry the database does not hold.
        setHistory((current) => markSaved(current, result.revision.document))
        setConversion((current) =>
          current
            ? {
                ...current,
                currentRevision: {
                  id: result.revision.id,
                  number: result.revision.number,
                  score: result.revision.score,
                  grade: result.revision.grade,
                  document: result.revision.document,
                  validation: result.revision.validation,
                  changeSummary: result.revision.change_summary,
                },
                artifactsStale: true,
              }
            : current,
        )
        toast.success(`Saved as revision ${result.revision.number}.`)
        for (const warning of result.warnings ?? []) toast(warning, { duration: 6000 })
      })
      .catch((caught) => {
        const errors = caught?.data?.errors
        if (Array.isArray(errors) && errors.length) {
          toast.error(`${errors[0].field}: ${errors[0].message}`)
        } else {
          toast.error(caught?.message || 'That revision could not be saved.')
        }
      })
      .finally(() => setSaving(false))
  }, [history, document, conversionId, conversion])

  /**
   * Rebuild the downloadable files from the revision on screen.
   *
   * WATCHED BY STAGE, NOT BY STATUS. A Blender run leaves `status` exactly
   * where it was — the semantic model is already finished and is not what is
   * being rebuilt — so the default status watch reports "not running" on its
   * very first poll and the rebuild appears to end before it began. `stage`
   * is where this work is visible, and a failed run is parked at that stage
   * with an error code, which is why the failure is tested for first.
   */
  const handleRegenerate = useCallback(() => {
    rebuildingRef.current = true
    setRegenerating(true)
    regenerateArtifacts(conversionId)
      .then(() => {
        polling.track(conversionId, {
          isRunning: (view) => view.isBuildingArtifacts && !view.blenderFailed,
        })
      })
      .catch((caught) => {
        rebuildingRef.current = false
        setRegenerating(false)
        toast.error(caught?.message || 'The rebuild could not be started.')
      })
  }, [conversionId, polling])

  const handleCalibrate = useCallback(
    ({ candidateIndex, pixelDistance, realDistanceMm }) => {
      setCalibrating(true)
      return calibrateScale(conversionId, {
        candidateIndex,
        pixelDistance,
        realDistanceMm,
      })
        .then((result) => {
          setHistory(createHistory(result.revision.document))
          setConversion((current) =>
            current
              ? {
                  ...current,
                  scaleStatus: 'confirmed',
                  needsScaleConfirmation: false,
                  artifactsStale: true,
                  currentRevision: {
                    id: result.revision.id,
                    number: result.revision.number,
                    score: result.revision.score,
                    grade: result.revision.grade,
                    document: result.revision.document,
                    validation: result.revision.validation,
                    changeSummary: result.revision.change_summary,
                  },
                }
              : current,
          )
          toast.success(
            `Rescaled by ${result.factor.toFixed(3)}× and saved as revision ${result.revision.number}.`,
          )
          return true
        })
        .catch((caught) => {
          toast.error(caught?.message || 'The scale could not be calibrated.')
          return false
        })
        .finally(() => setCalibrating(false))
    },
    [conversionId],
  )

  const handleSetStoreyHeight = useCallback(() => {
    const level = documentLevels(document)[0]
    if (!level) return
    const typed = window.prompt(
      'Storey height for every wall on this level, in millimetres:',
      String(Math.round(level.walls?.[0]?.height ?? 2700)),
    )
    const height = Number(typed)
    if (!Number.isFinite(height) || height < 300 || height > 12000) return
    run('setLevelWallHeight', { levelId: level.id, height })
    toast.success('Storey height set. Save to keep it.')
  }, [document, run])

  // ------------------------------------------------------------------
  // Viewport plumbing
  // ------------------------------------------------------------------
  const handleView = useCallback((preset) => {
    if (preset === 'fit') {
      sceneRef.current?.applyView('fit')
      return
    }
    setView(preset)
    sceneRef.current?.applyView(preset)
  }, [])

  const handleScreenshot = useCallback(() => {
    const dataUrl = sceneRef.current?.screenshot()
    if (!dataUrl) return
    const link = window.document.createElement('a')
    link.href = dataUrl
    link.download = `${conversion?.name || 'floorplan3d'}-view.png`
    link.click()
    toast.success('View saved as a PNG.')
  }, [conversion])

  const expanded = !rightOpen

  // ------------------------------------------------------------------
  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <WarningCircle size={28} className="text-[var(--color-danger)]" />
        <p className="text-sm font-medium text-[var(--tone-ink)]">
          This conversion could not be opened
        </p>
        <p className="max-w-md text-xs text-[var(--tone-ink-soft)]">{loadError}</p>
        <Link
          to="/dashboard/experiments/floorplan-3d"
          className="label-ui mt-1 rounded-sm border border-[var(--tone-line-strong)] px-3.5 py-2 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          Back to the experiment
        </Link>
      </div>
    )
  }

  if (!conversion || !history) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-[var(--tone-ink-soft)]">Loading the model…</p>
      </div>
    )
  }

  const bounds = documentBounds(document)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--tone-line)] bg-white">
      {/* Top bar: identity, revision, and the actions that leave the browser. */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--tone-line)] px-3 py-2">
        <Link
          to="/dashboard/experiments/floorplan-3d"
          className="shrink-0 cursor-pointer rounded-sm p-1.5 text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
          aria-label="Back to the experiment"
        >
          <CaretLeft size={15} />
        </Link>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--tone-ink)]">
            {conversion.name}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-[0.625rem] text-[var(--tone-ink-soft)]">
            <span>
              Revision {conversion.currentRevision?.number ?? '—'}
              {conversion.currentRevision?.grade
                ? ` · ${conversion.currentRevision.grade} ${conversion.currentRevision.score}/100`
                : ''}
            </span>
            {history.dirty && (
              <span className="text-[var(--color-warning)]">· unsaved changes</span>
            )}
            {bounds && (
              <span>
                · {formatMetres(bounds[2] - bounds[0], 1)} ×{' '}
                {formatMetres(bounds[3] - bounds[1], 1)}
              </span>
            )}
            {measurement && (
              <span className="text-[var(--color-brand-deep)]">
                · measured {formatMetres(measurement.distanceMm)} (plan{' '}
                {formatMetres(measurement.planDistanceMm)})
              </span>
            )}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!history.past.length}
            title="Undo (Ctrl/Cmd + Z)"
            aria-label="Undo"
            className={cn(
              'cursor-pointer rounded-sm p-2 transition-colors',
              history.past.length
                ? 'text-[var(--tone-ink)] hover:text-[var(--tone-accent)]'
                : 'cursor-not-allowed text-[var(--tone-line-strong)]',
            )}
          >
            <ArrowUUpLeft size={15} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!history.future.length}
            title="Redo (Ctrl/Cmd + Shift + Z)"
            aria-label="Redo"
            className={cn(
              'cursor-pointer rounded-sm p-2 transition-colors',
              history.future.length
                ? 'text-[var(--tone-ink)] hover:text-[var(--tone-accent)]'
                : 'cursor-not-allowed text-[var(--tone-line-strong)]',
            )}
          >
            <ArrowUUpRight size={15} />
          </button>

          <button
            type="button"
            onClick={() => setPlanMode((current) => (current === 'off' ? 'side' : current === 'side' ? 'overlay' : 'off'))}
            title="Show the original drawing beside or over the model"
            className="label-ui inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-3 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
          >
            <ImageIcon size={14} />
            {planMode === 'off' ? 'Drawing' : planMode === 'side' ? 'Overlay' : 'Hide'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!history.dirty || saving || !canEdit}
            className={cn(
              'label-ui inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-sm px-3.5 transition-colors',
              history.dirty && canEdit
                ? 'bg-[var(--btn-bg)] text-[var(--btn-ink)] hover:bg-[var(--btn-bg-hover)]'
                : 'cursor-not-allowed border border-[var(--tone-line-strong)] text-[var(--tone-ink-soft)]',
            )}
          >
            <FloppyDisk size={14} />
            {saving ? 'Saving…' : 'Save revision'}
          </button>

          <DownloadMenu
            artifacts={conversion.artifacts}
            stale={conversion.artifactsStale}
            onRegenerate={handleRegenerate}
            regenerating={regenerating}
            rebuildMessage={regenerating ? polling.progress?.message : ''}
          />
        </div>
      </header>

      {/* Body: viewport | panel */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ViewportToolbar
            view={view}
            onView={handleView}
            projection={projection}
            onProjection={setProjection}
            axesVisible={axesVisible}
            onAxesVisible={setAxesVisible}
            measuring={measuring}
            onMeasuring={(next) => {
              setMeasuring(next)
              if (!next) setMeasurement(null)
            }}
            levels={levels}
            isolatedLevelId={isolatedLevelId}
            onIsolateLevel={setIsolatedLevelId}
            quality={quality}
            onQuality={setQuality}
            onFullscreen={() => setRightOpen(expanded)}
            onScreenshot={handleScreenshot}
          />

          <div className="relative flex min-h-0 flex-1">
            <div className="relative min-w-0 flex-1">
              <SceneViewport
                document={document}
                catalog={catalog?.index}
                selectedId={selectedId}
                isolatedLevelId={isolatedLevelId}
                projection={projection}
                quality={quality}
                axesVisible={axesVisible}
                measuring={measuring}
                onSelect={(entry) => setSelectedId(entry?.id ?? null)}
                onMeasure={setMeasurement}
                onReady={(scene) => {
                  sceneRef.current = scene
                }}
              />
              {planMode === 'overlay' && (
                <PlanOverlay
                  conversion={conversion}
                  mode="overlay"
                  onModeChange={setPlanMode}
                />
              )}
            </div>

            {planMode === 'side' && (
              <PlanOverlay conversion={conversion} mode="side" onModeChange={setPlanMode} />
            )}

            {/* The panel toggle, pinned to the viewport rather than the header,
                so it sits next to the thing it collapses. */}
            <button
              type="button"
              onClick={() => setRightOpen((current) => !current)}
              aria-label={rightOpen ? 'Hide the properties panel' : 'Show the properties panel'}
              className="absolute right-1.5 top-1.5 z-20 cursor-pointer rounded-sm border border-[var(--tone-line)] bg-white/95 p-1.5 text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
            >
              {rightOpen ? <CaretRight size={13} /> : <SlidersHorizontal size={13} />}
            </button>
            {expanded && (
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                className="label-ui absolute bottom-3 right-3 z-20 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line)] bg-white/95 px-2.5 py-1.5 text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
              >
                <ArrowsIn size={13} />
                Show the panel
              </button>
            )}
          </div>
        </div>

        {/* Right: the inspector and the review lists, as two tabs of one panel.
            Two panels would cost the model another 20% of its width for
            something the user looks at one of at a time. */}
        <aside
          className={cn(
            'flex min-h-0 shrink-0 flex-col border-l border-[var(--tone-line)] transition-[width]',
            rightOpen ? 'w-80' : 'w-0 overflow-hidden',
          )}
        >
          {rightOpen && (
            <>
              <div className="flex shrink-0 border-b border-[var(--tone-line)]">
                {[
                  ['review', `Review${review?.needsAttention.length ? ` (${review.needsAttention.length})` : ''}`],
                  ['inspector', 'Properties'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRightTab(id)}
                    className={cn(
                      'flex-1 cursor-pointer border-b-2 px-3 py-2 text-[0.6875rem] font-medium transition-colors',
                      rightTab === id
                        ? 'border-[var(--color-brand-deep)] text-[var(--tone-ink)]'
                        : 'border-transparent text-[var(--tone-ink-soft)] hover:text-[var(--tone-ink)]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1">
                {rightTab === 'review' ? (
                  <ReviewPanel
                    review={review}
                    canEdit={canEdit}
                    assumedCount={assumedCount}
                    onSelect={(elementId) => {
                      setSelectedId(elementId)
                      setRightTab('inspector')
                    }}
                    onConfirm={(elementId) => run('confirmElement', { elementId })}
                    onCalibrate={() => setShowCalibration(true)}
                    onSetStoreyHeight={handleSetStoreyHeight}
                  />
                ) : (
                  <PropertyInspector
                    document={document}
                    catalog={catalog}
                    selectedId={selectedId}
                    canEdit={canEdit}
                    onCommand={run}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onSelect={setSelectedId}
                  />
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Status strip. Small, and the only place the Blender stage's own state
          is reported — a failed artifact run is NOT a failed conversion, and the
          wording has to make that clear. */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--tone-line)] px-3 py-1.5 text-[0.625rem] text-[var(--tone-ink-soft)]">
        <span>{conversion.stageLabel}</span>
        {/* A CONVERSION run reports a percentage; a REBUILD does not. The
            percentage on a Blender run is a fixed 80 the whole way through —
            it marks the stage, not the work — so showing it would be a
            progress bar that never moves and then jumps to done. */}
        {polling.progress?.isRunning ? (
          <span className="text-[var(--color-brand-deep)]">
            {polling.progress.message} · {polling.progress.progress}%
          </span>
        ) : (
          regenerating && (
            <span className="text-[var(--color-brand-deep)]">
              Rebuilding the downloadable files…
            </span>
          )
        )}
        {!regenerating && conversion.errorCode?.startsWith('blender') && (
          <span className="text-[var(--color-warning)]">
            {conversion.errorMessage}
          </span>
        )}
        <span className="ml-auto">
          {conversion.currentRevision?.changeSummary || 'Created by the recognition pipeline.'}
        </span>
        {expanded && <ArrowsOut size={11} aria-hidden="true" className="shrink-0" />}
      </footer>

      <ScaleCalibrationModal
        open={showCalibration}
        onClose={() => setShowCalibration(false)}
        conversion={conversion}
        document={document}
        onCalibrate={handleCalibrate}
        saving={calibrating}
      />
    </div>
  )
}
