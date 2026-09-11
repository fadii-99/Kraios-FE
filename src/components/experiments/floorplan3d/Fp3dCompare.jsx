import { useCallback, useMemo, useRef, useState } from 'react'
import { Ruler, X } from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import Fp3dPlan2D from '@/components/experiments/floorplan3d/Fp3dPlan2D'
import { sourceFileUrl } from '@/lib/api/floorplan3d'
import { cn } from '@/lib/cn'

/**
 * The uploaded drawing beside — or under — what the engine made of it.
 *
 * WHY THIS SCREEN EXISTS. The only way to tell a good conversion from a
 * confident wrong one is to look at both. A quality score says how internally
 * consistent the model is; it cannot say "this is not my building". A person
 * looking at the two together can, in about two seconds.
 *
 * Two modes, and both earn their place: side by side is for reading the
 * drawing's own annotation, and overlay is for checking that walls landed
 * where walls are.
 *
 * CALIBRATION LIVES HERE, and nowhere else, because it is a measurement taken
 * ON THE DRAWING. Two clicks and a real distance is all it is; putting it in a
 * separate dialogue would mean picking points on a picture the user cannot see
 * while they type the number.
 */
export default function Fp3dCompare({
  source,
  model,
  selectedId,
  flaggedIds,
  visibleLevelIds,
  onSelect,
  calibrating,
  onCalibrate,
  calibrationBusy,
  className,
}) {
  const [mode, setMode] = useState('side')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [points, setPoints] = useState([])
  const [distance, setDistance] = useState('')
  const [measuring, setMeasuring] = useState(false)
  // The drawing's own pixel size, captured when it loads. Held in STATE rather
  // than read off the ref during render: a ref is not a render input, and the
  // markers below are positioned from it on every render.
  const [naturalSize, setNaturalSize] = useState(null)
  const imageRef = useRef(null)

  const canOverlay = !source?.isPdf && !source?.isDxf

  /**
   * A click on the drawing, in SOURCE IMAGE pixels.
   *
   * The image is displayed at whatever size the layout gives it, so a click at
   * (120, 80) on screen is not (120, 80) in the file. `naturalWidth` is what
   * turns one into the other — and the server's calibration works in source
   * pixels because that is the frame the model's own scale is anchored to.
   */
  const onDrawingClick = useCallback((event) => {
    if (!measuring) return
    const image = imageRef.current
    if (!image || !image.naturalWidth) return
    const rect = image.getBoundingClientRect()
    // `object-contain` letterboxes the image inside its box, so the drawn area
    // is not the element's area. Without this the two are only the same when
    // the aspect ratios happen to match.
    const scale = Math.min(
      rect.width / image.naturalWidth,
      rect.height / image.naturalHeight,
    )
    const drawnWidth = image.naturalWidth * scale
    const drawnHeight = image.naturalHeight * scale
    const offsetX = (rect.width - drawnWidth) / 2
    const offsetY = (rect.height - drawnHeight) / 2

    const x = (event.clientX - rect.left - offsetX) / scale
    const y = (event.clientY - rect.top - offsetY) / scale
    if (x < 0 || y < 0 || x > image.naturalWidth || y > image.naturalHeight) return

    setPoints((current) => (current.length >= 2 ? [[x, y]] : [...current, [x, y]]))
  }, [measuring])

  const pixelDistance = useMemo(() => {
    if (points.length < 2) return null
    return Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1])
  }, [points])

  const submitCalibration = () => {
    const metres = Number(distance)
    if (points.length < 2 || !Number.isFinite(metres) || metres <= 0) return
    onCalibrate(points[0], points[1], metres)
  }

  return (
    <div className={cn('flex min-h-0 flex-col bg-white', className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--tone-line)] px-3 py-2">
        <div className="flex items-center gap-1" role="group" aria-label="Compare mode">
          <ModeButton active={mode === 'side'} onClick={() => setMode('side')}>
            Side by side
          </ModeButton>
          <ModeButton
            active={mode === 'overlay'}
            disabled={!canOverlay}
            title={canOverlay ? undefined
              : 'Overlay needs a raster drawing; this source is a PDF or DXF.'}
            onClick={() => setMode('overlay')}
          >
            Overlay
          </ModeButton>
        </div>

        {mode === 'overlay' && (
          <label className="flex items-center gap-2 text-[0.75rem] text-[var(--tone-muted-dark)]">
            Model opacity
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={overlayOpacity}
              onChange={(event) => setOverlayOpacity(Number(event.target.value))}
              className="w-28 accent-[var(--color-brand-deep)]"
            />
          </label>
        )}

        {calibrating && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ModeButton
              active={measuring}
              onClick={() => {
                setMeasuring((value) => !value)
                setPoints([])
              }}
            >
              <Ruler size={13} weight="bold" aria-hidden="true" />
              {measuring ? 'Picking points…' : 'Calibrate the scale'}
            </ModeButton>

            {measuring && (
              <>
                <span className="text-[0.75rem] text-[var(--tone-muted-dark)]">
                  {points.length === 0 && 'Click the first point on the drawing.'}
                  {points.length === 1 && 'Now click the second point.'}
                  {points.length === 2
                    && `${pixelDistance.toFixed(0)} px apart. How far is that really?`}
                </span>
                {points.length === 2 && (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={distance}
                      onChange={(event) => setDistance(event.target.value)}
                      placeholder="metres"
                      className={cn(
                        'w-24 rounded-sm border border-[var(--tone-line-strong)] bg-white',
                        'px-2 py-1 text-[0.8125rem] tabular-nums',
                        'focus:border-[var(--color-brand-deep)] focus:outline-none',
                      )}
                    />
                    <PrimaryButton
                      size="xs"
                      withArrow={false}
                      loading={calibrationBusy}
                      loadingLabel="Rescaling"
                      disabled={!Number(distance)}
                      onClick={submitCalibration}
                    >
                      Rescale the model
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => setPoints([])}
                      aria-label="Clear the picked points"
                      className="rounded-xs p-1 text-[var(--tone-muted-dark)] hover:bg-[var(--color-light)]"
                    >
                      <X size={13} weight="bold" aria-hidden="true" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          'min-h-0 flex-1',
          mode === 'side' ? 'grid grid-cols-1 lg:grid-cols-2' : 'relative',
        )}
      >
        <div
          className={cn(
            'relative min-h-0 overflow-hidden bg-[var(--color-light)]',
            mode === 'side' && 'border-b lg:border-b-0 lg:border-r border-[var(--tone-line)]',
            mode === 'overlay' && 'absolute inset-0',
          )}
        >
          {source?.isPdf || source?.isDxf ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="text-[0.8125rem] text-[var(--tone-muted-dark)]">
                This source is a {source.isPdf ? 'PDF' : 'DXF'}. Its rendered
                pages were read by the engine, but the original is not shown
                inline — download it from the library to open it.
              </p>
            </div>
          ) : (
            <>
              <img
                ref={imageRef}
                src={sourceFileUrl(source.id)}
                alt={`Uploaded drawing: ${source.name}`}
                onClick={onDrawingClick}
                onLoad={(event) => setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                className={cn(
                  'h-full w-full object-contain',
                  measuring && 'cursor-crosshair',
                )}
              />
              {points.length > 0 && naturalSize && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  {/* Drawn in the element's own space rather than the image's,
                      which is why the markers are placed by percentage of the
                      natural size — the click already converted the other way. */}
                  {points.map((point, index) => (
                    <circle
                      key={index}
                      cx={`${(point[0] / naturalSize.width) * 100}%`}
                      cy={`${(point[1] / naturalSize.height) * 100}%`}
                      r="5"
                      fill="#1677ff"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              )}
            </>
          )}
          <span className="pointer-events-none absolute left-2 top-2 rounded-xs bg-white/90 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-[var(--tone-muted-dark)]">
            Your drawing
          </span>
        </div>

        <div
          className={cn(
            'relative min-h-0',
            mode === 'overlay' && 'absolute inset-0',
          )}
          style={mode === 'overlay' ? { opacity: overlayOpacity } : undefined}
        >
          <Fp3dPlan2D
            model={model}
            selectedId={selectedId}
            flaggedIds={flaggedIds}
            visibleLevelIds={visibleLevelIds}
            editable={false}
            showDimensions
            onSelect={onSelect}
            className={mode === 'overlay' ? 'bg-transparent' : undefined}
          />
          <span className="pointer-events-none absolute left-2 top-2 rounded-xs bg-white/90 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-[var(--color-brand-deep)]">
            What the engine read
          </span>
        </div>
      </div>
    </div>
  )
}

function ModeButton({ active, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5',
        'text-[0.75rem] font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-[var(--color-brand-deep)]',
        active
          ? 'border-[var(--color-brand-deep)] bg-[color-mix(in_oklab,var(--color-brand-deep)_9%,transparent)] text-[var(--color-brand-deep)]'
          : 'border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] hover:border-[var(--color-brand-deep)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
