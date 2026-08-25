import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '@/components/ui/Modal'
import PageLoader from '@/components/ui/PageLoader'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useProjects } from '@/lib/dashboard/projects/projectsContext'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Create Project — the one modal the whole product needs today: a name and
 * a Create action. No backend: `createProject` writes into the session-scoped
 * ProjectsProvider, so the new project is on /dashboard/projects immediately.
 */
export default function CreateProjectModal({ open, onClose }) {
  const navigate = useNavigate()
  const { createProject } = useProjects()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // The 700ms create delay is a timer like any other: if the modal's page
  // unmounts mid-create (a nav click while it runs), it has to be cleared
  // rather than left to resolve against a gone component.
  const timerRef = useRef(null)
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleClose = () => {
    if (creating) return
    setName('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // `error` still marks the field invalid; the copy is a toast now. One per
    // submit, never per keystroke.
    if (!name.trim()) {
      setError('Enter a project name.')
      showErrorToast('Enter a project name.', { id: 'create-project-validation' })
      return
    }

    setError('')
    setCreating(true)
    const project = createProject(name.trim())

    await new Promise((resolve) => {
      timerRef.current = window.setTimeout(resolve, 700)
    })

    setCreating(false)
    setName('')
    onClose()
    navigate('/dashboard/projects', { state: { newProjectId: project.id } })
    // Announced only once the project is actually in the store. The 700ms wait
    // has the brand PageLoader in the modal, so it needs no loading toast on
    // top of it.
    showSuccessToast('Project created.', { id: 'project-created' })
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
