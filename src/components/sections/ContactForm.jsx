import { useRef, useState } from 'react'

import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { contact } from '@/lib/content'
import { isEmail } from '@/lib/validate'

const EMPTY = { name: '', email: '', details: '' }
const REQUIRED = ['name', 'email', 'details']

/** Error messages state the cause and the fix, per the UX guidance. */
function validate(values) {
  const errors = {}

  if (!values.name.trim()) errors.name = 'Enter your name so we know who to reply to.'

  if (!values.email.trim()) errors.email = 'Enter an email address so we can send your quote.'
  else if (!isEmail(values.email))
    errors.email = 'That address looks incomplete — check for a missing @ or domain.'

  if (!values.details.trim()) errors.details = 'Tell us briefly what you need visualized.'
  else if (values.details.trim().length < 20)
    errors.details = 'Add a little more detail — a sentence helps us quote accurately.'

  return errors
}

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success
  const formRef = useRef(null)

  const setField = (key) => (e) => {
    const { value } = e.target
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      const next = validate({ ...values, [key]: value })
      setErrors((prev) => ({ ...prev, [key]: next[key] }))
    }
  }

  // Validate on blur, not on every keystroke.
  const onBlur = (key) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    const next = validate(values)
    setErrors((prev) => ({ ...prev, [key]: next[key] }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = validate(values)
    setErrors(next)
    setTouched(Object.fromEntries(REQUIRED.map((k) => [k, true])))

    const firstInvalid = REQUIRED.find((k) => next[k])
    if (firstInvalid) {
      formRef.current?.querySelector(`#${firstInvalid}`)?.focus()
      return
    }

    setStatus('submitting')
    // Frontend only for now — swap for a real endpoint. See PROGRESS.md.
    await new Promise((resolve) => setTimeout(resolve, 900))
    setStatus('success')
    setValues(EMPTY)
    setTouched({})
  }

  if (status === 'success') {
    return (
      <div className="border-t-2 border-[var(--tone-accent)] pt-8 text-left" role="status">
        <p className="label-mono text-[var(--tone-accent)]">Enquiry received</p>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--tone-ink)]">
          Thank you — we have your details and will reply within one business day with scope,
          timeline and a fixed quote.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="label-mono mt-8 min-h-12 cursor-pointer border border-[var(--tone-line-strong)] px-7 py-3.5 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          Send another enquiry
        </button>
      </div>
    )
  }

  const field = (key, extra = {}) => ({
    id: key,
    label: contact.fields[key].label,
    placeholder: contact.fields[key].placeholder,
    autoComplete: contact.fields[key].autoComplete,
    value: values[key],
    onChange: setField(key),
    onBlur: onBlur(key),
    error: touched[key] ? errors[key] : undefined,
    required: true,
    ...extra,
  })

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-9 text-left">
      <FormInput {...field('name')} />
      <FormInput {...field('email', { type: 'email', inputMode: 'email' })} />
      <FormInput {...field('details', { as: 'textarea', rows: 4 })} />

      <PrimaryButton type="submit" loading={status === 'submitting'} className="w-full">
        {contact.submitLabel}
      </PrimaryButton>
    </form>
  )
}
