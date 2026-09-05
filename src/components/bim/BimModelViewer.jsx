import { useCallback, useEffect, useRef, useState } from 'react'

import { ModelScene } from '@/lib/bim/ModelScene'
import { cn } from '@/lib/cn'

/**
 * The model, on a canvas.
 *
 * A thin React shell over `ModelScene`, which owns every Three.js object. This
 * component's whole job is lifecycle and props: create the scene once, tell it
 * what changed, tear it down on unmount. It never touches a mesh.
 *
 * `view` is `{ preset, nonce }` rather than a bare preset, because pressing TOP
 * twice has to move the camera back both times — an unchanged string would not
 * re-run the effect.
 */
export default function BimModelViewer({
  plan,
  flaggedIds,
  selectedId = null,
  hiddenIds,
  isolatedIds = null,
  view,
  onSelect,
  className,
}) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined
    const scene = new ModelScene(mount)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setPlan(plan, flaggedIds)
  }, [plan, flaggedIds])

  useEffect(() => {
    sceneRef.current?.setSelection(selectedId)
  }, [selectedId, plan])

  useEffect(() => {
    sceneRef.current?.setVisibility({ hidden: hiddenIds, isolated: isolatedIds })
  }, [hiddenIds, isolatedIds, plan])

  useEffect(() => {
    if (view?.preset) sceneRef.current?.applyView(view.preset)
  }, [view])

  const onPointerMove = useCallback((event) => {
    const element = sceneRef.current?.elementAt(event.clientX, event.clientY) ?? null
    setHovered(element)
    if (element) {
      setPointer({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })
    }
  }, [])

  const onClick = useCallback(
    (event) => {
      if (!onSelect) return
      const element = sceneRef.current?.elementAt(event.clientX, event.clientY) ?? null
      onSelect(element?.id ?? null)
    },
    [onSelect],
  )

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        ref={mountRef}
        className="h-full w-full"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
        onClick={onClick}
        style={{ cursor: hovered ? 'pointer' : 'grab' }}
      />

      {hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-56 rounded-xs border border-[var(--tone-line-strong)] bg-white/95 px-2 py-1 shadow-md backdrop-blur-[2px]"
          style={{ left: pointer.x + 14, top: pointer.y + 14 }}
        >
          <p className="truncate text-[0.6875rem] font-semibold text-[var(--tone-ink)]">
            {hovered.name}
          </p>
          <p className="truncate font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-[var(--tone-muted-dark)]">
            {hovered.ifcClass}
          </p>
        </div>
      )}
    </div>
  )
}
