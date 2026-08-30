import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '@/components/ui/Modal'
import PageLoader from '@/components/ui/PageLoader'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useProjects } from '@/lib/dashboard/projects/projectsContext'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Create Project — a name and a Create action.
 *
 * `POST /projects/` is a real request now, so the loader covers actual work
 * rather than a timer, and the id the workspace opens on is the backend's
 * project UUID. Project names are unique per user case-insensitively; a
 * duplicate comes back as a field error, is shown on the input and said once in
 * a toast, and the modal stays open with the name still in it.
 */
export default function CreateProjectModal({ open, onClose }) {
  const navigate = useNavigate()
  const { createProject } = useProjects()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // A create that resolves after this modal's page unmounts must not set state
  // on a component that is gone.
  const activeRef = useRef(true)
  useEffect(
    () => () => {
      activeRef.current = false
    },
    [],
  )

  const handleClose = () => {
    if (creating) return
    setName('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Re-entry guard, the same one every submitting form in the product keeps.
    if (creating) return

    // `error` still marks the field invalid; the copy is a toast now. One per
    // submit, never per keystroke.
    if (!name.trim()) {
      setError('Enter a project name.')
      showErrorToast('Enter a project name.', { id: 'create-project-validation' })
      return
    }

    setError('')
    setCreating(true)

    try {
      const project = await createProject(name.trim())
      if (!activeRef.current) return

      setCreating(false)
      setName('')
      onClose()

      // Straight into Step 1 of the real project, on its real UUID.
      navigate(projectStagePath(project.id, 'upload'))
      showSuccessToast('Project created.', { id: 'project-created' })
    } catch (thrown) {
      if (!activeRef.current) return

      // Already normalized by `parseApiError` — a duplicate name arrives as the
      // backend's own sentence, not as a field name or a raw payload.
      const message = thrown?.message || 'That project could not be created.'
      setCreating(false)
      setError(message)
      showErrorToast(message, { id: 'create-project-failed' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="NEW PROJECT"
      labelledBy="create-project-title"
    >
      {creating ? (
        /* The site-wide loader, not a modal-local spinner. Only the label
           changes — the drawing and its animation are identical everywhere. */
        <PageLoader
          variant="inline"
          label="Creating project"
          className="mt-6 min-h-[15rem]"
        />
      ) : (
        <>
          <p className="mt-3 text-[0.9375rem] text-[var(--tone-muted)]">
            Give your project a name to get started.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-7">
            <FormInput
              id="project-name"
              name="projectName"
              label="Project Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              error={error}
              required
              autoComplete="off"
            />

            {/* Stacked below 640px so neither control has to shrink or wrap;
                side by side, Cancel left / Create right, from sm up. */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <button
                type="button"
                onClick={handleClose}
                className="label-ui min-h-11 px-1 text-[var(--tone-muted)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]"
              >
                Cancel
              </button>

              <PrimaryButton type="submit" className="w-full sm:w-auto">
                Create Now
              </PrimaryButton>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}
