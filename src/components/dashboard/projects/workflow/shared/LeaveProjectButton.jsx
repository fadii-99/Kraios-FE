import { ArrowSquareOut } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * The red the mark is drawn in — brighter than `--color-danger` (#B42318),
 * which reads as brown at chip size on a white bar.
 *
 * It is NOT a new semantic token and must not be reused: the danger token still
 * owns every state that MEANS danger — the confirmation dialog, Delete Account,
 * a failed job. This is one small mark, and only the mark: the chip's border,
 * surface and label stay in the neutral tones every other control on the bar
 * uses, so the exit is findable without competing with the stepper beside it.
 */
const EXIT_ACCENT = '#EF4444'

/**
 * The one deliberate exit from an active project workflow.
 *
 * It rides at the END of the four-stage stepper, past Step 4 — the one place on
 * the bar that is not part of the sequence, which is exactly what this is. The
 * stepper says where the user is; this says how to stop being there.
 *
 * The mark is an arrow LEAVING a box, which is what the gesture is: the project
 * workspace is the box, and this steps out of it. Deliberately NOT `SignOut` —
 * the sidebar's Log out row already carries that glyph, and wearing it here
 * would read as a second way to end the session rather than a way out of one
 * project.
 *
 * The chip is NEUTRAL apart from the mark. A fully red control parked on the
 * workflow bar reads as an alarm about the project rather than as a way out of
 * it, and it would out-shout the active step. Hover brings the red to the
 * border and the label, so the destructive reading arrives with the intent.
 *
 * Below `sm` the label is held back and the chip narrows to its mark: the
 * stepper is two rows wide on a phone and owns the space. `aria-label` carries
 * the meaning at every width.
 */
export default function LeaveProjectButton({ onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Exit project"
      style={{ '--exit-accent': EXIT_ACCENT }}
      className={cn(
        'group label-ui inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm',
        'border border-[var(--tone-line-strong)] bg-white px-2.5 sm:px-3',
        'text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tone-ink)]',
        'transition-[background-color,border-color,color] duration-300 ease-[var(--ease-out-expo)]',
        'hover:border-[var(--exit-accent)] hover:text-[var(--exit-accent)]',
        'hover:bg-[color-mix(in_oklab,var(--exit-accent)_5%,white)]',
        'focus-visible:border-[var(--exit-accent)] focus-visible:text-[var(--exit-accent)]',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--exit-accent)]',
        'active:translate-y-px select-none',
        className,
      )}
    >
      <ArrowSquareOut
        size={16}
        weight="bold"
        className="shrink-0 text-[var(--exit-accent)]"
      />
      <span className="hidden whitespace-nowrap sm:inline">Exit Project</span>
    </button>
  )
}
