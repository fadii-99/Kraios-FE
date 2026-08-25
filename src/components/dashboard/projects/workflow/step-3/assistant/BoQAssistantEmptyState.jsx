import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import Logo from '@/components/ui/Logo'
import { BOQ_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * The BoQ Assistant workspace before anything has been asked of it.
 *
 * Centered onboarding screen providing clean guidance to enter a prompt in the composer,
 * without cluttered suggested prompt lists.
 */
export default function BoQAssistantEmptyState({ className }) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <TechnicalIconFrame size={56}>
        <Logo size="nav" className="flex items-center justify-center" />
      </TechnicalIconFrame>

      <h2
        className="mt-5 text-[1.5rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] sm:text-[1.75rem]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {BOQ_ASSISTANT_COPY.emptyHeading}
      </h2>

      <p className="mt-3 max-w-[58ch] text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)] sm:text-[0.9375rem]">
        {BOQ_ASSISTANT_COPY.emptyBody}
      </p>

    </div>
  )
}
