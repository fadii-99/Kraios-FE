import { useState } from 'react'

import BimJsonView from '@/components/bim/BimJsonView'
import BimPlanFacts from '@/components/bim/BimPlanFacts'
import {
  AssumptionsList,
  ExtractionScore,
  FindingsList,
} from '@/components/bim/BimQualityPanel'
import { cn } from '@/lib/cn'

/**
 * Everything about the extraction that is not the model itself, on tabs.
 *
 * It used to be one tall column beside the model, which made both halves worse:
 * the model was squeezed into a third of the width, and the column was a
 * thirty-row scroll of four unrelated things. Tabs put the model in the top
 * region at full width and give each kind of information the whole bottom.
 *
 * The SCORE sits outside the tabs, in the tab bar. It is the one fact that is
 * true of the whole extraction, and hiding it behind a tab would mean the page
 * could be read without ever seeing how much to trust it.
 *
 * Tab state is deliberately local. Nothing else needs to know which tab is
 * open, and lifting it would make the page re-render the 3D viewer's parent on
 * every tab click.
 */

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'findings', label: 'Findings' },
  { id: 'assumptions', label: 'Assumed' },
  { id: 'json', label: 'Plan JSON' },
]

export default function BimDetailsPanel({ facts, quality, plan, filename, className }) {
  const [active, setActive] = useState('summary')

  const counts = {
    findings:
      (quality?.visualNotes.length ?? 0) +
      (quality?.attention.length ?? 0) +
      (quality?.repaired.length ?? 0),
    assumptions: facts?.assumptions.length ?? 0,
  }

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-md border border-[var(--tone-line)] bg-white',
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-2 border-b border-[var(--tone-line)] px-2 py-1.5">
        <div role="tablist" aria-label="Extraction details" className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'rounded-xs px-2.5 py-1 text-[0.75rem] font-semibold transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-deep)]',
                active === tab.id
                  ? 'bg-[var(--color-brand-deep)] text-white'
                  : 'text-[var(--tone-ink)] hover:bg-[var(--color-light)] hover:text-[var(--color-brand-deep)]',
              )}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={cn('ml-1', active === tab.id ? 'opacity-80' : 'opacity-55')}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <ExtractionScore quality={quality} className="ml-auto" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {active === 'summary' && <BimPlanFacts facts={facts} quality={quality} />}
        {active === 'findings' && <FindingsList quality={quality} />}
        {active === 'assumptions' && <AssumptionsList facts={facts} />}
        {active === 'json' && (
          <BimJsonView plan={plan} filename={filename} className="h-full" />
        )}
      </div>
    </section>
  )
}
