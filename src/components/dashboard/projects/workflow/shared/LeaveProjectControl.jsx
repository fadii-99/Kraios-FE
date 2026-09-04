import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LeaveProjectButton from '@/components/dashboard/projects/workflow/shared/LeaveProjectButton'
import DiscardProjectModal from '@/components/dashboard/projects/workflow/shared/DiscardProjectModal'

/**
 * The exit control and the confirmation it opens, as ONE piece.
 *
 * It is mounted once, at the end of the four-stage stepper, so every stage of
 * the workflow carries it and no assistant does — an assistant already has its
 * own Back, and the exit belongs to the bar that shows where in the project
 * the user is standing. The component holds its own open state and knows its
 * own destination, so the mount point supplies nothing but a position.
 *
 * `DashboardLayout` keeps its OWN instance of the same dialog for the sidebar
 * and mobile-nav clicks it intercepts. That one answers a gesture the guard
 * caught, and carries the `pendingPath` the user was heading for; this one
 * answers a control they pressed on purpose, and always lands on the library.
 * The two can never be open at once, because they answer different gestures.
 *
 * The dialog portals into `document.body`, so mounting the control inside the
 * stepper does not leave the scrim inheriting that bar's stacking or overflow.
 */
export default function LeaveProjectControl({ className }) {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false)
    navigate('/dashboard/projects')
  }, [navigate])

  return (
    <>
      <LeaveProjectButton className={className} onClick={() => setConfirmOpen(true)} />

      <DiscardProjectModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
