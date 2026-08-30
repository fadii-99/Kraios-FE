import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Cube } from '@phosphor-icons/react'
import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import { cn } from '@/lib/cn'

/**
 * 3D Floor Plans dropdown component for Step 3 BoQ Assistant Header.
 *
 * Renders a clean "3D FLOOR PLANS ▾" dropdown trigger matching the header style,
 * and opens a list of available 3D architectural renders with preview thumbnails
 * and full-screen view lightbox links.
 */
export default function FloorPlans3DDropdown({ approvedRender, className }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedModelForModal, setSelectedModelForModal] = useState(null)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const menuId = useId()

  const activeModel = approvedRender?.imageUrl
    ? {
        id: 'approved-3d-model',
        name: approvedRender.title || 'Approved 3D Floor Model',
        previewUrl: approvedRender.imageUrl,
        imageUrl: approvedRender.imageUrl,
        kind: 'image',
        extension: '3D Render',
        tag: 'Approved Model',
      }
    : {
        id: 'default-3d-model',
        name: 'Level 01 · 3D Isometric View',
        previewUrl: '/assets/plan-3d-light.svg',
        imageUrl: '/assets/plan-3d-light.svg',
        kind: 'image',
        extension: 'SVG',
        tag: '3D Model',
      }

  const models = [activeModel]

  // Handle click outside & escape key
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleView(model) {
    setSelectedModelForModal({
      name: model.name,
      previewUrl: model.previewUrl,
      imageUrl: model.imageUrl,
      kind: model.kind,
      extension: model.extension,
    })
    setIsOpen(false)
  }

  return (
    <>
      <div ref={containerRef} className={cn('relative inline-flex items-center', className)}>
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-controls={menuId}
          className={cn(
            'inline-flex h-7 cursor-pointer items-center justify-between gap-1 rounded-xs bg-transparent border-0 shadow-none px-1 font-display select-none transition-colors duration-150',
            'hover:text-[var(--color-brand-deep)] focus-visible:outline-none',
            isOpen ? 'text-[var(--color-brand-deep)]' : 'text-[var(--tone-ink)]',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--tone-ink)]">
            3D Floor Plans
          </span>
          <CaretDown
            size={9}
            weight="bold"
            aria-hidden="true"
            className={cn(
              'shrink-0 text-[var(--tone-ink)] transition-transform duration-200 ease-[var(--ease-out-expo)]',
              isOpen && 'rotate-180 text-[var(--color-brand-deep)]',
            )}
          />
        </button>

        {isOpen && (
          <div
            id={menuId}
            role="menu"
            tabIndex={-1}
            className={cn(
              'absolute right-0 top-full z-[100] mt-2 w-80 sm:w-88 rounded-md border border-[var(--tone-line-strong)] bg-white p-2.5 shadow-[0_12px_32px_rgba(7,20,38,0.18)]',
              'animate-in fade-in-0 zoom-in-95 duration-150',
            )}
          >
            {/* Header label */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-2 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
              <span>Attached 3D Models</span>
              <span className="rounded-xs bg-blue-50 px-1.5 py-0.5 text-[0.5625rem] text-[var(--color-brand-deep)] font-bold">
                {models.length} {models.length === 1 ? 'Model' : 'Models'}
              </span>
            </div>

            {/* Models List */}
            <div className="flex flex-col gap-1">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between gap-4 rounded-xs p-2 transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-200/80"
                >
                  {/* Left: Thumbnail & Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xs border border-slate-200 bg-white p-0.5 shadow-2xs">
                      {model.previewUrl ? (
                        <img
                          src={model.previewUrl}
                          alt={model.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Cube size={20} weight="duotone" className="text-[var(--color-brand-deep)]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)] max-w-[150px] sm:max-w-[180px]"
                        title={model.name}
                      >
                        {model.name}
                      </p>
                      <span className="inline-block mt-0.5 rounded-xs bg-blue-50 px-1.5 py-0.2 text-[0.5625rem] font-bold tracking-wider text-[var(--color-brand-deep)] uppercase">
                        {model.tag}
                      </span>
                    </div>
                  </div>

                  {/* Right: View Button */}
                  <button
                    type="button"
                    onClick={() => handleView(model)}
                    className="shrink-0 cursor-pointer ml-3 inline-flex items-center text-[0.625rem] font-bold text-[var(--color-brand-deep)] hover:text-blue-700 hover:underline px-1.5 py-1 rounded-xs uppercase tracking-wider"
                  >
                    <span>View</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedModelForModal && (
        <FloorPlanFullscreenModal
          source={selectedModelForModal}
          open={Boolean(selectedModelForModal)}
          onClose={() => setSelectedModelForModal(null)}
        />
      )}
    </>
  )
}
