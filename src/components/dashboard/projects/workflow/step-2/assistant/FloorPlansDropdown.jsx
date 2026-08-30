import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, FilePdf } from '@phosphor-icons/react'
import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import { cn } from '@/lib/cn'

/**
 * 2D Floor Plans dropdown component in Step 2 Assistant Header.
 *
 * Renders a clean "2D FLOOR PLANS ▾" dropdown trigger matching the composer style,
 * and opens a list of available 2D architectural plans with preview thumbnails
 * and full-screen view links.
 */
export default function FloorPlansDropdown({ source, className }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const menuId = useId()

  // Prepare plans list from active project source or standard reference
  const activePlan = source?.previewUrl || source?.imageUrl
    ? {
        id: 'active-project-plan',
        name: source.name || '2D Architectural Floor Plan',
        previewUrl: source.previewUrl || source.imageUrl,
        kind: source.kind || 'image',
        extension: source.extension || 'PNG',
        tag: 'Active Plan',
      }
    : {
        id: 'default-project-plan',
        name: 'Level 01 · Architectural Layout',
        previewUrl: '/assets/plan-2d-primary.svg',
        kind: 'image',
        extension: 'SVG',
        tag: 'Primary Drawing',
      }

  const plans = [activePlan]

  // Handle click outside to close dropdown
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

  function handleView(plan) {
    setSelectedPlanForModal({
      name: plan.name,
      previewUrl: plan.previewUrl,
      imageUrl: plan.previewUrl,
      kind: plan.kind,
      extension: plan.extension,
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
            2D Floor Plans
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
              <span>Attached 2D Plans</span>
              <span className="rounded-xs bg-blue-50 px-1.5 py-0.5 text-[0.5625rem] text-[var(--color-brand-deep)] font-bold">
                {plans.length} {plans.length === 1 ? 'Plan' : 'Plans'}
              </span>
            </div>

            {/* Plans List */}
            <div className="flex flex-col gap-1">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-4 rounded-xs p-2 transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-200/80"
                >
                  {/* Left: Thumbnail & Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xs border border-slate-200 bg-white p-0.5 shadow-2xs">
                      {plan.previewUrl ? (
                        <img
                          src={plan.previewUrl}
                          alt={plan.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FilePdf size={20} weight="duotone" className="text-[var(--color-brand-deep)]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[0.75rem] font-bold text-[var(--tone-ink)] max-w-[150px] sm:max-w-[180px]"
                        title={plan.name}
                      >
                        {plan.name}
                      </p>
                      <span className="inline-block mt-0.5 rounded-xs bg-emerald-50 px-1.5 py-0.2 text-[0.5625rem] font-bold tracking-wider text-emerald-800 uppercase">
                        {plan.tag}
                      </span>
                    </div>
                  </div>

                  {/* Right: View Button (Clean text only, with left spacing) */}
                  <button
                    type="button"
                    onClick={() => handleView(plan)}
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
      {selectedPlanForModal && (
        <FloorPlanFullscreenModal
          source={selectedPlanForModal}
          open={Boolean(selectedPlanForModal)}
          onClose={() => setSelectedPlanForModal(null)}
        />
      )}
    </>
  )
}
