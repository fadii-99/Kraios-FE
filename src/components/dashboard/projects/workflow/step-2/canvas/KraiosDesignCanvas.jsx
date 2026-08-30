import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Check,
  HighlighterCircle,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  PencilSimple,
  Sparkle,
  Trash,
  X,
} from '@phosphor-icons/react'

import Logo from '@/components/ui/Logo'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

const COLOR_SWATCHES = [
  { id: 'crimson', hex: '#EF4444', label: 'Crimson Red' },
  { id: 'amber', hex: '#F59E0B', label: 'Amber Orange' },
  { id: 'emerald', hex: '#10B981', label: 'Emerald Green' },
  { id: 'sky', hex: '#0EA5E9', label: 'Sky Cyan' },
  { id: 'brand', hex: '#2563EB', label: 'Brand Blue' },
  { id: 'indigo', hex: '#6366F1', label: 'Indigo Purple' },
  { id: 'rose', hex: '#EC4899', label: 'Rose Pink' },
  { id: 'charcoal', hex: '#0F172A', label: 'Charcoal Black' },
  { id: 'slate', hex: '#64748B', label: 'Muted Slate' },
  { id: 'white', hex: '#FFFFFF', label: 'Pure White' },
]

/**
 * The 2 primary markup tools: Markup Pen and Marker (Highlighter).
 */
const CANVAS_TOOLS = [
  { id: 'brush', label: 'Markup Pen', icon: PencilSimple, shortcut: 'P' },
  { id: 'highlighter', label: 'Marker Tool', icon: HighlighterCircle, shortcut: 'M' },
]

const BRUSH_PRESETS = [2, 4, 8, 14, 20]

const MAX_HISTORY = 30

/**
 * Kraios Design Canvas (Light Theme Architectural Studio)
 *
 * Full-featured interactive light-themed architectural markup studio:
 * - 2 specialized drawing tools: Markup Pen & Marker
 * - Dynamic Right-Side Edit Prompt Panel: automatically opens when drawing, with a cross (×) to return
 * - Captures composite marked canvas image snapshot on Proceed
 * - Light-themed architectural viewport with zoom & reset
 */
