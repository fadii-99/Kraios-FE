import { CircleNotch, Trash } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * One exchange — the instruction and everything it produced — on one sheet.
 *
 * All three assistants used to lay their turns straight onto the workspace
 * backdrop, so a long session read as a single column of loose fragments with
 * nothing saying where one request ended and the next began. A turn is the unit
 * the user thinks in, so it is the unit that gets a surface.
 *
 * The surface appears only when the turn has SETTLED (`settled`, from
 * `isTurnSettled`). While a job runs, and after one fails, the turn stays on the
 * bare backdrop exactly as it did before: a finished-looking card around
 * unfinished work is a lie, and there is nothing to delete until there is
 * something to keep. The sheet's own line is deliberately faint — it separates
 * turns, it does not box them.
 *
 * The DELETE control sits OUTSIDE the sheet, in a reserved column to its right.
 * Reserved rather than absolutely positioned: the column is there in every
 * state, so the sheet does not change width when a pending turn settles, and
 * the control can never push the transcript into a horizontal scroll at narrow
 * widths.
 *
 * It removes the whole block. `DELETE /projects/{id}/conversations/messages/{messageId}/`
 * deletes the user message AND the version, job and files it produced — exactly
 * this sheet's contents — so the sheet is the honest unit for the action, and
 * the id it acts on is the prompt's own `serverMessageId`.
 */
export default function AssistantTurnCard({
  prompt,
  settled = false,
  onDelete,
  deleting = false,
  deleteLabel = 'Delete this request and its result',
  children,
  className,
}) {
  const deletable = settled && Boolean(prompt) && Boolean(onDelete)

  return (
    <div className={cn('flex w-full items-start gap-2 sm:gap-2.5', className)}>
      <article
        className={cn(
          'min-w-0 flex-1',
          // `cn` is a plain join, so this stays ONE string — a nested array
          // would be stringified with commas and silently produce no classes.
          //
          // The sheet's own line is `--tone-line-soft`, half a hairline: enough
          // to read as one surface, quiet enough not to compete with the
          // drawing inside it.
          settled &&
            'rounded-md border border-[var(--tone-line-soft)] bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(7,20,38,0.04)] transition-colors duration-300 ease-[var(--ease-out-expo)] hover:border-[var(--tone-line)] motion-reduce:transition-none sm:px-5 sm:py-4.5',
          deleting && 'opacity-60',
        )}
      >
        {prompt}

        {children && (
          <div
            className={cn(
              'flex w-full flex-col gap-5 sm:gap-6',
              // The reply only needs a rule between it and the instruction when
              // both are on the same sheet.
              prompt &&
                settled &&
                'mt-4 border-t border-[var(--tone-line)] pt-4 sm:mt-4.5 sm:pt-4.5',
              prompt && !settled && 'mt-6 sm:mt-7',
            )}
          >
            {children}
          </div>
        )}
      </article>

      {/* The action column. Present in every state so the sheet keeps its
          width; occupied only once the turn has something worth removing. */}
      <div className="w-8 shrink-0 sm:w-9">
        {deletable && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={deleteLabel}
            title={deleteLabel}
            className={cn(
              'mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border sm:h-9 sm:w-9',
              'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/8 text-[var(--color-danger)] shadow-2xs',
              'transition-all duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
              'hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger)]',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {deleting ? (
              <CircleNotch
                size={15}
                weight="bold"
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Trash size={15} weight="bold" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
