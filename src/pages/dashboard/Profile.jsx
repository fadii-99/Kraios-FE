import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Check } from '@phosphor-icons/react'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import ProfileIdentityPanel from '@/components/dashboard/ProfileIdentityPanel'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { currentUser } from '@/lib/dashboard/currentUser'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const INITIAL_PROFILE = {
  name: currentUser.name || 'User',
  email: 'user@kraios.ai',
  company: 'Studio Kraios Architecture',
  jobTitle: 'Lead Architect',
  phone: '+1 (555) 234-5678',
}

/**
 * Account · Profile (/dashboard/profile).
 *
 * Sequenced, calm architectural reveal:
 * Header → Main White Sheet → Top Datum Rule → Identity Panel + Form Row Stagger → Save Action
 */
export default function Profile() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [formData, setFormData] = useState(INITIAL_PROFILE)
  const [savedData, setSavedData] = useState(INITIAL_PROFILE)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData)

  useEffect(() => {
    if (!saveSuccess) return undefined

    const timer = window.setTimeout(() => setSaveSuccess(false), 3000)
    return () => window.clearTimeout(timer)
  }, [saveSuccess])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setSaveSuccess(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSavedData(formData)
    setSaveSuccess(true)
  }

  const handleReset = () => {
    setFormData(savedData)
    setSaveSuccess(false)
  }

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      // 1. Header rule and text
      tl.fromTo(
        '[data-header-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4 },
        0,
      ).fromTo(
        '[data-header-eyebrow], [data-header-title], [data-header-slot]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.04 },
        0.06,
      )

      // 2. Profile Sheet Container
      tl.fromTo(
        '[data-profile-sheet]',
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: DASHBOARD_MOTION.duration },
        0.12,
      )

      // 3. Top Datum Rule draws
      tl.fromTo(
        '[data-profile-datum]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.45 },
        0.2,
      )

      // 4. Form inputs reveal in quick, clean stagger
      tl.fromTo(
        '[data-profile-field]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.035 },
        0.26,
      ).fromTo(
        '[data-profile-action]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast },
        0.36,
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="Account" title="Profile">
        <p className="max-w-[38ch] text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)] sm:text-right">
          Manage and update your user profile information.
        </p>
      </DashboardPageHeader>

      {/* The page body — spacious layout with generous breathing room */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-14 xl:py-12">
        <div
          data-profile-sheet
          className="relative mx-auto w-full max-w-[78rem] border border-[var(--tone-line-strong)] bg-white shadow-[0_28px_70px_-40px_rgba(7,20,38,0.35)]"
        >
          {/* The setting-out mark that opens every Kraios band: one short blue
              segment sitting on the sheet's top datum. The sheet's only accent. */}
          <span
            data-profile-datum
            aria-hidden="true"
            className="absolute -top-px left-0 h-[3.5px] w-24 origin-left bg-[var(--color-brand-deep)] shadow-[0_0_8px_rgba(11,94,215,0.35)]"
          />

          <div className="grid lg:grid-cols-12">
            {/* -- identity zone (balanced left-side spacing) ------------- */}
            <div className="flex items-center justify-center p-6 sm:p-8 lg:col-span-5 lg:p-8 xl:p-10">
              <ProfileIdentityPanel />
            </div>

            {/* -- working area (clean spacious rhythm) ------ */}
            <section
              aria-label="Edit Profile"
              className="relative flex flex-col justify-center border-t border-[var(--tone-line)] p-6 sm:p-8 lg:col-span-7 lg:border-t-0 lg:p-8 xl:p-10"
            >
              {/* The datum between the two zones. Inset from both edges so it
                  divides without boxing either side in; the stacked layout drops
                  it and uses the horizontal `border-t` above instead. */}
              <span
                aria-hidden="true"
                className="absolute bottom-10 left-0 top-10 hidden w-px bg-[var(--tone-line)] lg:block"
              />

              <form
                id="profile-form"
                onSubmit={handleSubmit}
                noValidate
                className="grid gap-x-8 gap-y-5 sm:grid-cols-2 sm:gap-x-8 xl:gap-x-10"
              >
                <div data-profile-field>
                  <FormInput
                    id="profile-name"
                    name="name"
                    label="Full Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                  />
                </div>

                <div data-profile-field>
                  <FormInput
                    id="profile-email"
                    name="email"
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>

                <div data-profile-field>
                  <FormInput
                    id="profile-company"
                    name="company"
                    label="Company / Organization"
                    value={formData.company}
                    onChange={handleChange}
                    autoComplete="organization"
                  />
                </div>

                <div data-profile-field>
                  <FormInput
                    id="profile-job-title"
                    name="jobTitle"
                    label="Job Title"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    autoComplete="organization-title"
                  />
                </div>

                <div data-profile-field className="sm:col-span-2">
                  <FormInput
                    id="profile-phone"
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                </div>
              </form>

              {/* The action sits on the form's own closing datum */}
              <div data-profile-action className="mt-8 border-t border-[var(--tone-line)] pt-6">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <PrimaryButton
                    type="submit"
                    form="profile-form"
                    size="default"
                    align="center"
                    withArrow={false}
                    className="w-full whitespace-nowrap shadow-[0_4px_16px_rgba(11,94,215,0.22)] sm:w-64"
                  >
                    Save Changes
                  </PrimaryButton>

                  {isDirty && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="min-h-12 cursor-pointer text-[0.875rem] font-medium text-[var(--tone-muted)] transition-colors duration-300 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-brand-deep)]"
                    >
                      Discard changes
                    </button>
                  )}

                  <p
                    aria-live="polite"
                    className="text-[0.8125rem] font-medium text-[var(--color-brand-deep)] empty:hidden"
                  >
                    {saveSuccess && (
                      <span className="inline-flex items-center gap-1.5">
                        <Check size={14} weight="bold" aria-hidden="true" />
                        Changes saved
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
