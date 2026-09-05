import { useState } from 'react'
import { ArrowsOut, FilePdf } from '@phosphor-icons/react'

import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import { sourceFileUrl } from '@/lib/api/bim'
import { cn } from '@/lib/cn'

/**
 * The uploaded drawing, beside the model it produced.
 *
 * It sits at the TOP of the page and stays there while the model is inspected,
 * because it is the reference: the only way to tell a good extraction from a
 * confident wrong one is to look at both. A thumbnail is not enough to read a
 * floor plan, so the panel opens the app's shared lightbox — the same one the
 * project workflow uses — rather than shipping a second full-screen viewer.
 *
 * A PDF gets a link instead of an image. Rendering a PDF page in the browser
 * needs a PDF library; the server already rasterises page one for the model, and
 * the user has the original.
 */
export default function BimDrawingPanel({ source, className }) {
  const [zoomed, setZoomed] = useState(false)

  if (!source) return null

  const url = sourceFileUrl(source.id)

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-md border border-[var(--tone-line)] bg-white',
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--tone-line)] px-2.5 py-1.5">
        <h2
          className="truncate text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--tone-muted-dark)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Your drawing
        </h2>
        {!source.isPdf && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Open the drawing full screen"
            className="ml-auto inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--tone-ink)] hover:bg-[var(--color-light)] hover:text-[var(--color-brand-deep)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-deep)]"
          >
            <ArrowsOut size={12} weight="bold" aria-hidden="true" />
            Enlarge
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 bg-[var(--color-light)] p-1.5">
        {source.isPdf ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-xs text-center hover:bg-white/60"
          >
            <FilePdf size={28} weight="light" aria-hidden="true" className="text-[var(--tone-muted)]" />
            <span className="text-[0.75rem] font-semibold text-[var(--color-brand-deep)] underline">
              Open the PDF
            </span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Open the drawing full screen"
            className="block h-full w-full cursor-zoom-in"
          >
            <img
              src={url}
              alt={`Uploaded floor plan: ${source.name}`}
              className="h-full w-full rounded-xs bg-white object-contain"
            />
          </button>
        )}
      </div>

      <FloorPlanFullscreenModal
        open={zoomed}
        onClose={() => setZoomed(false)}
        source={{
          previewUrl: url,
          name: source.originalName || source.name,
          extension: source.isPdf ? 'PDF' : 'IMAGE',
        }}
      />
    </section>
  )
}
