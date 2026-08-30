import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ProjectCard from '@/components/dashboard/projects/library/ProjectCard'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useProjects } from '@/lib/dashboard/projects/projectsContext'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Responsive project library grid with delete confirmation.
 *
 * COLUMNS: 1 below 1024px, 2 from 1024px, 3 from 1700px. The card is a wide
 * two-zone card — its status band is itself two columns — so it needs ~430px
 * to read properly, and the breakpoints are derived from that rather than from
 * the default scale. At 1024 the workspace has just given up 13.5rem to the
 * sidebar, so two columns land at ~340px each and one column is still right
 * below it. The third column waits until 1700, where three cards measure
 * ~434px; at 1536 they would fall to ~379px and the status rows would wrap.
 *
 * (An earlier comment here claimed "2 from 640px, 3 from 1280px", which the
 * code has never done — the card was widened and the breakpoints moved with
 * it. Recorded so the two do not drift apart again.)
 *
 * Staggered card entrance:
 * Fast, crisp card entrance with opacity + subtle y translation + scale settle.
 */
export default function ProjectGrid({ projects }) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const { deleteProject } = useProjects()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteConfirm = async () => {
    // Confirmation stays a modal — a toast cannot ask a question. The toast is
    // only the receipt, and only once the backend has actually deleted it:
    // `DELETE /projects/{id}/` removes the project AND its files, so announcing
    // it before the response would be announcing something that may not happen.
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      showSuccessToast('Project deleted.', { id: 'project-deleted' })
    } catch (thrown) {
      showErrorToast(thrown?.message || 'That project could not be deleted.', {
        id: 'project-delete-failed',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    if (deleting) return
    setDeleteTarget(null)
  }

  return (
    <>
      <ul
        ref={scope}
        className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-7 min-[1700px]:grid-cols-3"
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
        <p className="mt-4.5 sm:mt-5 mb-7 sm:mb-8 text-[0.9375rem] leading-[1.65] text-[var(--tone-muted)]">
          <span className="font-semibold text-[var(--tone-ink)]">{deleteTarget?.name}</span>{' '}
          will be permanently removed. This action cannot be undone.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

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
            loading={deleting}
            loadingLabel="Deleting project"
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
