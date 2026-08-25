import { ArrowUpRight } from '@phosphor-icons/react'

import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import Logo from '@/components/ui/Logo'
import { ASSISTANT_COPY, QUICK_PROMPTS } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * The workspace before anything has been asked of it.
 * Provides clear guidance on entering a prompt to generate a 3D floor plan,
 * with quick-start prompt suggestions.
 */
export default function AssistantEmptyState({
  busy,
  onQuickPrompt,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <TechnicalIconFrame size={56}>
        <Logo size="nav" className="flex items-center justify-center" />
      </TechnicalIconFrame>

      <h2
        className="mt-5 text-[1.5rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] sm:text-[1.75rem]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {ASSISTANT_COPY.emptyHeading}
      </h2>

      <p className="mt-3 max-w-[50ch] text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)] sm:text-[0.9375rem]">
        {ASSISTANT_COPY.emptyBody}
      </p>

      <div className="mt-8 w-full max-w-[38rem] text-left sm:mt-10">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-px w-5 bg-[var(--color-brand-deep)]" />
          <p className="label-ui text-[0.5625rem] font-bold tracking-wider text-[var(--color-brand-deep)] uppercase">
            {ASSISTANT_COPY.suggestedLabel}
          </p>
        </div>

        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {QUICK_PROMPTS.map((prompt) => (
            <li key={prompt} className="min-w-0">
              <button
                type="button"
                onClick={() => onQuickPrompt?.(prompt)}
                disabled={busy}
                className={cn(
                  'group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-sm border p-3 text-left shadow-2xs',
                  'border-[var(--tone-line)] bg-white text-[var(--tone-ink)]',
                  'transition-all duration-200 ease-[var(--ease-out-expo)]',
                  'hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)]/[0.02] hover:text-[var(--color-brand-deep)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
                  'disabled:cursor-not-allowed disabled:opacity-55',
                )}
              >
                <span className="min-w-0 text-[0.8125rem] font-medium leading-snug">{prompt}</span>
                <ArrowUpRight
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 text-[var(--tone-muted)] transition-transform duration-200 ease-[var(--ease-out-expo)]',
                    'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-brand-deep)]',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
