import { Blueprint, Calculator, Cube, FileText, SquaresFour } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

const DELIVERABLE_TABS = [
  { id: 'all', label: 'All Deliverables', icon: SquaresFour },
  { id: 'renders', label: '3D Renders', icon: Cube },
  { id: 'plans', label: '2D Floor Plans', icon: Blueprint },
  { id: 'boq', label: 'BOQ & Documents', icon: Calculator },
]

/**
 * OutputDeliverablesTabs — Sleek, compact single-line horizontal tabs bar.
 */
export default function OutputDeliverablesTabs({
  activeTab = 'all',
  onTabChange,
  counts = {
    all: 45,
    renders: 18,
    plans: 2,
    boq: 1,
    documents: 24,
  },
}) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none rounded-md border border-[var(--tone-line-strong)] bg-white p-1 sm:p-1.5 shadow-2xs">
      <nav
        role="tablist"
        aria-label="Project Deliverable Categories"
        className="flex items-center gap-1 sm:gap-1.5 min-w-max sm:min-w-0 sm:flex-wrap lg:flex-nowrap"
      >
        {DELIVERABLE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const count = counts[tab.id]

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`deliverables-tab-${tab.id}`}
              aria-selected={isActive}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                'group flex items-center justify-center gap-1.5 sm:gap-2 rounded-sm px-3 sm:px-3.5 py-1.5 sm:py-2 text-[0.6875rem] sm:text-[0.75rem] font-bold transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
                isActive
                  ? 'bg-[var(--color-brand-deep)] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-blue-50/70 hover:text-[var(--color-brand-deep)]',
              )}
            >
              <Icon
                size={14}
                weight={isActive ? 'fill' : 'bold'}
                className={cn(
                  'shrink-0 transition-transform duration-150 group-hover:scale-105',
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-[var(--color-brand-deep)]',
                )}
              />
              <span
                className="font-display tracking-[0.03em] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {tab.label}
              </span>

              {count !== undefined && (
                <span
                  className={cn(
                    'ml-0.5 rounded-xs px-1.5 py-0.25 text-[0.625rem] font-black leading-none font-mono transition-colors shrink-0',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