export default function KraiosDesignCanvas({
  result,
  onBack,
  onRegenerate,
  title = 'Kraios Design Canvas',
  subtitle = 'Mark regions & annotate spatial adjustments directly on the plan',
  badge = 'AI Canvas Studio',
  prompt = 'Refine model based on marked canvas annotations.',
  helpText = 'Click & drag to draw adjustments on the plan, then write edit instructions.',
}) {
  const [activeTool, setActiveTool] = useState('brush')
  const [activeColor, setActiveColor] = useState(COLOR_SWATCHES[0].hex)
  const [brushWidth, setBrushWidth] = useState(6)
  const [zoomLevel, setZoomLevel] = useState(100)

  // Edit instructions panel state
  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')

  // Canvas drawing state
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const snapshot = canvas.toDataURL()

    const willTrim = historyIndex + 2 > MAX_HISTORY

    setHistory((prev) => {
      const updated = [...prev.slice(0, historyIndex + 1), snapshot]
      return updated.length <= MAX_HISTORY
        ? updated
        : updated.slice(updated.length - MAX_HISTORY)
    })

    setHistoryIndex(willTrim ? MAX_HISTORY - 1 : historyIndex + 1)
  }, [historyIndex])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const initial = canvas.toDataURL()
    setHistory([initial])
    setHistoryIndex(0)
  }, [])

  // Coordinate calculator
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(x, y)

    if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = `${activeColor}66` // 40% opacity for highlighter
      ctx.lineWidth = brushWidth * 2.2
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = activeColor
      ctx.lineWidth = brushWidth
    }

    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.closePath()
    setIsDrawing(false)
    pushHistory()

    // Automatically open the Edit Instructions Prompt panel upon drawing
    setShowPromptPanel(true)
  }

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.src = history[prevIndex]
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(img, 0, 0)
      }
      setHistoryIndex(prevIndex)
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.src = history[nextIndex]
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(img, 0, 0)
      }
      setHistoryIndex(nextIndex)
    }
  }, [history, historyIndex])

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

      if (isEditable) return

      const key = event.key.toLowerCase()

      if (event.ctrlKey || event.metaKey) {
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
          event.preventDefault()
          handleRedo()
        }
        return
      }

      if (event.altKey) return

      if (key === 'p') {
        event.preventDefault()
        setActiveTool('brush')
      } else if (key === 'm' || key === 'h') {
        event.preventDefault()
        setActiveTool('highlighter')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const handleReset = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pushHistory()
  }

  const handleZoom = (direction) => {
    if (direction === 'in') {
      setZoomLevel((prev) => Math.min(prev + 20, 200))
    } else if (direction === 'out') {
      setZoomLevel((prev) => Math.max(prev - 20, 50))
    } else {
      setZoomLevel(100)
    }
  }

  /**
   * Generates a composite snapshot (merging base image + user drawing)
   * and dispatches onRegenerate with prompt text, target result, and composite snapshot.
   */
  const handleApplyRegenerate = () => {
    const promptText =
      editPrompt.trim() || prompt || 'Refine plan based on marked canvas annotations.'

    const overlayCanvas = canvasRef.current
    const baseImageUrl = result?.imageUrl || result?.previewUrl

    if (!overlayCanvas || !baseImageUrl) {
      onRegenerate?.(promptText, result, null)
      return
    }

    // Create an off-screen merged canvas
    const offscreen = document.createElement('canvas')
    offscreen.width = overlayCanvas.width
    offscreen.height = overlayCanvas.height
    const offCtx = offscreen.getContext('2d')

    const baseImg = new Image()
    baseImg.crossOrigin = 'anonymous'
    baseImg.src = baseImageUrl

    baseImg.onload = () => {
      // Draw background white fill
      offCtx.fillStyle = '#FFFFFF'
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height)

      // Draw base image centered with contain aspect ratio
      const hRatio = offscreen.width / baseImg.width
      const vRatio = offscreen.height / baseImg.height
      const ratio = Math.min(hRatio, vRatio)
      const centerShiftX = (offscreen.width - baseImg.width * ratio) / 2
      const centerShiftY = (offscreen.height - baseImg.height * ratio) / 2

      offCtx.drawImage(
        baseImg,
        0,
        0,
        baseImg.width,
        baseImg.height,
        centerShiftX,
        centerShiftY,
        baseImg.width * ratio,
        baseImg.height * ratio,
      )

      // Draw user's annotations overlay
      offCtx.drawImage(overlayCanvas, 0, 0)

      const compositeSnapshotUrl = offscreen.toDataURL('image/png')
      onRegenerate?.(promptText, result, compositeSnapshotUrl)
    }

    baseImg.onerror = () => {
      // Fallback: use overlay canvas alone
      const overlaySnapshotUrl = overlayCanvas.toDataURL('image/png')
      onRegenerate?.(promptText, result, overlaySnapshotUrl)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--tone-canvas,#f8fafc)] text-[var(--tone-ink)] animate-in fade-in-0 duration-300">
      {/* ── 1. Top Light Header Bar ── */}
      <header className="flex h-15 shrink-0 items-center justify-between border-b border-[var(--tone-line)] bg-white px-4 sm:px-6 shadow-2xs z-30">
        {/* Left Section: Brand Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-brand-deep)]/25 bg-[var(--color-brand-deep)]/5 p-1 shadow-2xs">
            <Logo size="compact" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="font-display text-[0.9375rem] font-black uppercase tracking-tight text-[var(--tone-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {title}
              </h1>
              <span className="rounded-xs border border-[var(--color-brand-deep)]/30 bg-[var(--color-brand-deep)]/10 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                {badge}
              </span>
            </div>
            <p className="hidden text-[0.6875rem] font-medium text-[var(--tone-muted-dark)] sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Center: Integrated Floating Action Dock */}
        <div className="hidden items-center gap-1 rounded-sm border border-[var(--tone-line)] bg-slate-50/80 p-1 shadow-2xs md:flex">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              aria-label="Undo action"
              title="Undo (Ctrl+Z)"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-xs text-[var(--tone-ink)] transition-colors hover:bg-white hover:shadow-2xs disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowCounterClockwise size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              aria-label="Redo action"
              title="Redo (Ctrl+Y)"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-xs text-[var(--tone-ink)] transition-colors hover:bg-white hover:shadow-2xs disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowClockwise size={14} weight="bold" />
            </button>
          </div>

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--tone-line)]" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleZoom('out')}
              aria-label="Zoom out"
              title="Zoom out"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-xs text-[var(--tone-ink)] transition-colors hover:bg-white hover:shadow-2xs"
            >
              <MagnifyingGlassMinus size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom('reset')}
              title="Reset Zoom to 100%"
              className="px-2 text-[0.6875rem] font-bold text-[var(--tone-ink)] font-display"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => handleZoom('in')}
              aria-label="Zoom in"
              title="Zoom in"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-xs text-[var(--tone-ink)] transition-colors hover:bg-white hover:shadow-2xs"
            >
              <MagnifyingGlassPlus size={14} weight="bold" />
            </button>
          </div>

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--tone-line)]" />

          {/* Reset Canvas */}
          <button
            type="button"
            onClick={handleReset}
            title="Clear all annotations"
            className="flex h-7.5 cursor-pointer items-center gap-1 rounded-xs px-2 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-rose-600 transition-colors hover:bg-rose-50 font-display"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Trash size={12} weight="bold" />
            <span>Clear</span>
          </button>
        </div>

        {/* Right Section: Exit / Close */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Close canvas"
            title="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line)] bg-white text-[var(--tone-muted-dark)] transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </header>

      {/* ── 2. Studio Body (Canvas on Left + Dynamic Right Panel) ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main Canvas Viewport Stage (Left) */}
        <main className="relative flex flex-1 items-center justify-center overflow-auto p-6 sm:p-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-100/70">
          {/* Main Drawing Stage Card */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="relative flex items-center justify-center rounded-md border border-[var(--tone-line-strong)] bg-white p-4 shadow-[0_20px_50px_rgba(7,20,38,0.09),0_1px_3px_rgba(0,0,0,0.05)]"
          >
            {/* Top Stage Scale Badge */}
            <div className="pointer-events-none absolute -top-3 left-4 rounded-xs border border-slate-300 bg-white px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-600 shadow-2xs font-display">
              Kraios Architectural Stage • 1:50
            </div>

            {/* Base Image Under Edit */}
            <img
              src={result?.imageUrl || result?.previewUrl}
              alt="Floor plan under edit"
              className="max-h-[66vh] max-w-[62vw] select-none object-contain rounded-xs pointer-events-none"
              draggable={false}
            />

            {/* HTML5 Canvas Drawing Overlay Layer */}
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] touch-none rounded-xs cursor-crosshair"
            />
          </div>

          {/* Floating Bottom Help Indicator */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-200/90 bg-white/95 px-4 py-1.5 text-[0.6875rem] font-medium text-slate-700 shadow-sm backdrop-blur-xs">
            {helpText}
          </div>
        </main>

        {/* ── Right Panel: Toggle between Drawing Tools & Edit Instructions Panel ── */}
        <aside className="flex w-80 shrink-0 flex-col justify-between border-l border-[var(--tone-line)] bg-white p-4.5 overflow-y-auto shadow-2xs z-20">
          {showPromptPanel ? (
            /* Mode B: Edit Instructions Prompt Panel */
            <div className="flex flex-col h-full justify-between gap-4 animate-in fade-in-50 slide-in-from-right-4 duration-200">
              <div className="flex flex-col gap-4">
                {/* Header with Close (×) button */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkle size={15} weight="fill" className="text-[var(--color-brand-deep)]" />
                    <span
                      className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)] font-display"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Edit Instructions
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPromptPanel(false)}
                    aria-label="Back to drawing tools"
                    title="Return to drawing tools"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>

                {/* Status indicator */}
                <div className="rounded-xs border border-blue-100 bg-blue-50/70 p-2.5 text-[0.6875rem] text-slate-700">
                  <p className="font-bold text-[var(--color-brand-deep)] uppercase text-[0.5625rem] tracking-wider mb-0.5">
                    Area Marked
                  </p>
                  <p className="leading-snug text-slate-600">
                    Describe the adjustments you want made to the highlighted section.
                  </p>
                </div>

                {/* Prompt Textarea */}
                <div className="flex-1">
                  <label
                    htmlFor="canvas-edit-prompt"
                    className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-display"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Prompt Instructions
                  </label>
                  <textarea
                    id="canvas-edit-prompt"
                    rows={6}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., Expand living room wall, remove partition, add modern sliding glass door..."
                    className="w-full rounded-md border border-[var(--tone-line-strong)] bg-slate-50/80 p-2.5 text-[0.8125rem] text-[var(--tone-ink)] placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-deep)]/15 resize-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Bottom Action: PROCEED Button */}
              <div className="pt-3 border-t border-slate-100">
                <PrimaryButton
                  type="button"
                  onClick={handleApplyRegenerate}
                  variant="solid"
                  size="md"
                  align="center"
                  withArrow={false}
                  className="w-full text-[0.75rem] font-bold uppercase tracking-wider shadow-sm"
                >
                  <span>Proceed</span>
                </PrimaryButton>
              </div>
            </div>
          ) : (
            /* Mode A: 2 Drawing Tools & Palette Panel */
            <div className="flex flex-col h-full justify-between gap-5">
              <div className="flex flex-col gap-5">
                {/* Tool Selection Section (Only Pen & Marker) */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-muted-dark)] font-display"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Drawing Tools
                    </span>
                    <span className="text-[0.5625rem] font-bold uppercase text-[var(--color-brand-deep)]">
                      {CANVAS_TOOLS.find((t) => t.id === activeTool)?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {CANVAS_TOOLS.map((tool) => {
                      const Icon = tool.icon
                      const isActive = activeTool === tool.id
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => setActiveTool(tool.id)}
                          aria-label={tool.label}
                          title={`${tool.label} (${tool.shortcut})`}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1.5 rounded-sm border p-3 transition-all duration-150 cursor-pointer',
                            isActive
                              ? 'border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)] text-white shadow-xs scale-[1.02]'
                              : 'border-[var(--tone-line)] bg-white text-[var(--tone-ink)] hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <Icon size={20} weight={isActive ? 'fill' : 'bold'} />
                          <span
                            className="text-[0.625rem] font-bold uppercase tracking-[0.06em] font-display"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {tool.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Color Swatch Palette */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-muted-dark)] font-display"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Annotation Color
                    </span>
                    <span
                      className="h-4 w-4 rounded-full border border-slate-300 shadow-xs ring-2 ring-white"
                      style={{ backgroundColor: activeColor }}
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_SWATCHES.map((color) => {
                      const isSelected = activeColor === color.hex
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setActiveColor(color.hex)}
                          aria-label={`Select ${color.label}`}
                          title={color.label}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border transition-transform duration-150 cursor-pointer shadow-2xs',
                            isSelected
                              ? 'border-white ring-2 ring-[var(--color-brand-deep)] scale-110'
                              : 'border-slate-200 hover:scale-105',
                          )}
                          style={{ backgroundColor: color.hex }}
                        >
                          {isSelected && (
                            <Check
                              size={13}
                              weight="bold"
                              className={cn(
                                color.id === 'white' || color.id === 'amber'
                                  ? 'text-slate-900'
                                  : 'text-white',
                              )}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Stroke / Brush Size */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-muted-dark)] font-display"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Stroke Width
                    </span>
                    <span className="rounded-xs border border-[var(--color-brand-deep)]/25 bg-[var(--color-brand-deep)]/10 px-2 py-0.5 text-[0.625rem] font-bold text-[var(--color-brand-deep)]">
                      {brushWidth}px
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="mb-2.5 flex items-center justify-between gap-1">
                    {BRUSH_PRESETS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setBrushWidth(size)}
                        className={cn(
                          'flex-1 rounded-xs border py-1 text-[0.625rem] font-bold transition-colors cursor-pointer',
                          brushWidth === size
                            ? 'border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)] text-white'
                            : 'border-[var(--tone-line)] bg-slate-50 text-[var(--tone-ink)] hover:bg-white',
                        )}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="2"
                    max="24"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[var(--color-brand-deep)]"
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
