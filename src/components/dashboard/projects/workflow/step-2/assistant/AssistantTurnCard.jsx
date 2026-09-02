import { useState } from 'react'
import { CircleNotch, Trash } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * One exchange — the instruction and everything it produced — as ONE block.
 *
 * All three assistants used to lay their turns straight onto the workspace
 * backdrop, so a long session read as a single column of loose fragments with
 * nothing saying where one request ended and the next began. A turn is the unit
 * the user thinks in, so it is the unit that gets a surface.
 *
 * THE BLOCK IS THE WHOLE TURN, INCLUDING THE ACTION COLUMN.
 *
 * That is the one thing this component has to get right, and the reason it is
 * shaped the way it is. The block's own boundary — the resting hairline, the
 * hover highlight and the delete-hover warning alike — is drawn by the OUTER
 * element, so all three enclose the instruction, every reply it produced and
 * the delete control that removes them. When the boundary stopped short of the
 * action column, the hover highlight ended in the middle of the row and the
 * rule under the instruction ran out before the button that belongs to it, so a
 * turn read as if its instruction belonged to the block above it — the exact
 * opposite of what the delete-hover state was showing.
 *
 * Two structural consequences follow, and both matter:
 *
 *   - The instruction and the action column are a ROW inside the block, so the
 *     rule that separates the instruction from its replies spans the block's
 *     full inner width and runs all the way under that button.
 *   - The action column is RESERVED in every state — empty while a turn is
 *     still running — so the block never changes width when a turn settles and
 *     the control can never push the transcript into a horizontal scroll.
 *
 * EVERY turn gets the block, running or settled. At rest it is a hairline and
 * NO FILL — the transcript around it has no fill either, so the workspace
 * backdrop reads straight through and the boundary is the only thing on screen
 * saying which instruction a result answered. A running turn needs that as much
 * as a finished one; what says the work is unfinished is the pending block
 * inside, not a missing edge.
 *
 * The FILL belongs to the pointer alone. Exactly one block is filled at a time —
 * the one being hovered — which is what makes the grouping legible without
 * having to reach for the delete control to confirm it. Nothing else in the
 * conversation carries a surface.
 *
 * DELETE is offered only once the turn has SETTLED (`settled`, from
 * `isTurnSettled`). There is nothing to keep until there is something to keep,
 * and the endpoint must not be pointed at a block the backend may still be
 * writing.
 *
 * It removes the whole block. `DELETE /projects/{id}/conversations/messages/{messageId}/`
 * deletes the user message AND the version, job and files it produced — exactly
 * this block's contents — so the block is the honest unit for the action, and
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
  const [isDeleteHovered, setIsDeleteHovered] = useState(false)
  const deletable = settled && Boolean(prompt) && Boolean(onDelete)

  return (
    <section
      className={cn(
        'group w-full rounded-md border px-3 py-3 sm:px-4 sm:py-4',
        'transition-colors duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        // A real hairline at rest, because there is no panel fill behind it to
        // read against — only the workspace backdrop.
        'border-[var(--tone-line)] bg-transparent',
        // The whole block answers the pointer — instruction, replies and the
        // action column together — and it is the ONLY surface in the transcript.
        'hover:border-slate-300 hover:bg-white',
        // Hovering delete previews exactly what delete would remove.
        isDeleteHovered && '!border-rose-400 !bg-rose-50/70 ring-2 ring-rose-400/20',
        deleting && 'opacity-60',
        className,
      )}
    >
      {/* The instruction and the control that removes it, on one row. The
          column is present in every state so the block keeps its geometry. */}
      <div className="flex w-full items-start gap-2 sm:gap-2.5">
        <div className="min-w-0 flex-1">{prompt}</div>

        <div className="w-8 shrink-0 sm:w-9">
          {deletable && (
            <button
              type="button"
              onClick={onDelete}
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
              disabled={deleting}
              aria-label={deleteLabel}
              title={deleteLabel}
              className={cn(
                'mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border sm:h-9 sm:w-9',
                'opacity-40 group-hover:opacity-100',
                isDeleteHovered
                  ? 'scale-105 border-rose-500 bg-rose-500 text-white opacity-100 shadow-xs'
                  : 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/8 text-[var(--color-danger)] shadow-2xs hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white',
                'transition-all duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
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

      {children && (
        <div
          className={cn(
            'flex w-full flex-col gap-5 sm:gap-6',
            // The reply needs a rule between it and the instruction only when
            // there IS an instruction above it. It spans the block's own inner
            // width, so it reaches under the action column rather than stopping
            // beside it.
            prompt && 'mt-4 border-t border-[var(--tone-line-soft)] pt-4 sm:mt-4.5 sm:pt-4.5',
          )}
        >
          {children}
        </div>
      )}
    </section>
  )
}
