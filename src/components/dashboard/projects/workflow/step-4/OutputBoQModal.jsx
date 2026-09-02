import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Calculator,
  CheckCircle,
  CircleNotch,
  FileCsv,
  FileXls,
  Plus,
  Trash,
  X,
} from '@phosphor-icons/react'

import {
  downloadText,
  generateBoqCsv,
  projectSlug,
} from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { cn } from '@/lib/cn'

/**
 * The editable columns, in the order they are shown.
 *
 * `item` is deliberately absent: it is the row's ordinal and is renumbered by
 * `withAddedRow` / `withDeletedRow`, so letting it be typed over would let the
 * numbering disagree with the row order the moment a row is removed.
 */
const EDITABLE_COLUMNS = [
  { field: 'description', label: 'Item Description', align: 'left', width: null },
  { field: 'unit', label: 'Unit', align: 'left', width: 'w-20' },
  { field: 'qty', label: 'Quantity', align: 'right', width: 'w-24' },
  { field: 'rate', label: 'Rate', align: 'right', width: 'w-28' },
  { field: 'amount', label: 'Amount', align: 'right', width: 'w-28' },
]

/**
 * OutputBoQModal — full-screen Bill of Quantities, inspected or edited.
 *
 * This is where the structured table Step 3 withheld from the chat finally
 * surfaces. It is the same rows the CSV export and the deliverables carry, so
 * editing them here edits the thing that actually ships.
 *
 * The modal itself holds no draft: `rows` and `onCellChange` come from
 * `OutputStage`, which owns the draft and the debounced write. Keeping the
 * state one level up is what lets a save survive this component closing.
 *
 * Rendered through a portal into `document.body`, like every other fullscreen
 * surface here. It used to render inline inside `OutputStage`, whose sections
 * carry GSAP transforms — and a transformed ancestor makes `position: fixed`
 * resolve against that ancestor instead of the viewport, so the modal opened
 * offset and clipped rather than centred on the screen.
 */
export default function OutputBoQModal({
  open = false,
  onClose,
  projectName = 'Kraios Project',
  rows = [],
  editable = false,
  saving = false,
  onCellChange,
  onAddRow,
  onDeleteRow,
}) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    // The page behind a fullscreen surface must not scroll under it.
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const handleDownloadCsv = () => {
    const csv = generateBoqCsv(rows)
    const sanitizedProject = projectSlug(projectName)
    downloadText(csv, `${sanitizedProject}-boq.csv`)
  }

  const handleDownloadExcel = () => {
    const csv = generateBoqCsv(rows)
    const sanitizedProject = projectSlug(projectName)
    downloadText(csv, `${sanitizedProject}-boq.xls`, 'application/vnd.ms-excel')
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Final Bill of Quantities"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200/90 px-5 py-3.5 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
              <Calculator size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[0.875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]">
                  Final Bill of Quantities (BoQ)
                </h3>
                {editable ? (
                  <span
                    aria-live="polite"
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.5625rem] font-bold uppercase',
                      saving
                        ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-emerald-500/10 text-emerald-700',
                    )}
                  >
                    {saving ? (
                      <>
                        <CircleNotch size={10} weight="bold" className="animate-spin" />
                        SAVING
                      </>
                    ) : (
                      <>
                        <CheckCircle size={10} weight="fill" />
                        SAVED
                      </>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.5625rem] font-bold uppercase text-emerald-700">
                    <CheckCircle size={10} weight="fill" />
                    APPROVED
                  </span>
                )}
              </div>
              <p className="text-[0.6875rem] text-slate-500 font-medium mt-0.5">
                {projectName} • {rows.length} line items
                {editable && ' • edits save automatically'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-[0.6875rem] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/70 transition-colors"
            >
              <FileCsv size={14} weight="bold" className="text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[0.6875rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <FileXls size={14} weight="bold" className="text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Bill of Quantities"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Table Content ── */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-[0.75rem]">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 font-display">
                <tr>
                  <th className="px-3.5 py-2.5 w-14">Sr.</th>
                  {EDITABLE_COLUMNS.map((column) => (
                    <th
                      key={column.field}
                      className={cn(
                        'px-3.5 py-2.5',
                        column.align === 'right' && 'text-right',
                        column.width,
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                  {editable && (
                    <th className="px-2 py-2.5 w-10">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-slate-400">
                      {row.item || index + 1}
                    </td>

                    {EDITABLE_COLUMNS.map((column) => (
                      <td
                        key={column.field}
                        className={cn(
                          'px-3.5 py-2.5',
                          column.align === 'right' && 'text-right',
                          column.field === 'description'
                            ? 'font-sans font-medium text-slate-800'
                            : 'text-slate-700',
                          column.field === 'amount' && 'font-bold text-emerald-700',
                        )}
                      >
                        {editable ? (
                          <input
                            type="text"
                            value={row[column.field] ?? ''}
                            aria-label={`${column.label}, row ${index + 1}`}
                            onChange={(event) =>
                              onCellChange?.(index, column.field, event.target.value)
                            }
                            className={cn(
                              'w-full rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-inherit',
                              'hover:border-slate-200 hover:bg-white',
                              'focus:border-emerald-500/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                              'transition-colors',
                              column.align === 'right' && 'text-right',
                            )}
                          />
                        ) : (
                          row[column.field]
                        )}
                      </td>
                    ))}

                    {editable && (
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteRow?.(index)}
                          aria-label={`Delete row ${index + 1}`}
                          title="Delete row"
                          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-xs border border-transparent text-slate-300 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash size={12} weight="bold" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {editable && (
              <button
                type="button"
                onClick={() => onAddRow?.()}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50/70 px-3.5 py-2 text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-emerald-50/70 hover:text-emerald-700"
              >
                <Plus size={12} weight="bold" />
                Add Row
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
