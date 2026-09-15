import { useMemo, useState } from 'react'
import { CheckCircle, Ruler } from '@phosphor-icons/react'

import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { sourceFileUrl } from '@/lib/api/floorplan3d'
import { formatMetres } from '@/lib/floorplan3d/adapters'
import { documentBounds } from '@/lib/floorplan3d/semanticModel'
import { cn } from '@/lib/cn'

/**
 * Settling the document's scale — by RECOGNITION first, by measurement second.
 *
 * WHY THIS CONTROL EXISTS. A plan without a printed scale, a scale bar or a
 * parsed dimension has no scale, and the pipeline says so rather than inventing
 * one. That leaves the user with a model whose proportions are right and whose
 * dimensions are provisional — and one number is all it takes to fix every
 * dimension at once, because the document keeps `pixels_to_mm` as ONE number.
 *
 * ASKING FOR A MEASURED DISTANCE IS THE HARD QUESTION, NOT THE EASY ONE.
 * "Click two points whose real distance you know" is unanswerable for anyone
 * reading a drawing they did not make: they know the BUILDING, not its
 * millimetres. Meanwhile the pipeline had usually already found the answer —
 * it found SEVERAL and ranked them badly, which is why `scale.candidates` keeps
 * every one it considered. So the candidates come first, each shown as the
 * overall size the building becomes if it is right. "Is your building 15 m
 * across or 20?" is a question the reader can answer by looking at it, and it
 * needs no tape measure. Measuring by hand stays, underneath, for the drawing
 * that genuinely suggested nothing.
 *
 * THE CLICKS ARE ON THE DRAWING, NOT THE MODEL. The scale relates the drawing's
 * pixels to millimetres, so it has to be measured in the drawing's own pixels.
 * The overlay converts from the displayed size to the NORMALISED PAGE PIXELS the
 * document's scale is defined against, using the page size the pipeline
 * recorded — so the browser and the server agree about the unit.
 */

// How each candidate's `source` reads to somebody who did not write the
// pipeline. The enum is the backend's (`ScaleSource`); an unknown value falls
// back to the raw string rather than to a guess.
const SOURCE_LABEL = {
  dxf_units: 'From the drawing file’s own units',
  scale_ratio: 'From a printed scale, like “1:100”',
  scale_bar: 'From the scale bar on the sheet',
  dimension_string: 'From dimensions printed on the drawing',
  room_area_label: 'From a room’s printed area',
  standard_opening: 'From a standard door used as a ruler',
  manual: 'Measured by hand',
  unknown: 'From the drawing',
}

