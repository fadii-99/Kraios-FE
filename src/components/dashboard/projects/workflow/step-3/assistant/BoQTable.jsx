import { Plus, Table as TableIcon, Trash } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * Light Structured BoQ Table component for Step 3 BoQ Assistant.
 *
 * Professional architectural drafting style table with interactive row controls:
 * - "+ Add Row" button in the header and footer
 * - Delete row button ("Trash" icon) on each row with tooltip
 * - Automatic sequential item numbering and summary recalculation
 * - Clean white card surface with subtle border and hover highlights
 */
export default function BoQTable({
  result,
  onAddRow,
  onDeleteRow,
  className,
}) {
  const rows = result?.rows || []
  const summary = result?.summary || `${rows.length} Items · Preliminary BoQ`

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-sm border border-[var(--tone-line-strong)] bg-white shadow-2xs',
        className,
      )}
    >
      {/* Table Sub-Header Summary & Actions */}
      <div className="flex items-center justify-between border-b border-[var(--tone-line)] bg-slate-50/70 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-xs bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]">
            <TableIcon size={12} weight="bold" />
          </div>
          <span
            className="font-display text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {result?.title || 'Bill of Quantities'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onAddRow && (
            <button
              type="button"
              onClick={() => onAddRow(result?.id)}
              aria-label="Add new BoQ row"
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded-xs border border-slate-200 bg-white px-2 py-0.5',
                'text-[0.625rem] font-bold uppercase tracking-wider text-[var(--tone-ink)] shadow-2xs font-display',
                'transition-all duration-150 hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)]/[0.04] hover:text-[var(--color-brand-deep)] active:scale-95',
              )}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Plus size={11} weight="bold" />
              <span>Add Row</span>
            </button>
          )}

          <span className="rounded-xs border border-slate-200 bg-white px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
            {summary}
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--tone-line)] bg-white">
              <th
                scope="col"
                className="w-12 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display text-center"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Item
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Description
              </th>
              <th
                scope="col"
                className="w-16 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display text-right"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Qty
              </th>
              <th
                scope="col"
                className="w-16 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display text-center"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Unit
              </th>
              <th
                scope="col"
                className="w-20 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display text-right"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Rate
              </th>
              <th
                scope="col"
                className="w-24 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display text-right"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Amount
              </th>
              <th
                scope="col"
                className="w-10 px-2 py-2 text-center text-[0.625rem] font-bold uppercase tracking-[0.1em] text-slate-400 font-display"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tone-line)]/70 text-[0.75rem]">
            {rows.map((row, index) => (
              <tr
                key={row.item || index}
                className="group/row transition-colors hover:bg-blue-50/40"
              >
                <td className="px-3 py-2.5 text-center font-mono text-[0.6875rem] font-bold text-slate-500">
                  {row.item}
                </td>
                <td className="px-3 py-2.5 font-medium text-[var(--tone-ink)]">
                  {row.description}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--tone-ink)]">
                  {row.qty}
                </td>
                <td className="px-3 py-2.5 text-center text-slate-500 font-medium">
                  {row.unit}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-400 font-mono">
                  {row.rate || '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-400 font-mono">
                  {row.amount || '—'}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {onDeleteRow && (
                    <button
                      type="button"
                      onClick={() => onDeleteRow(result?.id, index)}
                      aria-label={`Delete row ${row.item}`}
                      title="Delete row"
                      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-xs text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95 group-hover/row:text-slate-400"
                    >
                      <Trash size={13} weight="bold" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Action */}
      {onAddRow && (
        <div className="border-t border-[var(--tone-line)] bg-slate-50/40 px-3.5 py-1.5 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAddRow(result?.id)}
            aria-label="Add row at the end of table"
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-xs px-2 py-1',
              'text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-brand-deep)] font-display',
              'transition-all hover:bg-[var(--color-brand-deep)]/[0.08] active:scale-95',
            )}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Plus size={12} weight="bold" />
            <span>Add Row</span>
          </button>
        </div>
      )}
    </div>
  )
}
