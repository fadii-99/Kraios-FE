import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from '@phosphor-icons/react'

import PageLoader from '@/components/ui/PageLoader'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Fp3dActivityPanel from '@/components/experiments/floorplan3d/Fp3dActivityPanel'
import Fp3dCompare from '@/components/experiments/floorplan3d/Fp3dCompare'
import Fp3dConversionProgress from '@/components/experiments/floorplan3d/Fp3dConversionProgress'
import Fp3dInspector from '@/components/experiments/floorplan3d/Fp3dInspector'
import Fp3dLeftPanel from '@/components/experiments/floorplan3d/Fp3dLeftPanel'
import Fp3dPlan2D from '@/components/experiments/floorplan3d/Fp3dPlan2D'
import Fp3dToolbar from '@/components/experiments/floorplan3d/Fp3dToolbar'
import Fp3dViewport from '@/components/experiments/floorplan3d/Fp3dViewport'
import {
  applyCommands,
  calibrateScale,
  editWithInstruction,
  getCapabilities,
  getSource,
  isStaleRevisionError,
  listConversions,
  listRevisions,
  requestExport,
  restoreRevision,
} from '@/lib/api/floorplan3d'
import {
  capabilitiesToView,
  conversionsToView,
  editOutcomeToView,
  qualityToView,
  revisionsToView,
  sourceToView,
} from '@/lib/experiments/floorplan3d/adapters'
import * as build from '@/lib/experiments/floorplan3d/commands'
import {
  canRedo,
  canUndo,
  emptyHistory,
  pushHistory,
  redoLabel,
  redoStep,
  undoLabel,
  undoStep,
} from '@/lib/experiments/floorplan3d/commands'
import {
  downloadArtifact,
  downloadModelJson,
  exportGlb,
} from '@/lib/experiments/floorplan3d/exporters'
import { elementsNeedingReview, LAYERS } from '@/lib/experiments/floorplan3d/model'
import { useConversionPolling } from '@/lib/experiments/floorplan3d/useConversionPolling'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * `/dashboard/experiments/floorplan-3d/:sourceId` — the workspace.
 *
 * WHERE STATE LIVES, AND WHY
 * --------------------------
 * The SERVER owns the model. Every edit — an inspector field, a drag, an undo,
 * a sentence — is sent as a command, applied and re-validated there, and what
 * comes back replaces what is on screen. Nothing here holds a second copy that
 * could disagree with it.
 *
 * That is slower than mutating a local object, and it is the right trade for
 * this feature: the validator is what stops a wall being dragged through a
 * door, and running it in two places would mean maintaining it in two places.
 * `busy` covers the round trip, and the controls that could race it are
 * disabled while it is in flight.
 *
 * The browser owns three things and no more: which element is selected, what
 * is visible, and the undo stack — none of which anybody else needs to know.
 *
 * THE PAGE DOES NOT SCROLL. It is a workspace: the toolbar, the panels and the
 * model each own their own overflow. A scrolling page put the model — the
 * subject, and the only thing here that needs room — wherever the reader
 * happened to have scrolled to.
 */

const TOAST_IDS = {
  save: 'fp3d-save',
  edit: 'fp3d-edit',
  export: 'fp3d-export',
  convert: 'fp3d-convert',
  conflict: 'fp3d-conflict',
}

const ALL_LAYERS = new Set(LAYERS.map((layer) => layer.id))

