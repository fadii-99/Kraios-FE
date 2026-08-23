import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { FolderSimpleDashed } from '@phosphor-icons/react'
import CreateProjectModal from '@/components/dashboard/projects/CreateProjectModal'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import ProjectGrid from '@/components/dashboard/projects/ProjectGrid'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useProjects } from '@/lib/dashboard/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Project library (/dashboard/projects) — all projects, never one project's
 * workflow.
 *
 * Sequenced architectural reveal:
 * - Header: eyebrow rule → eyebrow text & title → CTA button
 * - Empty state (if 0 projects): icon plate settle → heading & description
 * - Grid state (if > 0 projects): project cards staggered entrance
 */
export default function Projects() {
  const { projects } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)
  const hasProjects = projects.length > 0
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      // 1. Header rule draws out from left
      tl.fromTo(
        '[data-header-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4 },
        0,
      )

      // 2. Header eyebrow and page title reveal
      tl.fromTo(
        '[data-header-eyebrow], [data-header-title]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.04 },
        0.06,
      )

      // 3. Primary CTA button in header
      tl.fromTo(
        '[data-header-slot]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast },
        0.14,
      )

      // 4. If empty state, reveal icon plate & copy
      if (!hasProjects) {
        tl.fromTo(
          '[data-empty-icon]',
          { opacity: 0, scale: 0.92, y: DASHBOARD_MOTION.ySmall },
          { opacity: 1, scale: 1, y: 0, duration: DASHBOARD_MOTION.duration },
          0.18,
        ).fromTo(
          '[data-empty-text]',
          { opacity: 0, y: DASHBOARD_MOTION.ySmall },
          { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.04 },
          0.26,
        )
      }
    },
    { scope, dependencies: [reduced, hasProjects] },
  )

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="Project Library" title="Projects">
        <PrimaryButton
          type="button"
          size="compact"
          className="w-full sm:w-auto"
          onClick={() => setModalOpen(true)}
        >
          Create New Project
        </PrimaryButton>
      </DashboardPageHeader>

      {!hasProjects ? (
        /* STATE 1: NO PROJECTS YET */
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12 xl:px-12">
          <div className="relative flex flex-col items-center text-center">
            <div
              data-empty-icon
              className="flex h-20 w-20 items-center justify-center border border-[var(--color-brand-deep)]/[0.14] bg-[var(--color-brand-deep)]/[0.06]"
              aria-hidden="true"
            >
              <FolderSimpleDashed
                size={38}
                weight="regular"
                className="text-[var(--color-brand-deep)]"
              />
            </div>

            <div data-empty-text className="contents">
              <h2
                className="mt-5 text-[1.25rem] font-bold uppercase leading-tight tracking-[0.02em] text-[var(--tone-ink)] sm:text-[1.5rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                No Projects Yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--tone-muted-dark)]">
                Create a project to upload a floor plan and generate your 3D model.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2: PROJECTS EXIST */
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-8 xl:px-12 xl:py-10">
          <ProjectGrid projects={projects} />
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
