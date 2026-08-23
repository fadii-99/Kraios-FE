import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ProjectCard from '@/components/dashboard/projects/ProjectCard'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useProjects } from '@/lib/dashboard/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Responsive project library grid with delete confirmation.
 *
 * 1 column below 640px, 2 from 640px, 3 only from 1280px — CSS Grid, no fixed
 * pixel widths.
 *
 * Staggered card entrance:
 * Fast, crisp card entrance with opacity + subtle y translation + scale settle.
 */
export default function ProjectGrid({ projects }) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const { deleteProject } = useProjects()
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Only cards that have not been revealed yet animate, so adding or deleting
  // one project does not re-run the whole stagger over the cards already on
  // screen. Each element is marked once it has played.
  useGSAP(
    () => {
      if (reduced) return

      const fresh = gsap.utils
        .toArray('[data-project-card]')
        .filter((el) => !el.dataset.revealed)

      if (!fresh.length) return

      fresh.forEach((el) => {
        el.dataset.revealed = 'true'
      })

      gsap.fromTo(
        fresh,
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DASHBOARD_MOTION.duration,
          ease: DASHBOARD_MOTION.ease,
          stagger: DASHBOARD_MOTION.staggerFast,
        },
      )
    },
    { scope, dependencies: [reduced, projects.length] },
  )

  const handleDeleteRequest = (project) => {
    setDeleteTarget(project)
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteProject(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const handleDeleteCancel = () => {
    setDeleteTarget(null)
  }

  return (
    <>
      <ul
        ref={scope}
        className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-7"
        aria-label="Project list"
      >
        {projects.map((project) => (
          <li key={project.id} data-project-card className="flex">
            <ProjectCard project={project} onDelete={handleDeleteRequest} />
          </li>
        ))}
      </ul>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={handleDeleteCancel}
        title="DELETE PROJECT?"
        labelledBy="delete-project-title"
      >
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--tone-muted)]">
          <span className="font-semibold text-[var(--tone-ink)]">{deleteTarget?.name}</span>{' '}
          will be permanently removed. This action cannot be undone.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={handleDeleteCancel}
            className="label-ui min-h-11 cursor-pointer px-1 text-[var(--tone-muted)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]"
          >
            Cancel
          </button>

          <PrimaryButton
            type="button"
            onClick={handleDeleteConfirm}
            withArrow={false}
            align="center"
            className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
          >
            Delete Project
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}
