import { Check, CircleNotch } from '@phosphor-icons/react'

import { useFinishProject } from '@/hooks/useFinishProject'
import { cn } from '@/lib/cn'

/**
 * Finishing the project, offered where the project actually ends.
 *
 * The workflow's bottom navigation carries a Finish too, and that stays: it is
 * where a user walking the four stages expects the last step's forward action
 * to be. But Output is a long page — the hero, five deliverable sections, the
 * documents grid — and by the time somebody has read to the bottom of it, that
 * nav is a screen and a half behind them. So the close of the page carries the
 * same action at the end of the reading, on the right where a confirming action
 * belongs.
 *
 * Same action, not a second one: the gate, the request, the toasts and the
 * redirect all come from `useFinishProject`, so the two controls cannot promise
 * different things. A blocked Finish explains itself in one toast rather than
 * disappearing, because "why can I not finish?" is the question being asked.
 */
export default function OutputFinishBar({ projectId, className }) {
  const { finish, finishing, blockedMessage, isFinished } = useFinishProject(projectId)

  return (
    <div
      className={cn(
        'flex flex-col items-stretch gap-3 border-t border-[var(--tone-line)] pt-5',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <p
          className="font-display text-[0.75rem] font-black uppercase tracking-[0.1em] text-[var(--tone-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isFinished ? 'Project Finished' : 'Finish This Project'}
        </p>
        <p className="mt-1 max-w-[38rem] text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
          {isFinished
            ? 'This project is marked finished. Its deliverables stay available here.'
            : blockedMessage ||
              'Everything this project needs is approved. Mark it finished and return to your projects.'}
        </p>
      </div>

      <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          aria-disabled={blockedMessage ? true : undefined}
          aria-busy={finishing || undefined}
          title={blockedMessage || undefined}
          className={cn(
            'group label-ui inline-flex cursor-pointer items-center justify-center box-border rounded-sm',
            'h-11 min-h-11 max-h-11 w-full px-5 text-[0.75rem] font-bold uppercase tracking-wider sm:w-52 sm:px-6 sm:text-[0.8125rem]',
            'bg-[var(--btn-bg)] text-[var(--btn-ink)] hover:bg-blue-700 active:bg-blue-800',
            blockedMessage ? 'opacity-60' : 'shadow-[0_4px_14px_rgba(11,94,215,0.2)]',
            'transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)]',
            'active:translate-y-px select-none',
            'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
            'disabled:cursor-not-allowed',
          )}
        >
          <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <span>{isFinished ? 'Finished' : 'Finish'}</span>
            {finishing ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />
            ) : (
              <Check
                size={16}
                weight="bold"
                aria-hidden="true"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110 motion-reduce:transition-none"
              />
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
