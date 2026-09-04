import { useRef, useState } from 'react'
import { CheckCircle } from '@phosphor-icons/react'

import CountryDropdown from '@/components/ui/CountryDropdown'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import SelectDropdown from '@/components/ui/SelectDropdown'
import { CONTACT_TOPICS, submitContactRequest } from '@/lib/api'
import { contact } from '@/lib/content'
import { showErrorToast } from '@/lib/toast'
import { isEmail } from '@/lib/validate'

const EMPTY = {
  name: '',
  firm: '',
  email: '',
  country: '',
  topic: '',
  subject: '',
  message: '',
}

/**
 * The declared field order — and it is load-bearing twice over.
 *
 * It is the order the fields are read in, so the ONE toast an invalid submit
 * raises is about the first problem going down the form rather than whichever
 * key `Object.keys` happened to yield. And it is the order focus moves in, so
 * the toast and the focused field always name the same thing.
 */
const FIELD_ORDER = ['name', 'firm', 'email', 'country', 'topic', 'subject', 'message']

// The server enforces this too (`ContactRequestSerializer.message`). Stated
// here as well so a two-word message is refused before a round trip, not after
// one — the same rule in the two places it has to hold.
const MIN_MESSAGE = 10

function validate(values) {
  const errors = {}

  if (!values.name.trim()) errors.name = 'Enter your full name.'
  if (!values.firm.trim()) errors.firm = 'Enter the name of your firm.'

  if (!values.email.trim()) errors.email = 'Enter your email address.'
  else if (!isEmail(values.email)) errors.email = 'Enter a valid email address.'

  if (!values.country.trim()) errors.country = 'Select the country you are writing from.'
  if (!values.topic.trim()) errors.topic = 'Choose the topic that fits best.'
  if (!values.subject.trim()) errors.subject = 'Give your message a subject.'

  if (!values.message.trim()) errors.message = 'Write your message.'
  else if (values.message.trim().length < MIN_MESSAGE) {
    errors.message = 'Tell us a little more — a sentence is enough.'
  }

  return errors
}

/**
 * The public contact form, submitting into the support queue.
 *
 * IT CONFIRMS IN PLACE rather than in a modal. Signup opens one because it has
 * booked something the visitor needs to read back; this has only sent a
 * message, and a dialog over a page somebody is already on is a dismissal they
 * did not ask for. The form is replaced by the confirmation, which is
 * announced, and sending another is one button away.
 *
 * VALIDATION LIVES IN `validate` above, not in the fields, for the reason
 * every other KRAIOS form gives: one rule, enforced on submit and on blur,
 * with no second copy to drift. The server checks again and is the authority.
 *
 * ONE TOAST PER INVALID SUBMIT (§30), chosen by `FIELD_ORDER`. Fields carry the
 * red border, `aria-invalid` and a screen-reader-only message; none of them
 * prints a line of red text.
 */
export default function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const [sent, setSent] = useState(false)
  const formRef = useRef(null)
  const confirmationRef = useRef(null)

  const setField = (key) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [key]: value }))

    // Re-check only a field that is ALREADY marked wrong. Validating as
    // somebody types into a field they have not finished turns a half-typed
    // address red before it could possibly be valid.
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: validate({ ...values, [key]: value })[key] }))
    }
  }

  const onBlur = (key) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: validate(values)[key] }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (status === 'submitting') return

    const found = validate(values)
    setErrors(found)
    setTouched(Object.fromEntries(FIELD_ORDER.map((key) => [key, true])))

    const first = FIELD_ORDER.find((key) => found[key])
    if (first) {
      formRef.current?.querySelector(`#contact-${first}`)?.focus()
      showErrorToast(found[first], { id: 'contact-validation' })
      return
    }

    setStatus('submitting')

    try {
      await submitContactRequest({
        name: values.name.trim(),
        firm: values.firm.trim(),
        email: values.email.trim(),
        country: values.country.trim(),
        topic: values.topic,
        subject: values.subject.trim(),
        message: values.message.trim(),
      })

      setValues(EMPTY)
      setTouched({})
      setErrors({})
      setSent(true)
      // The form is gone, so the confirmation has to take the focus the submit
      // button had — otherwise focus falls to the top of the document and a
      // keyboard user loses their place on the page.
      requestAnimationFrame(() => confirmationRef.current?.focus())
    } catch (failure) {
      showErrorToast(
        failure.message || 'Unable to send your message. Please try again.',
        { id: 'contact-error' },
      )
    } finally {
      setStatus('idle')
    }
  }

  if (sent) {
    return (
      <div
        ref={confirmationRef}
        tabIndex={-1}
        role="status"
        className="rounded-md border border-[var(--tone-line-strong)] bg-[var(--field-bg)] p-8 outline-none sm:p-10"
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-sm border border-[var(--tone-accent)] text-[var(--tone-accent)]"
        >
          <CheckCircle size={22} weight="light" />
        </span>

        <p className="label-ui mt-6 text-[var(--tone-accent)]">{contact.form.success.title}</p>

        <p className="mt-3 max-w-[46ch] text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]">
          {contact.form.success.body}
        </p>

        <button
          type="button"
          onClick={() => setSent(false)}
          className="label-ui mt-7 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] px-6 py-3.5 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          {contact.form.success.again}
        </button>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="rounded-md border border-[var(--tone-line-strong)] bg-[var(--field-bg)] p-6 sm:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <FormInput
          id="contact-name"
          label="Name"
          autoComplete="name"
          placeholder="Your full name"
          required
          value={values.name}
          onChange={setField('name')}
          onBlur={onBlur('name')}
          error={touched.name ? errors.name : undefined}
        />

        <FormInput
          id="contact-firm"
          label="Firm"
          autoComplete="organization"
          placeholder="Your firm"
          required
          value={values.firm}
          onChange={setField('firm')}
          onBlur={onBlur('firm')}
          error={touched.firm ? errors.firm : undefined}
        />

        <FormInput
          id="contact-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@firm.com"
          required
          value={values.email}
          onChange={setField('email')}
          onBlur={onBlur('email')}
          error={touched.email ? errors.email : undefined}
        />

        <CountryDropdown
          id="contact-country"
          name="country"
          label="Country"
          placeholder="Select country"
          required
          value={values.country}
          onChange={setField('country')}
          onBlur={onBlur('country')}
          error={touched.country ? errors.country : undefined}
        />

        <SelectDropdown
          id="contact-topic"
          name="topic"
          label="Topic"
          placeholder="Choose a topic"
          options={CONTACT_TOPICS}
          required
          value={values.topic}
          onChange={setField('topic')}
          onBlur={onBlur('topic')}
          error={touched.topic ? errors.topic : undefined}
        />

        <FormInput
          id="contact-subject"
          label="Subject"
          placeholder="One line summary"
          required
          value={values.subject}
          onChange={setField('subject')}
          onBlur={onBlur('subject')}
          error={touched.subject ? errors.subject : undefined}
        />

        <FormInput
          className="sm:col-span-2"
          id="contact-message"
          label="Message"
          as="textarea"
          rows={5}
          placeholder="Tell us what you are working on and what you need from us."
          required
          value={values.message}
          onChange={setField('message')}
          onBlur={onBlur('message')}
          error={touched.message ? errors.message : undefined}
        />
      </div>

      <PrimaryButton
        type="submit"
        loading={status === 'submitting'}
        loadingLabel="Sending"
        className="mt-8 w-full"
      >
        Send Message
      </PrimaryButton>

      <p className="mt-5 text-[0.875rem] leading-relaxed text-[var(--tone-muted)]">
        {contact.form.note}
      </p>
    </form>
  )
}
