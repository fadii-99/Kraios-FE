import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FilePdf, ImageSquare, Sparkle, X } from '@phosphor-icons/react'

import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'

/**
 * Reusable full-screen floor plan preview modal (Lightbox).
 * Used across Step 1 (FloorPlanSourcePreview) and Step 2 (DesignAssistantGateway / ReferenceSource).
 */
export default function FloorPlanFullscreenModal({ source, open, onClose }) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const imageUrl = source?.previewUrl || source?.imageUrl
  const isImage = Boolean(imageUrl)
  const name = source?.name || 'Floor Plan / 3D Model'
  const extension = source?.extension || (isImage ? 'PNG' : 'PDF')

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${name}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in-0 duration-200"
    >
      {/* Top Controls Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3 text-white">
          <span className="h-2 w-2 rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_var(--color-brand)]" />
          <h3 className="font-display text-[0.9375rem] font-bold uppercase tracking-wide">
            {name}
          </h3>
          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase text-white/70">
            {extension}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        onClick={onClose}
        className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center p-4 sm:p-8"
      >
        {source ? (
          isImage ? (
            <img
              src={imageUrl}
              alt={name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full cursor-default rounded-xl object-contain shadow-2xl"
            />
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex cursor-default flex-col items-center justify-center gap-5 text-center text-white"
            >
              <TechnicalIconFrame size={64}>
                <FilePdf size={36} weight="fill" className="text-[var(--color-brand)]" />
              </TechnicalIconFrame>
              <div className="max-w-md">
                <p className="text-[1.125rem] font-bold">{name}</p>
                <p className="mt-1 text-[0.8125rem] text-white/70">
                  PDF document attached to this project.
                </p>
              </div>
            </div>
          )
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex cursor-default flex-col items-center justify-center gap-4 text-center text-white"
          >
            <TechnicalIconFrame size={64}>
              <ImageSquare size={36} weight="duotone" className="text-white/60" />
            </TechnicalIconFrame>
            <div className="max-w-md">
              <p className="font-display text-[1.125rem] font-bold uppercase tracking-wide">
                No 2D Floor Plan Attached
              </p>
              <p className="mt-1 text-[0.8125rem] text-white/70">
                You can upload a 2D floor plan image or PDF in Step 1 (Upload).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