export default function Floorplan3dWorkspace() {
  const { sourceId } = useParams()
  const navigate = useNavigate()

  const [source, setSource] = useState(null)
  const [capabilities, setCapabilities] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')

  const [model, setModel] = useState(null)
  const [quality, setQuality] = useState(null)
  const [revision, setRevision] = useState(0)
  const [revisions, setRevisions] = useState([])
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [history, setHistory] = useState(emptyHistory)
  const [transcript, setTranscript] = useState([])
  const [chatBusy, setChatBusy] = useState(false)

  const [tab, setTab] = useState('3d')
  const [view, setView] = useState({ preset: 'iso', nonce: 0 })
  const [projection, setProjection] = useState('perspective')
  const [transformMode, setTransformMode] = useState('translate')
  const [visibleLevelIds, setVisibleLevelIds] = useState(null)
  const [visibleLayers, setVisibleLayers] = useState(ALL_LAYERS)
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [isolatedIds, setIsolatedIds] = useState(null)
  const [exporting, setExporting] = useState(false)

  const conversionState = useConversionPolling()
  const { conversion, track, start, cancel, abort, starting, cancelling, stalled } =
    conversionState

  const turnCounter = useRef(0)
  // What "every level" currently means, for the toggle's first click. A ref
  // because it is read inside a state updater, never rendered.
  const defaultLevelIdsRef = useRef(new Set())

  // Read out of the objects once, so every `useCallback` below depends on a
  // plain value. Optional chaining inside a dependency array is not something
  // the React compiler can track, and it answers by refusing to preserve the
  // memoization at all.
  const conversionId = conversion?.id ?? null
  const conversionStatus = conversion?.status ?? null
  const sourceName = source?.name ?? 'model'

  // -- loading -------------------------------------------------------------

  // React Router reuses this component when only `:sourceId` changes, so the
  // page has to reset itself for a different plan. Done DURING RENDER against
  // the previous id (the `prevUser` pattern `ProfileContext` already uses)
  // rather than in an effect: an effect would render one frame of the previous
  // plan's model under the new plan's name.
  const [requestedSourceId, setRequestedSourceId] = useState(sourceId)
  if (requestedSourceId !== sourceId) {
    setRequestedSourceId(sourceId)
    setLoading(true)
    setModel(null)
    setQuality(null)
    setRevisions([])
    setSelectedId(null)
    setHistory(emptyHistory())
    setTranscript([])
    setVisibleLevelIds(null)
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getSource(sourceId),
      listConversions(sourceId),
      getCapabilities(),
    ])
      .then(([sourceRow, conversionRows, capabilityRow]) => {
        if (cancelled) return
        setSource(sourceToView(sourceRow))
        setCapabilities(capabilitiesToView(capabilityRow))
        setFailure('')
        const latest = conversionsToView(conversionRows)[0]
        // Always fetches the detail, even for a run that finished days ago —
        // the list endpoint returns summaries with no model in them.
        if (latest) track(latest)
      })
      .catch((caught) => {
        if (cancelled) return
        setFailure(
          caught?.status === 503
            ? 'The Floor Plan 3D Lab is not enabled on this deployment.'
            : caught?.status === 404
              ? 'That floor plan does not exist, or is not yours.'
              : caught?.message || 'This workspace could not be loaded.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      // Stops the WATCH, not the work: the conversion carries on server-side
      // and coming back re-attaches to it.
      abort()
    }
  }, [sourceId, track, abort])

  // The model is SEEDED from the conversion — a completed poll carries the
  // document, so nothing here fetches it separately — and then OWNED here,
  // because every edit replaces it with what the server validated.
  //
  // Adjusted during render against the conversion this page has already taken,
  // so a later local revision is never clobbered by the conversion object the
  // poll finished with. Polling stops on a terminal status, so `conversion`
  // does not change again after that.
  const [seededFrom, setSeededFrom] = useState(null)
  if (conversion?.model && seededFrom !== conversion.id) {
    setSeededFrom(conversion.id)
    setModel(conversion.model)
    setQuality(conversion.quality)
    setRevision(conversion.revision)
  }

  // A promise CHAIN rather than await, matching the rest of the dashboard: the
  // setState lands in a callback, so nothing is set synchronously by the
  // effect that calls this.
  const loadRevisions = useCallback((id) => {
    if (!id) return
    listRevisions(id)
      .then((rows) => setRevisions(revisionsToView(rows)))
      // The history is a convenience; failing to load it must not break the
      // workspace, and the panel shows an empty list rather than an error the
      // user cannot act on.
      .catch(() => setRevisions([]))
  }, [])

  useEffect(() => {
    if (conversionId && conversionStatus === 'completed') {
      loadRevisions(conversionId)
    }
  }, [conversionId, conversionStatus, loadRevisions])

  // Every level is visible until the user says otherwise. DERIVED rather than
  // initialised into state by an effect: `null` means "the user has not
  // chosen", which is exactly the default, so there is nothing to store until
  // they do — and a rebuild on every edit cannot undo their level isolation.
  const effectiveLevelIds = useMemo(
    () => visibleLevelIds ?? new Set((model?.levels ?? []).map((level) => level.id)),
    [visibleLevelIds, model],
  )

  useEffect(() => {
    defaultLevelIdsRef.current = new Set((model?.levels ?? []).map((l) => l.id))
  }, [model])

  const flaggedIds = useMemo(() => elementsNeedingReview(model), [model])
  const warnings = useMemo(
    () => (model?.warnings ?? []).map((warning) => ({
      code: warning.code,
      message: warning.message,
      elementId: warning.element_id,
      repair: warning.repair,
      repaired: warning.repaired,
      needsReview: warning.needs_review,
    })),
    [model],
  )

  // -- applying commands ---------------------------------------------------

  /**
   * The ONE path every edit takes.
   *
   * Sends the commands, replaces the model with what the server validated, and
   * records the step for undo. A 409 means somebody saved first — almost
   * always the same user in another tab — and the answer is to say so, not to
   * overwrite what they did.
   */
  const runCommands = useCallback(
    async (entries, { record = true, summary } = {}) => {
      const list = entries.filter(Boolean)
      if (!list.length || !conversionId) return null

      setBusy(true)
      try {
        const response = await applyCommands(conversionId, {
          commands: list.map((entry) => entry.op ?? entry),
          baseRevision: revision,
          summary: summary || list.map((entry) => entry.describe).join('; '),
        })
        const outcome = editOutcomeToView(response)

        if (outcome.model) {
          setModel(outcome.model)
          setQuality(outcome.quality ?? qualityToView(response.quality))
          setRevision(outcome.revision)
        }
        setConflict(false)

        if (!outcome.changed) {
          const reason = outcome.rejected[0]?.reason
          if (reason) showInfoToast(reason, { id: TOAST_IDS.edit })
          return outcome
        }

        if (record) {
          for (const entry of list) {
            if (entry.op) setHistory((current) => pushHistory(current, entry))
          }
        }
        loadRevisions(conversionId)
        return outcome
      } catch (caught) {
        if (isStaleRevisionError(caught)) {
          setConflict(true)
          showErrorToast(
            caught?.data?.detail
              || 'A newer version of this model was saved elsewhere. Reload to see it.',
            { id: TOAST_IDS.conflict },
          )
        } else {
          showErrorToast(caught?.message || 'That change could not be applied.', {
            id: TOAST_IDS.edit,
          })
        }
        return null
      } finally {
        setBusy(false)
      }
    },
    [conversionId, revision, loadRevisions],
  )

  /** The inspector's fields, translated into commands. */
  const onEdit = useCallback(
    (change) => {
      if (!model) return
      const make = {
        wallThickness: () => build.setWallThickness(model, change.id, change.value),
        wallHeight: () => build.setWallHeight(model, change.id, change.value),
        wallType: () => build.setWallType(model, change.id, change.value),
        wallLength: () => build.setWallLength(model, change.id, change.value),
        openingPosition: () => build.moveOpening(model, change.id, change.value),
        openingSize: () => build.resizeOpening(model, change.id, {
          width: change.width,
          height: change.height,
          sill_height: change.sill,
        }),
        openingSwing: () => build.setOpeningOrientation(model, change.id, {
          swing_side: change.side,
          swing_direction: change.direction,
        }),
        itemPosition: () => build.moveFurniture(model, change.id, change.position),
        itemRotation: () => build.rotateFurniture(model, change.id, change.value),
        itemSize: () => build.resizeFurniture(model, change.id, {
          size: change.size,
          height: change.height,
        }),
        itemSeats: () => build.resizeFurniture(model, change.id, { seats: change.value }),
        furnitureName: () => build.command(
          { op: 'replace_furniture', furniture_id: change.id, name: change.value },
          { describe: `Renamed ${change.id}` },
        ),
        material: () => build.assignMaterial(model, change.id, change.value, change.slot),
        roomName: () => build.renameRoom(model, change.id, { name: change.value }),
        roomType: () => build.renameRoom(model, change.id, { type: change.value }),
        levelHeights: () => build.setLevelHeights(model, change.id, {
          default_wall_height: change.wallHeight,
          floor_to_floor: change.floorToFloor,
          slab_thickness: change.slabThickness,
        }),
        levelElevation: () => build.setLevelElevation(model, change.id, change.value),
      }[change.type]

      const entry = make?.()
      // A fixture is not furniture, and its move/rotate/resize commands do not
      // exist. Rather than offering fields that fail, the inspector's fixture
      // rows are read-only for position — the chat can still move one.
      if (!entry) {
        if (['itemPosition', 'itemRotation', 'itemSize'].includes(change.type)
          && change.kind === 'fixture') {
          showInfoToast(
            'Fixtures are part of the building, so they are not dragged like '
            + 'furniture. Ask for the change in words and it will be applied.',
            { id: TOAST_IDS.edit },
          )
        }
        return
      }
      runCommands([entry])
    },
    [model, runCommands],
  )

  const onDeleteElement = useCallback(
    (kind, id) => {
      const entry = kind === 'wall'
        ? build.deleteWall(id)
        : kind === 'furniture'
          ? build.deleteFurniture(id)
          : build.deleteOpening(id)
      setSelectedId(null)
      runCommands([entry])
    },
    [runCommands],
  )

  /** A finished gizmo drag, as a semantic change. */
  const onTransformEnd = useCallback(
    (change) => {
      if (!model) return
      if (change.kind !== 'furniture') {
        showInfoToast(
          'Only furniture can be dragged. Fixtures are part of the building.',
          { id: TOAST_IDS.edit },
        )
        return
      }
      const entries = []
      if (change.moved) {
        entries.push(build.moveFurniture(model, change.elementId, change.position))
      }
      if (change.turned) {
        entries.push(
          build.rotateFurniture(model, change.elementId, change.rotationDegrees),
        )
      }
      runCommands(entries)
    },
    [model, runCommands],
  )

  /** A finished corner drag in the 2D plan. */
  const onMoveEndpoint = useCallback(
    (wallId, endpoint, to) => {
      if (!model) return
      runCommands([build.moveWallEndpoint(model, wallId, endpoint, to, true)])
    },
    [model, runCommands],
  )

  // -- undo / redo ---------------------------------------------------------

  const onUndo = useCallback(async () => {
    const step = undoStep(history)
    if (!step) return
    const outcome = await runCommands(
      step.commands.map((op) => ({ op })),
      { record: false, summary: step.describe },
    )
    if (outcome?.changed) setHistory(step.history)
  }, [history, runCommands])

  const onRedo = useCallback(async () => {
    const step = redoStep(history)
    if (!step) return
    const outcome = await runCommands(
      step.commands.map((op) => ({ op })),
      { record: false, summary: step.describe },
    )
    if (outcome?.changed) setHistory(step.history)
  }, [history, runCommands])

  // Ctrl/Cmd+Z and Ctrl+Y / Ctrl+Shift+Z, the same bindings the design canvas
  // uses, and ignored while focus is in an editable field so typing in the
  // inspector or the chat is never hijacked.
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target
      const editable = target?.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
      if (editable) return

      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        onUndo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        onRedo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUndo, onRedo])

  // -- natural language ----------------------------------------------------

  const onSendInstruction = useCallback(
    async (instruction) => {
      if (!conversionId) return
      turnCounter.current += 1
      const turnId = `turn-${turnCounter.current}`
      setTranscript((current) => [...current, { id: turnId, instruction, pending: true }])
      setChatBusy(true)

      try {
        const response = await editWithInstruction(conversionId, {
          instruction,
          baseRevision: revision,
          selection: selectedId ? [selectedId] : [],
        })
        const outcome = editOutcomeToView(response)

        if (outcome.model) {
          setModel(outcome.model)
          setQuality(outcome.quality ?? qualityToView(response.quality))
          setRevision(outcome.revision)
        }
        setTranscript((current) => current.map((turn) => (
          turn.id === turnId
            ? {
              ...turn,
              pending: false,
              descriptions: outcome.descriptions,
              explanation: outcome.explanation,
              assumption: outcome.assumption,
              rejected: outcome.rejected,
            }
            : turn
        )))

        if (outcome.changed) {
          // The undo stack cannot invert an instruction — the commands are the
          // server's, and their inverses were never captured here. The history
          // panel restores a revision instead, which is what that list is for.
          setHistory(emptyHistory())
          loadRevisions(conversionId)
        }
      } catch (caught) {
        const message = isStaleRevisionError(caught)
          ? 'A newer version was saved elsewhere. Reload before editing again.'
          : caught?.message || 'That instruction could not be applied.'
        if (isStaleRevisionError(caught)) setConflict(true)
        setTranscript((current) => current.map((turn) => (
          turn.id === turnId
            ? { ...turn, pending: false, explanation: message }
            : turn
        )))
      } finally {
        setChatBusy(false)
      }
    },
    [conversionId, revision, selectedId, loadRevisions],
  )

  // -- revisions and calibration -------------------------------------------

  const onRestoreRevision = useCallback(
    async (number) => {
      if (!conversionId) return
      setBusy(true)
      try {
        const response = await restoreRevision(conversionId, number)
        setModel(response.model)
        setQuality(qualityToView(response.quality))
        setRevision(response.revision)
        setHistory(emptyHistory())
        setConflict(false)
        loadRevisions(conversionId)
        showSuccessToast(`Restored revision ${number}.`, { id: TOAST_IDS.save })
      } catch (caught) {
        showErrorToast(caught?.message || 'That revision could not be restored.', {
          id: TOAST_IDS.save,
        })
      } finally {
        setBusy(false)
      }
    },
    [conversionId, loadRevisions],
  )

  const onCalibrate = useCallback(
    async (pointA, pointB, realDistance) => {
      if (!conversionId) return
      setBusy(true)
      try {
        const response = await calibrateScale(conversionId, {
          pointA, pointB, realDistance, baseRevision: revision,
        })
        if (response.model) {
          setModel(response.model)
          setQuality(qualityToView(response.quality))
          setRevision(response.revision)
        }
        setHistory(emptyHistory())
        loadRevisions(conversionId)
        showSuccessToast(
          `Rescaled by ×${response.factor?.toFixed(3) ?? '1'}.`,
          { id: TOAST_IDS.save },
        )
      } catch (caught) {
        showErrorToast(caught?.message || 'The scale could not be calibrated.', {
          id: TOAST_IDS.save,
        })
      } finally {
        setBusy(false)
      }
    },
    [conversionId, revision, loadRevisions],
  )

  // -- export --------------------------------------------------------------

  const onExport = useCallback(
    async (format) => {
      if (!model) return
      setExporting(true)
      try {
        const name = sourceName

        // JSON and GLB are written HERE, from the model on screen. No round
        // trip, no storage, and — the reason it matters — they export what is
        // in front of the user, which is what "export" means in an editor.
        if (format === 'json') {
          const saved = downloadModelJson(model, name)
          if (saved) showSuccessToast('Model JSON downloaded.', { id: TOAST_IDS.export })
          return
        }
        if (format === 'glb') {
          const saved = await exportGlb(model, { name, documentHeader: model })
          if (saved) showSuccessToast('GLB downloaded.', { id: TOAST_IDS.export })
          else showErrorToast('The GLB could not be produced.', { id: TOAST_IDS.export })
          return
        }

        // Everything else is rendered by the server and downloaded as an
        // artifact — one authenticated fetch, verified before it is saved.
        const artifact = await requestExport(conversionId, { format })
        const saved = await downloadArtifact(
          artifact.download_url,
          `${name.replace(/[^\w.-]+/g, '-')}.${format === 'obj' ? 'zip' : format}`,
        )
        if (saved) {
          showSuccessToast(`${format.toUpperCase()} downloaded.`, {
            id: TOAST_IDS.export,
          })
        } else {
          showErrorToast('The export could not be downloaded.', {
            id: TOAST_IDS.export,
          })
        }
      } catch (caught) {
        showErrorToast(caught?.message || 'That export is not available.', {
          id: TOAST_IDS.export,
        })
      } finally {
        setExporting(false)
      }
    },
    [model, sourceName, conversionId],
  )

  // -- visibility ----------------------------------------------------------

  const onToggleLevel = useCallback((levelId, { only = false } = {}) => {
    setVisibleLevelIds((current) => {
      if (only) return new Set([levelId])
      const next = new Set(current ?? defaultLevelIdsRef.current)
      if (next.has(levelId)) next.delete(levelId)
      else next.add(levelId)
      // Hiding the last level would leave an empty viewport with no way back,
      // so the last one stays on.
      return next.size ? next : current
    })
  }, [])

  const onToggleLayer = useCallback((layerId) => {
    setVisibleLayers((current) => {
      const next = new Set(current)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
  }, [])

  const onToggleHidden = useCallback((elementId) => {
    setHiddenIds((current) => {
      const next = new Set(current)
      if (next.has(elementId)) next.delete(elementId)
      else next.add(elementId)
      return next
    })
  }, [])

  const onFocusElement = useCallback((elementId) => {
    if (!elementId) return
    setSelectedId(elementId)
    setFocusId(elementId)
    // Cleared on the next tick so focusing the same element twice works —
    // an unchanged prop would not re-run the viewport's effect.
    requestAnimationFrame(() => setFocusId(null))
  }, [])

  // Layers are applied to the 3D scene by hiding the elements they cover.
  const layerHiddenIds = useMemo(() => {
    if (visibleLayers.size === ALL_LAYERS.size) return hiddenIds
    const combined = new Set(hiddenIds)
    for (const layer of LAYERS) {
      if (visibleLayers.has(layer.id)) continue
      for (const collection of layerCollections(layer.id)) {
        for (const element of model?.[collection] ?? []) combined.add(element.id)
      }
    }
    return combined
  }, [hiddenIds, visibleLayers, model])

  const saveState = conflict ? 'conflict' : busy ? 'saving' : 'saved'

  // -- render --------------------------------------------------------------

  if (loading) {
    return <PageLoader variant="inline" label="Loading the workspace" className="min-h-[60vh]" />
  }

  if (failure) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-md text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)]">
          {failure}
        </p>
        <PrimaryButton
          size="compact"
          arrowDirection="left"
          onClick={() => navigate('/dashboard/experiments/floorplan-3d')}
        >
          Back to the Lab
        </PrimaryButton>
      </div>
    )
  }

  const hasModel = Boolean(model?.walls?.length)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Fp3dToolbar
        title={source?.name ?? 'Floor plan'}
        subtitle={
          hasModel
            ? `Revision ${revision}${quality?.grade ? ` · grade ${quality.grade} (${quality.score}/100)` : ''}`
            : 'Not converted yet'
        }
        saveState={saveState}
        tab={tab}
        onTab={setTab}
        view={view.preset}
        onView={(preset) => setView((current) => ({ preset, nonce: current.nonce + 1 }))}
        projection={projection}
        onProjection={setProjection}
        transformMode={transformMode}
        onTransformMode={setTransformMode}
        canUndo={canUndo(history) && !busy}
        canRedo={canRedo(history) && !busy}
        undoLabel={undoLabel(history)}
        redoLabel={redoLabel(history)}
        onUndo={onUndo}
        onRedo={onRedo}
        onSave={() => {
          // Every edit is already committed as its own revision, so there is
          // nothing pending to flush. The control exists because an editor
          // without a Save reads as one that loses work — it reloads from the
          // server, which is the honest thing it can do.
          showInfoToast('Every change is saved as you make it.', {
            id: TOAST_IDS.save,
          })
        }}
        saving={busy}
        exportFormats={capabilities?.formats ?? []}
        onExport={onExport}
        exporting={exporting}
        skpReason={capabilities?.skpAvailable ? '' : capabilities?.skpReason}
      />

      {!hasModel && (
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-lg">
            <button
              type="button"
              onClick={() => navigate('/dashboard/experiments/floorplan-3d')}
              className="mb-4 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[var(--color-brand-deep)] hover:underline"
            >
              <ArrowLeft size={13} weight="bold" aria-hidden="true" />
              All floor plans
            </button>

            <Fp3dConversionProgress
              conversion={conversion}
              stalled={stalled}
              cancelling={cancelling}
              onCancel={cancel}
              onRetry={() => start(sourceId)}
              className="mb-4"
            />

            {(!conversion || conversion.isFinished) && !conversion?.hasFailed
              && !conversion?.wasCancelled && (
              <div className="rounded-md border border-[var(--tone-line-strong)] bg-white p-5 text-center">
                <p className="text-[0.9375rem] font-semibold text-[var(--tone-ink)]">
                  Turn this drawing into a 3D model
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
                  It is read, traced, checked against itself and compared back
                  to your sheet. You will get a model you can edit, not a
                  picture.
                </p>
                <PrimaryButton
                  size="compact"
                  withArrow={false}
                  loading={starting}
                  loadingLabel="Starting"
                  className="mt-4"
                  onClick={() => start(sourceId)}
                >
                  <Play size={14} weight="fill" aria-hidden="true" />
                  Convert this plan
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>
      )}

      {hasModel && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <Fp3dLeftPanel
              source={source}
              model={model}
              selectedId={selectedId}
              onSelect={onFocusElement}
              visibleLevelIds={effectiveLevelIds}
              onToggleLevel={onToggleLevel}
              visibleLayers={visibleLayers}
              onToggleLayer={onToggleLayer}
              hiddenIds={hiddenIds}
              onToggleHidden={onToggleHidden}
              isolatedIds={isolatedIds}
              onIsolate={setIsolatedIds}
              flaggedIds={flaggedIds}
              onOpenSource={() => setTab('compare')}
              className="hidden w-60 shrink-0 lg:flex"
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
              {tab === 'compare' ? (
                <Fp3dCompare
                  source={source}
                  model={model}
                  selectedId={selectedId}
                  flaggedIds={flaggedIds}
                  visibleLevelIds={effectiveLevelIds}
                  onSelect={setSelectedId}
                  calibrating
                  onCalibrate={onCalibrate}
                  calibrationBusy={busy}
                  className="min-h-0 flex-1"
                />
              ) : (
                <div
                  className={cn(
                    'grid min-h-0 flex-1',
                    tab === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1',
                  )}
                >
                  {(tab === '3d' || tab === 'split') && (
                    <Fp3dViewport
                      model={model}
                      flaggedIds={flaggedIds}
                      selectedId={selectedId}
                      hiddenIds={layerHiddenIds}
                      isolatedIds={isolatedIds}
                      visibleLevelIds={effectiveLevelIds}
                      view={view}
                      projection={projection}
                      transformMode={transformMode}
                      focusId={focusId}
                      onSelect={setSelectedId}
                      onTransformEnd={onTransformEnd}
                      className={cn(
                        'min-h-0',
                        tab === 'split' && 'border-b border-[var(--tone-line)] xl:border-b-0 xl:border-r',
                      )}
                    />
                  )}
                  {(tab === '2d' || tab === 'split') && (
                    <Fp3dPlan2D
                      model={model}
                      selectedId={selectedId}
                      flaggedIds={flaggedIds}
                      visibleLevelIds={effectiveLevelIds}
                      visibleLayers={visibleLayers}
                      editable={!busy}
                      onSelect={setSelectedId}
                      onMoveEndpoint={onMoveEndpoint}
                      className="min-h-0"
                    />
                  )}
                </div>
              )}
            </main>

            <Fp3dInspector
              model={model}
              selectedId={selectedId}
              warnings={warnings}
              busy={busy}
              onEdit={onEdit}
              onDelete={onDeleteElement}
              className="hidden w-72 shrink-0 xl:flex"
            />
          </div>

          <Fp3dActivityPanel
            quality={quality}
            model={model}
            revisions={revisions}
            transcript={transcript}
            chatBusy={chatBusy || busy}
            onSendInstruction={onSendInstruction}
            onRestoreRevision={onRestoreRevision}
            onFocusElement={onFocusElement}
            selectedId={selectedId}
            className="h-56 shrink-0"
          />
        </div>
      )}
    </div>
  )
}

/** Which document collections a layer toggle covers. */
function layerCollections(layerId) {
  return {
    walls: ['walls'],
    openings: ['doors', 'windows', 'passages'],
    rooms: ['rooms'],
    slabs: ['slabs'],
    structure: ['columns', 'beams', 'stairs'],
    fixtures: ['fixtures'],
    furniture: ['furniture'],
  }[layerId] ?? []
}
