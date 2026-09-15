import { useState } from 'react'
import { ArrowsOutSimple, X } from '@phosphor-icons/react'

import { sourceFileUrl } from '@/lib/api/floorplan3d'
import { cn } from '@/lib/cn'

/**
 * The original drawing, beside the model.
 *
 * WHY IT STAYS ON SCREEN. The only way to tell a good conversion from a
 * confidently wrong one is to look at both. A viewer that shows only the 3D
 * model asks the user to trust it, which is exactly what a recognition pipeline
 * has not earned.
 *
 * The opacity slider is what makes it an OVERLAY rather than a second panel:
 * dropped to 40% over the top view, a misplaced wall is obvious in a way no
 * side-by-side comparison makes it.
 */
export default function PlanOverlay({ conversion, mode, onModeChange }) {
  const [opacity, setOpacity] = useState(0.55)
  const [expanded, setExpanded] = useState(false)

  const url = conversion?.source?.id ? sourceFileUrl(conversion.source.id) : null
  if (!url || mode === 'off') return null

  if (mode === 'overlay') {
    return (
      <>
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ opacity }}
        />
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-sm border border-[var(--tone-line)] bg-white/95 px-2.5 py-1.5">
          <span className="text-[0.625rem] text-[var(--tone-ink-soft)]">Drawing</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            className="h-1 w-24 cursor-pointer accent-[var(--color-brand-deep)]"
            aria-label="Drawing overlay opacity"
          />
          <button
            type="button"
            onClick={() => onModeChange('off')}
            className="cursor-pointer text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--color-danger)]"
            aria-label="Hide the drawing overlay"
          >
            <X size={12} />
          </button>
        </div>
      </>
    )
  }

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-col border-l border-[var(--tone-line)] bg-[var(--color-light)]',
        expanded ? 'w-1/2' : 'w-72',
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--tone-line)] px-2.5 py-1.5">
        <span className="label-ui text-[var(--tone-ink-soft)]">Original drawing</span>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="ml-auto cursor-pointer text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
          aria-label={expanded ? 'Shrink the drawing panel' : 'Widen the drawing panel'}
        >
          <ArrowsOutSimple size={13} />
        </button>
        <button
          type="button"
          onClick={() => onModeChange('off')}
          className="cursor-pointer text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--color-danger)]"
          aria-label="Hide the drawing"
        >
          <X size={13} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <img src={url} alt="The uploaded floor plan" className="w-full" />
      </div>
    </div>
  )
}
