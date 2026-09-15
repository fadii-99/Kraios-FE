import { useCallback, useEffect, useRef, useState } from 'react'
import { WarningCircle } from '@phosphor-icons/react'

import { SemanticScene } from '@/lib/floorplan3d/SemanticScene'
import { cn } from '@/lib/cn'

/**
 * Whether this browser can give us a WebGL context at all.
 *
 * A PURE probe on a throwaway canvas, run during render rather than in an
 * effect, so "no 3D on this machine" is a rendering decision and not a state
 * update that has to be pushed after the fact. It covers every predictable
 * cause: an old machine, a blocked or blacklisted GPU, a headless browser, a
 * hardened privacy setting.
 *
 * Returns a message to show, or null when WebGL is available.
 */
function detectWebGLFailure() {
  if (typeof window === 'undefined' || typeof globalThis.document === 'undefined') {
    return 'A 3D view needs a browser.'
  }
  try {
    const canvas = globalThis.document.createElement('canvas')
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!context) {
      return 'This browser or graphics driver does not support WebGL, so the 3D view cannot start. The plan data and the downloads still work.'
    }
    // Release it immediately: a probe that leaves a live context behind counts
    // against the browser's per-page context limit, and the real viewport needs
    // one of those.
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return null
  } catch {
    return 'This browser could not start a 3D view. The plan data and the downloads still work.'
  }
}

/**
 * A thin React shell over `SemanticScene`.
 *
 * The component's ONLY jobs are: mount a div, construct the scene once, forward
 * declarative props into method calls, and dispose on unmount. Everything
 * imperative — the renderer, the camera, the animation loop, picking, the
 * gizmo — lives in the class. That is what keeps this file a hundred lines
 * instead of five hundred, and what lets it satisfy
 * `react-hooks/immutability` rather than fight it.
 *
 * WEBGL CAN FAIL, AND IT FAILS IN TWO DIFFERENT WAYS
 *
 *   - No context at all: an old machine, a blocked GPU, a headless browser.
 *     Constructing `WebGLRenderer` throws, and the fallback below is what the
 *     user sees instead of a blank rectangle.
 *   - A LOST context: the driver reset, or the tab was backgrounded on a
 *     memory-constrained machine. The canvas goes blank with no error. The
 *     scene forwards `webglcontextlost` here so the user is told and offered a
 *     reload, rather than concluding the feature is broken.
 */
