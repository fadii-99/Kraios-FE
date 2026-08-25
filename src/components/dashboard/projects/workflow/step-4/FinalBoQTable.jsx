import { cn } from '@/lib/cn'

/**
 * Final BoQ Deliverables Table.
 *
 * Professional read-only architectural table displaying itemized quantities,
 * units, rates, and amounts approved during the BoQ stage.
 */
export default function FinalBoQTable({ rows = [], className }) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-md border border-[var(--tone-line-strong)] bg-white shadow-2xs',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--tone-line)] bg-slate-50/90">
              <th
                scope="col"
                className="w-16 px-4 py-3 text-center font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Item
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Description
              </th>
              <th
                scope="col"
                className="w-24 px-4 py-3 text-right font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Qty
              </th>
              <th
                scope="col"
                className="w-20 px-4 py-3 text-center font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Unit
              </th>
              <th
                scope="col"
                className="w-28 px-4 py-3 text-right font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Rate
              </th>
              <th
                scope="col"
                className="w-32 px-4 py-3 text-right font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Amount
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--tone-line)] bg-white text-[0.8125rem]">
            {rows.map((row, idx) => (
              <tr
                key={row.item || idx}
                className="transition-colors hover:bg-blue-50/[0.25] even:bg-slate-50/30"
              >
                <td className="px-4 py-3 text-center font-mono text-[0.75rem] font-bold text-[var(--color-brand-deep)]">
                  <span className="inline-block rounded-xs bg-blue-50 px-1.5 py-0.5 border border-blue-100">
                    {row.item || String(idx + 1).padStart(2, '0')}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-[var(--tone-ink)]">
                  {row.description}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[0.8125rem] font-bold text-[var(--tone-ink)]">
                  {row.qty}
                </td>
                <td className="px-4 py-3 text-center text-[0.75rem] font-medium text-slate-500">
                  {row.unit}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[0.75rem] text-slate-400">
                  {row.rate || '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[0.75rem] text-slate-400">
                  {row.amount || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
