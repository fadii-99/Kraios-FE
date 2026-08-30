import { useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import FormInput from '@/components/ui/FormInput'
import CountryDropdown from '@/components/ui/CountryDropdown'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Lock } from '@phosphor-icons/react'
import { useProfile } from '@/contexts/ProfileContext'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * EditProfileModal — Spacious Modal Dialog to update user profile details.
 * Editable fields: Full Name, Firm Name, Country (Dropdown).
 * Read-only field: Email Address.
 * Excluded fields: Password, Phone Number, Role, Job Title.
 */
export default function EditProfileModal({ open, onClose }) {
  const formRef = useRef(null)
  const { savedProfile, updateProfile, isSaving } = useProfile()

  const [formData, setFormData] = useState({
    name: savedProfile?.full_name || savedProfile?.name || '',
    full_name: savedProfile?.full_name || savedProfile?.name || '',
    email: savedProfile?.email || '',
    firm_name: savedProfile?.firm_name || savedProfile?.company || savedProfile?.firm || '',
    company: savedProfile?.firm_name || savedProfile?.company || savedProfile?.firm || '',
    country: savedProfile?.country || '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'name') next.full_name = value
      if (name === 'firm_name') next.company = value
      return next
    })

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleClose = () => {
    if (isSaving) return
    setErrors({})
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name?.trim()) {
      setErrors({ name: 'Enter your full name.' })
      formRef.current?.querySelector('#edit-profile-name')?.focus()
      showErrorToast('Enter your full name.', { id: 'profile-modal-validation' })
      return
    }

    try {
      // PATCH semantics: only the fields this form actually edits are sent.
      // Email, role, job title and phone are never part of a profile save from
      // here, so an untouched value cannot be overwritten or cleared.
      await updateProfile({
        full_name: formData.name.trim(),
        firm_name: formData.firm_name?.trim() || '',
        country: formData.country || '',
      })
      showSuccessToast('Profile updated successfully.', { id: 'profile-saved' })
      onClose()
    } catch (err) {
      if (err.status === 401) return
      showErrorToast(err.message || 'Unable to update profile. Please try again.', {
        id: 'profile-modal-error',
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="EDIT PROFILE"
      labelledBy="edit-profile-modal-title"
    >
      <p className="mt-3 text-[0.9375rem] text-[var(--tone-muted)]">
        Update your personal identity, firm details, and operating region.
      </p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="mt-7 space-y-6"
      >
        {/* Row 1: Full Name & Email Address */}
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <FormInput
            id="edit-profile-name"
            name="name"
            label="Full Name"
            placeholder="e.g. Shayan Delta"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            autoComplete="name"
          />

          {/* Email Address — Read-only field with locked indicator */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-profile-email"
                className="label-ui block text-[var(--tone-muted)]"
              >
                Email Address
              </label>
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-slate-400">
                <Lock size={12} weight="bold" />
                <span>Read-only</span>
              </span>
            </div>

            <div className="relative mt-3">
              <input
                id="edit-profile-email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                readOnly
                className="block min-h-12 w-full cursor-not-allowed rounded-sm border border-[var(--tone-line)] bg-slate-100/75 px-4 py-3.5 text-[1rem] text-[var(--tone-muted-dark)] select-none opacity-85"
              />
            </div>
            <p className="mt-1.5 text-[0.6875rem] text-[var(--tone-muted)]">
              Email is associated with your account identity and cannot be changed.
            </p>
          </div>
        </div>

        {/* Row 2: Firm Name & Country Dropdown */}
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <FormInput
            id="edit-profile-firm"
            name="firm_name"
            label="Firm / Organization"
            placeholder="e.g. Studio Kraios"
            value={formData.firm_name}
            onChange={handleChange}
            autoComplete="organization"
          />

          <CountryDropdown
            id="edit-profile-country"
            name="country"
            label="Country"
            placeholder="Select your country"
            value={formData.country}
            onChange={handleChange}
          />
        </div>

        {/* Action Controls */}
        <div className="mt-9 flex flex-col-reverse gap-3 border-t border-[var(--tone-line)] pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="label-ui min-h-11 cursor-pointer px-1 text-[var(--tone-muted)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <PrimaryButton
            type="submit"
            size="default"
            align="center"
            loading={isSaving}
            loadingLabel="Saving Changes..."
            withArrow={false}
            className="w-full sm:w-auto min-w-48 shadow-[0_4px_16px_rgba(11,94,215,0.22)]"
          >
            Save Changes
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