export default function SceneViewport({
  document: semanticDocument,
  catalog,
  selectedId,
  hiddenElementIds,
  hiddenCategories,
  isolatedLevelId,
  projection = 'orthographic',
  transformMode = null,
  quality = 'high',
  gridVisible = false,
  axesVisible = false,
  section = null,
  measuring = false,
  onSelect,
  onHover,
  onTransform,
  onMeasure,
  onReady,
  className,
}) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  // Probed once, during the first render. See `detectWebGLFailure`.
  const [failure, setFailure] = useState(detectWebGLFailure)
  const [contextLost, setContextLost] = useState(false)

  // Callbacks are held in refs so the scene is constructed ONCE. Passing them
  // into the construction effect's dependencies would tear down and rebuild the
  // whole renderer every time a parent re-rendered with a new arrow function.
  const callbacks = useRef({})
  useEffect(() => {
    callbacks.current = { onSelect, onHover, onTransform, onMeasure, onReady }
  }, [onSelect, onHover, onTransform, onMeasure, onReady])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || failure) return undefined

    let scene
    try {
      scene = new SemanticScene(mount, {
        quality,
        onSelect: (entry) => callbacks.current.onSelect?.(entry),
        onHover: (entry) => callbacks.current.onHover?.(entry),
        onMeasure: (result) => callbacks.current.onMeasure?.(result),
        onContextLost: () => setContextLost(true),
      })
      scene.onTransform = (change) => callbacks.current.onTransform?.(change)
    } catch (caught) {
      // The probe above said WebGL was available and construction still failed
      // - a driver that accepted a probe context and refused a real one, or a
      // browser at its context limit. Rare, and the user still has to be told
      // rather than shown an empty rectangle.
      //
      // Reported through a microtask so the state update is an EVENT rather
      // than something that happens inside the effect body, which is what
      // `react-hooks/set-state-in-effect` is right to object to.
      const message =
        caught?.message ||
        'This browser could not start a 3D view. The plan data and the downloads still work.'
      queueMicrotask(() => setFailure(message))
      return undefined
    }

    sceneRef.current = scene
    callbacks.current.onReady?.(scene)

    return () => {
      sceneRef.current = null
      scene.dispose()
    }
    // `quality` and `failure` are deliberately not dependencies: a quality
    // change is handled by its own effect below (rebuilding the renderer would
    // lose the user's camera), and `failure` only ever goes from null to a
    // message, at which point this effect's cleanup has already run.
  }, [failure, quality])

  // The document. `preserveView` on every change EXCEPT the first, so an edit
  // does not throw the user out of whatever they were looking at.
  const seenDocument = useRef(false)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setDocument(semanticDocument, {
      catalog,
      preserveView: seenDocument.current,
    })
    seenDocument.current = Boolean(semanticDocument)
  }, [semanticDocument, catalog])

  useEffect(() => {
    sceneRef.current?.select(selectedId ?? null)
  }, [selectedId])

  useEffect(() => {
    sceneRef.current?.setHiddenElements(hiddenElementIds)
  }, [hiddenElementIds])

  useEffect(() => {
    sceneRef.current?.setHiddenCategories(hiddenCategories)
  }, [hiddenCategories])

  useEffect(() => {
    sceneRef.current?.isolateLevel(isolatedLevelId ?? null)
  }, [isolatedLevelId])

  useEffect(() => {
    sceneRef.current?.setProjection(projection)
  }, [projection])

  useEffect(() => {
    sceneRef.current?.setTransformMode(transformMode)
  }, [transformMode])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    // `setQuality` reports true when the change swapped the material class
    // between physically-based and Lambert, which existing materials cannot be
    // converted into in place. Rebuilding is the only way to apply it, and
    // `preserveView` keeps the user where they were looking.
    if (scene.setQuality(quality)) {
      scene.setDocument(semanticDocument, { catalog, preserveView: true })
    }
  }, [quality, semanticDocument, catalog])

  useEffect(() => {
    sceneRef.current?.setGridVisible(gridVisible)
  }, [gridVisible])

  useEffect(() => {
    sceneRef.current?.setAxesVisible(axesVisible)
  }, [axesVisible])

  useEffect(() => {
    sceneRef.current?.setSection(Boolean(section?.enabled), section?.heightMm ?? 1200)
  }, [section])

  useEffect(() => {
    sceneRef.current?.setMeasuring(measuring)
  }, [measuring])

  const reload = useCallback(() => {
    // A lost context cannot be recovered in place without rebuilding every
    // GPU resource, and a full reload is both simpler and what the user
    // expects from "try again".
    window.location.reload()
  }, [])

  if (failure) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 rounded-md border border-[var(--tone-line)] bg-white p-8 text-center',
          className,
        )}
      >
        <WarningCircle size={28} className="text-[var(--color-warning)]" />
        <p className="text-sm font-medium text-[var(--tone-ink)]">
          3D view unavailable
        </p>
        <p className="max-w-sm text-xs text-[var(--tone-ink-soft)]">{failure}</p>
      </div>
    )
  }

  return (
    <div className={cn('relative h-full min-h-0 w-full', className)}>
      <div ref={mountRef} className="h-full min-h-0 w-full [&>canvas]:block" />

      {contextLost && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/92 p-8 text-center">
          <WarningCircle size={28} className="text-[var(--color-warning)]" />
          <p className="text-sm font-medium text-[var(--tone-ink)]">
            The 3D view lost its graphics context
          </p>
          <p className="max-w-sm text-xs text-[var(--tone-ink-soft)]">
            This usually means the graphics driver reset. Your saved revisions are
            unaffected.
          </p>
          <button
            type="button"
            onClick={reload}
            className="label-ui mt-1 cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-3.5 py-2 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
          >
            Reload the editor
          </button>
        </div>
      )}
    </div>
  )
}
