import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import CreateProjectModal from '@/components/dashboard/projects/CreateProjectModal'
import WelcomeWorkflowCanvas from '@/components/dashboard/WelcomeWorkflowCanvas'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Dashboard Overview (/dashboard) — the Welcome screen.
 *
 * One white sheet holding one composition:
 * Sequential, calm architectural reveal:
 * Status Eyebrow → Logo Mark & Rules → Welcome Headline → Subcopy → Action Buttons.
 */
export default function DashboardHome() {
  const [modalOpen, setModalOpen] = useState(false)
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      // 1. Status badge reveals first
      tl.fromTo(
        '[data-welcome-eyebrow]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast },
        0,
      )

      // 2. Centered Logo settles with architectural horizontal lines extending
      tl.fromTo(
        '[data-welcome-logo]',
        { opacity: 0, scale: 0.95, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, scale: 1, y: 0, duration: DASHBOARD_MOTION.duration },
        0.06,
      ).fromTo(
        '[data-welcome-rule-left], [data-welcome-rule-right]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.45, stagger: 0.04 },
        0.1,
      )

      // 3. Welcome Headline & Subcopy reveal
      tl.fromTo(
        '[data-welcome-heading]',
        { opacity: 0, y: DASHBOARD_MOTION.y },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.duration },
        0.16,
      ).fromTo(
        '[data-welcome-body]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, ease: DASHBOARD_MOTION.easeSubtle },
        0.24,
      )

      // 4. Action button row reveals and becomes immediately interactable
      tl.fromTo(
        '[data-welcome-cta]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast },
        0.32,
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <WelcomeWorkflowCanvas onCreateProject={() => setModalOpen(true)} />
      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
