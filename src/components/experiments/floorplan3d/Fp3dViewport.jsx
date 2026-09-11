import { useCallback, useEffect, useRef, useState } from 'react'

import { Scene3D } from '@/lib/experiments/floorplan3d/Scene3D'
import { cn } from '@/lib/cn'

/**
 * The 3D model, on a canvas.
 *
 * A thin React shell over `Scene3D`, which owns every Three.js object. This
 * component's whole job is lifecycle and props: create the scene once, tell it
 * what changed, tear it down on unmount. It never touches a mesh.
 *
 * `view` is `{ preset, nonce }` rather than a bare preset, because pressing
 * TOP twice has to move the camera back both times — an unchanged string would
 * not re-run the effect.
 *
 * `onTransformEnd` receives a SEMANTIC change (an element id and a model-space
 * position), never a Three.js object. Translating a gizmo drag into an
 * architectural edit is the scene's job, and turning that into a command is
 * the workspace's; this component only carries it between them.
 */
export default function Fp3dViewport({
  model,
  flaggedIds,
  selectedId = null,
  hiddenIds,
  isolatedIds = null,
  visibleLevelIds = null,
  view,
  projection = 'perspective',
  wallOpacity = 1,
  sectionHeight = null,
  showGrid = true,
  showAxes = true,
  showLabels = true,
  showShadows = true,
  transformMode = 'translate',
  gizmoEnabled = true,
  focusId = null,
  onSelect,
  onTransformEnd,
  onReady,
  className,
}) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  // The scene calls these; wrapping them in refs keeps the scene's own
  // handlers stable, so a changed callback does not mean tearing down a
  // renderer and losing the user's camera.
  //
  // Written in an EFFECT rather than during render. Mutating a ref while
  // rendering is what `react-hooks/refs` correctly objects to: a render that
  // React throws away would still have written the new handler, and the scene
  // would be calling a callback for a state that never committed.
  const selectRef = useRef(onSelect)
  const transformRef = useRef(onTransformEnd)
  useEffect(() => {
    selectRef.current = onSelect
    transformRef.current = onTransformEnd
  }, [onSelect, onTransformEnd])

  const handleHover = useCallback((element, at) => {
    setHovered(element)
    if (element && at) setPointer(at)
    sceneRef.current?.setHoverHighlight(element?.id ?? null)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new Scene3D(mount, {
      onSelect: (id) => selectRef.current?.(id),
      onHover: handleHover,
      onTransformEnd: (change) => transformRef.current?.(change),
    })
    sceneRef.current = scene
    onReady?.(scene)

    return () => {
      scene.dispose()
      sceneRef.current = null
      onReady?.(null)
    }
    // `onReady` is deliberately excluded: it is a reporting channel, and a
    // caller that re-creates it must not cost the user their whole scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleHover])

  // The model, and whether the camera should survive it. An EDIT rebuilds the
  // scene, and re-framing after every nudge would throw the viewpoint away on
  // each change; a genuinely different building is framed from ISO.
  const previousModelRef = useRef(null)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const sameBuilding = previousModelRef.current != null && model != null
    scene.setModel(model, {
      flagged: flaggedIds,
      wallOpacity,
      preserveCamera: sameBuilding,
    })
    previousModelRef.current = model
  }, [model, flaggedIds, wallOpacity])

  useEffect(() => {
    sceneRef.current?.setSelection(selectedId, { attachGizmo: gizmoEnabled })
  }, [selectedId, gizmoEnabled, model])

  useEffect(() => {
    sceneRef.current?.setTransformMode(transformMode)
  }, [transformMode])

  useEffect(() => {
    sceneRef.current?.setVisibility({
      hidden: hiddenIds,
      isolated: isolatedIds,
      levelIds: visibleLevelIds,
    })
  }, [hiddenIds, isolatedIds, visibleLevelIds, model])

  useEffect(() => {
    sceneRef.current?.setProjection(projection)
  }, [projection])

  useEffect(() => {
    sceneRef.current?.setSection(sectionHeight)
  }, [sectionHeight, model])

  useEffect(() => {
    sceneRef.current?.setHelpersVisible({ grid: showGrid, axes: showAxes })
  }, [showGrid, showAxes, model])

  useEffect(() => {
    sceneRef.current?.setLabelsVisible(showLabels)
  }, [showLabels, model])

  useEffect(() => {
    sceneRef.current?.setShadows(showShadows)
  }, [showShadows, model])

  useEffect(() => {
    if (view?.preset) sceneRef.current?.applyView(view.preset)
  }, [view])

  useEffect(() => {
    if (focusId) sceneRef.current?.focusElement(focusId)
  }, [focusId])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        ref={mountRef}
        className="h-full w-full"
        style={{ cursor: hovered ? 'pointer' : 'grab' }}
      />

      {hovered && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-10 max-w-56 rounded-xs border',
            'border-[var(--tone-line-strong)] bg-white/95 px-2 py-1 shadow-md',
            'backdrop-blur-[2px]',
          )}
          style={{ left: pointer.x + 14, top: pointer.y + 14 }}
        >
          <p className="truncate text-[0.6875rem] font-semibold text-[var(--tone-ink)]">
            {hovered.name}
          </p>
          <p className="truncate text-[0.5625rem] uppercase tracking-[0.06em] text-[var(--tone-muted-dark)]">
            {hovered.kind} · {hovered.id}
          </p>
        </div>
      )}
    </div>
  )
}
