import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import ProfileIdentityPanel from '@/components/dashboard/ProfileIdentityPanel'
import EditProfileModal from '@/components/dashboard/EditProfileModal'
import ResetPasswordModal from '@/components/dashboard/ResetPasswordModal'
import DeleteAccountModal from '@/components/dashboard/DeleteAccountModal'
import { useProfile } from '@/contexts/ProfileContext'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Account · Profile (/dashboard/profile).
 *
 * Displays the user's architectural profile overview card with 3 key actions:
 * 1. Edit Profile (Full Name, Firm, Country — Email is read-only)
 * 2. Reset Password (Current, New, Confirm — UI only)
 * 3. Delete Account (Danger Confirmation Modal)
 */
export default function Profile() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const { profile, savedProfile, fetchProfile } = useProfile()

  // Fetch /auth/me/ profile API and log data when entering Profile page
  useEffect(() => {
    fetchProfile?.()
  }, [fetchProfile])

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      // 1. Header rule and title
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

      // 2. Profile Card Container
      tl.fromTo(
        '[data-profile-container]',
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: DASHBOARD_MOTION.duration },
        0.12,
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

      {/* Page Body: vertically centered, fits single viewport without scrollbar */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-3 sm:py-5 lg:py-6',
          DASHBOARD_GUTTER,
        )}
      >
        <div data-profile-container className="w-full flex justify-center my-auto">
          <ProfileIdentityPanel
            profile={savedProfile || profile}
            onEdit={() => setIsEditModalOpen(true)}
            onResetPassword={() => setIsResetModalOpen(true)}
            onDeleteAccount={() => setIsDeleteModalOpen(true)}
          />
        </div>
      </div>

      {/* 1. Edit Profile Form Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {/* 2. Reset Password Modal (UI Flow) */}
      {isResetModalOpen && (
        <ResetPasswordModal
          open={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
        />
      )}

      {/* 3. Delete Account Modal (Danger UI) */}
      {isDeleteModalOpen && (
        <DeleteAccountModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  )
}