export default function ScaleCalibrationModal({
  open,
  onClose,
  conversion,
  document: semanticDocument,
  onCalibrate,
  saving,
}) {
  const [points, setPoints] = useState([])
  const [distanceText, setDistanceText] = useState('')
  const [error, setError] = useState('')
  const [measuring, setMeasuring] = useState(false)

  const transform = semanticDocument?.levels?.[0]?.source_page_transform ?? null
  const pageWidth = transform?.page_width_px || conversion?.source?.width || 0
  const pageHeight = transform?.page_height_px || conversion?.source?.height || 0

  const imageUrl = conversion?.source?.id ? sourceFileUrl(conversion.source.id) : null

  /**
   * Each candidate, as the SIZE the building becomes under it.
   *
   * A candidate is a `pixels_to_mm`, which means nothing to a reader. The same
   * number expressed as "15.1 × 6.3 m" is the building they are looking at, or
   * it is obviously not — and that is the whole decision. The current scale is
   * one of these, marked, so choosing is comparing rather than guessing.
   */
  const options = useMemo(() => {
    const current = semanticDocument?.scale?.pixels_to_mm
    const bounds = documentBounds(semanticDocument)
    if (!current || !bounds) return []
    const width = bounds[2] - bounds[0]
    const height = bounds[3] - bounds[1]

    return (semanticDocument?.scale?.candidates ?? [])
      .map((candidate, index) => {
        const pixelsToMm = Number(candidate?.pixels_to_mm)
        if (!Number.isFinite(pixelsToMm) || pixelsToMm <= 0) return null
        const factor = pixelsToMm / current
        // The same ceiling the server enforces, so a candidate it would refuse
        // is never offered as a button.
        if (factor < 0.01 || factor > 100) return null
        return {
          index,
          factor,
          width: width * factor,
          height: height * factor,
          label: SOURCE_LABEL[candidate?.source] ?? String(candidate?.source ?? ''),
          evidence: String(candidate?.evidence ?? ''),
          // Floating point: the winning candidate IS the current scale, and it
          // must read as "in use now" rather than as a change that does nothing.
          isCurrent: Math.abs(factor - 1) < 1e-6,
        }
      })
      .filter(Boolean)
  }, [semanticDocument])

  // Whether there is actually a CHOICE here. A list whose only entry is the
  // scale already in use is not one, and hiding the measuring half behind a
  // link would leave that user with nothing to press.
  const hasAlternative = options.some((option) => !option.isCurrent)

  const pixelDistance = useMemo(() => {
    if (points.length < 2) return 0
    return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
  }, [points])

  const close = () => {
    setPoints([])
    setDistanceText('')
    setError('')
    setMeasuring(false)
    onClose()
  }

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height || !pageWidth || !pageHeight) return

    // Displayed pixels -> normalised page pixels. Without this the calibration
    // would depend on the size of the user's window.
    const x = ((event.clientX - rect.left) / rect.width) * pageWidth
    const y = ((event.clientY - rect.top) / rect.height) * pageHeight

    setPoints((current) => (current.length >= 2 ? [{ x, y }] : [...current, { x, y }]))
    setError('')
  }

  const applyCandidate = async (index) => {
    const ok = await onCalibrate({ candidateIndex: index })
    if (ok) close()
  }

  const submit = async () => {
    const millimetres = Number(distanceText)
    if (points.length < 2) {
      setError('Click two points on the drawing first.')
      return
    }
    if (!Number.isFinite(millimetres) || millimetres <= 0) {
      setError('Enter the real distance between those two points, in millimetres.')
      return
    }
    if (pixelDistance < 1) {
      setError('Those two points are too close together to measure.')
      return
    }
    const ok = await onCalibrate({ pixelDistance, realDistanceMm: millimetres })
    if (ok) close()
  }

  return (
    <Modal open={open} onClose={close} title="Confirm the size" size="wide">
      <div className="space-y-4">
        {options.length > 0 ? (
          <>
            <p className="text-sm leading-relaxed text-[var(--tone-ink-soft)]">
              {hasAlternative
                ? 'The drawing suggested more than one size, and the model is using one of them. Pick the one that matches the real building — you do not need to measure anything.'
                : 'This is the only size the drawing suggested, and the model is using it. If the building is not this size, measure it below.'}
            </p>

            <ul className="space-y-2">
              {options.map((option) => (
                <li key={option.index}>
                  <button
                    type="button"
                    disabled={saving || option.isCurrent}
                    onClick={() => applyCandidate(option.index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors',
                      option.isCurrent
                        ? 'cursor-default border-[var(--color-brand-deep)] bg-[color-mix(in_oklab,var(--color-brand)_6%,transparent)]'
                        : 'cursor-pointer border-[var(--tone-line)] hover:border-[var(--tone-accent)] hover:bg-[var(--color-light)]',
                      saving && !option.isCurrent && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--tone-ink)]">
                        {formatMetres(option.width, 1)} ×{' '}
                        {formatMetres(option.height, 1)}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] text-[var(--tone-ink-soft)]">
                        {option.label}
                      </p>
                      {option.evidence && (
                        <p className="mt-0.5 truncate text-[0.625rem] text-[var(--tone-ink-soft)]">
                          {option.evidence}
                        </p>
                      )}
                    </div>
                    {option.isCurrent ? (
                      <span className="label-ui flex shrink-0 items-center gap-1 text-[var(--color-brand-deep)]">
                        <CheckCircle size={14} weight="fill" />
                        In use now
                      </span>
                    ) : (
                      <span className="label-ui shrink-0 text-[var(--tone-accent)]">
                        Use this
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--tone-ink-soft)]">
            Nothing on this drawing stated its size, so it has to be measured.
            Click two points whose real distance you know — the two ends of a
            printed dimension is ideal — then type that distance.
          </p>
        )}

        {hasAlternative && !measuring && (
          <button
            type="button"
            onClick={() => setMeasuring(true)}
            className="label-ui inline-flex cursor-pointer items-center gap-1.5 border-t border-[var(--tone-line)] pt-3 text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
          >
            <Ruler size={14} />
            None of these is right — let me measure it
          </button>
        )}

        {(measuring || !hasAlternative) && (
          <div className="space-y-4 border-t border-[var(--tone-line)] pt-4">
            {!pageWidth || !pageHeight ? (
              <p className="rounded-md border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-3 text-xs text-[var(--tone-ink)]">
                This conversion did not record the drawing’s pixel size, so it
                cannot be calibrated by clicking. Convert the plan again.
              </p>
            ) : (
              <div className="relative overflow-hidden rounded-md border border-[var(--tone-line)] bg-[var(--color-light)]">
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={handleClick}
                    className="relative block w-full cursor-crosshair"
                    aria-label="Click two points on the drawing"
                  >
                    <img
                      src={imageUrl}
                      alt="The uploaded floor plan"
                      className="block max-h-[52vh] w-full object-contain"
                      draggable={false}
                    />
                    <svg
                      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      {points.length === 2 && (
                        <line
                          x1={points[0].x}
                          y1={points[0].y}
                          x2={points[1].x}
                          y2={points[1].y}
                          stroke="var(--color-brand-deep)"
                          strokeWidth={Math.max(2, pageWidth / 400)}
                        />
                      )}
                      {points.map((point, index) => (
                        <circle
                          key={index}
                          cx={point.x}
                          cy={point.y}
                          r={Math.max(4, pageWidth / 180)}
                          fill="var(--color-brand-deep)"
                        />
                      ))}
                    </svg>
                  </button>
                ) : (
                  <p className="p-6 text-center text-xs text-[var(--tone-ink-soft)]">
                    The original drawing could not be loaded.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-40 flex-1">
                <span className="mb-1 block text-[0.625rem] font-medium uppercase tracking-[0.08em] text-[var(--tone-ink-soft)]">
                  Real distance (mm)
                </span>
                <input
                  type="number"
                  min={1}
                  value={distanceText}
                  onChange={(event) => setDistanceText(event.target.value)}
                  placeholder="e.g. 12500"
                  className="w-full rounded-sm border border-[var(--tone-line)] bg-white px-3 py-2 text-sm text-[var(--tone-ink)] outline-none transition-colors focus:border-[var(--color-brand-deep)]"
                />
              </label>
              <div className="text-xs text-[var(--tone-ink-soft)]">
                <p>
                  Measured:{' '}
                  <span className="font-medium text-[var(--tone-ink)]">
                    {pixelDistance.toFixed(0)} px
                  </span>
                </p>
                {pixelDistance > 0 && Number(distanceText) > 0 && (
                  <p>
                    New scale:{' '}
                    <span className="font-medium text-[var(--tone-ink)]">
                      {(Number(distanceText) / pixelDistance).toFixed(3)} mm per pixel
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPoints([])}
                  className="label-ui h-11 cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-4 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
                >
                  Clear points
                </button>
                <PrimaryButton
                  size="compact"
                  withArrow={false}
                  loading={saving}
                  onClick={submit}
                >
                  Apply
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

        <p className="border-t border-[var(--tone-line)] pt-3 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
          Wall and ceiling heights are not rescaled: they came from a
          building-type default rather than from the drawing, so a scale
          correction should not change them.
        </p>
      </div>
    </Modal>
  )
}
