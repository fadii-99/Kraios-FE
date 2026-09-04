import { Link } from 'react-router-dom'
import { FolderSimple, Plus } from '@phosphor-icons/react'

import Logo from '@/components/ui/Logo'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useProfile } from '@/contexts/ProfileContext'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Clean, Centered, Minimalist Welcome Experience with Rich Architectural Backdrop
 */
export default function WelcomeWorkflowCanvas({ onCreateProject }) {
  const { profile } = useProfile()
  const { user } = useAuth()

  const fullName =
    profile?.name || user?.name || user?.full_name || user?.email?.split('@')[0] || 'Architect'

  // The greeting is a salutation, not an identity record: one name reads as a
  // person being addressed, where the full legal name reads as a record header
  // and wrapped onto a second line on this centred composition.
  const displayName = fullName.trim().split(/\s+/)[0] || fullName

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-6 py-16 sm:px-12 sm:py-24 lg:py-28 xl:py-32">
      {/* Main Centered Content Stack */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        {/* 1. Status Eyebrow Badge */}
        <div data-welcome-eyebrow className="mb-8 inline-flex items-center sm:mb-10">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-brand-deep)]/20 bg-white/90 px-4.5 py-1.5 shadow-[0_2px_10px_rgba(7,20,38,0.04)] backdrop-blur-sm transition-all hover:border-[var(--color-brand-deep)]/35">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="label-ui text-[0.625rem] font-bold tracking-[0.18em] text-[var(--tone-ink)] sm:text-[0.6875rem]">
              ARCHITECTURAL AI ENGINE
            </span>
            {/* Both labels plus the divider measure ~310px against 294px of
                content width at 360, and the badge cannot wrap. The secondary
                label is context, not information, so it waits for the room. */}
            <span className="hidden h-3 w-px bg-[var(--tone-line)] sm:block" aria-hidden="true" />
            <span className="label-ui hidden text-[0.625rem] font-semibold tracking-[0.14em] text-[var(--color-brand-deep)] sm:inline sm:text-[0.6875rem]">
              2D TO 3D &amp; BoQ
            </span>
          </div>
        </div>

        {/* 2. Centered Logo with Subtle Radial Ring */}
        <div data-welcome-logo className="relative mb-8 flex items-center justify-center sm:mb-10">
          <div
            aria-hidden="true"
            className="absolute -inset-10 rounded-full bg-radial from-[var(--color-brand)]/15 to-transparent blur-2xl"
          />
          <div className="relative flex items-center gap-5 sm:gap-6">
            <span
              data-welcome-rule-left
              aria-hidden="true"
              className="hidden h-px w-16 origin-right bg-gradient-to-r from-transparent to-[var(--color-brand-deep)]/40 sm:block"
            />
            <div className="flex h-20 w-20 items-center justify-center rounded-md border border-[var(--color-brand-deep)]/15 bg-white/95 p-3.5 shadow-[0_10px_28px_rgba(22,119,255,0.1)] transition-transform duration-300 hover:scale-105 sm:h-24 sm:w-24 sm:p-4">
              <Logo size="hero" className="h-full w-full object-contain" />
            </div>
            <span
              data-welcome-rule-right
              aria-hidden="true"
              className="hidden h-px w-16 origin-left bg-gradient-to-l from-transparent to-[var(--color-brand-deep)]/40 sm:block"
            />
          </div>
        </div>

        {/* 3. Centered Primary Headline & Short Copy */}
        <div className="max-w-2xl">
          <h1 data-welcome-heading className="display-app text-center text-[var(--tone-ink)]">
            Welcome{' '}
            <span className="bg-gradient-to-r from-[var(--color-brand-deep)] to-[var(--color-brand)] bg-clip-text text-transparent">
              {displayName}
            </span>
          </h1>

          <p data-welcome-body className="mx-auto mt-5 max-w-xl text-center text-[0.9375rem] font-normal leading-relaxed text-[var(--tone-muted-dark)] sm:mt-6 sm:text-[1.0625rem] sm:leading-relaxed">
            Generate 3D architectural models, automated BoQ cost schedules, and CAD deliverables directly from your 2D floor plans.
          </p>
        </div>

        {/* 4. Centered Action Buttons with Equal Width & No-Wrap Text */}
        <div
          data-welcome-cta
          className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:mt-12 sm:flex-row sm:gap-5"
        >
          <PrimaryButton
            type="button"
            onClick={onCreateProject}
            size="default"
            align="center"
            withArrow={false}
            className="w-full whitespace-nowrap shadow-[0_4px_16px_rgba(11,94,215,0.22)] sm:w-64"
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              <Plus size={17} weight="bold" />
              <span className="whitespace-nowrap">Create New Project</span>
            </span>
          </PrimaryButton>

          <PrimaryButton
            as={Link}
            to="/dashboard/projects"
            variant="outline"
            size="default"
            align="center"
            withArrow={false}
            className="w-full whitespace-nowrap sm:w-64"
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              <FolderSimple size={18} weight="bold" />
              <span className="whitespace-nowrap">View Projects</span>
            </span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
