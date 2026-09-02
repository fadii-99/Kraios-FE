import { useState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * The one input used by every form on the site (Login, Forgot Password,
 * Signup). Boxed, lightly softened corners (--radius-sm), tone-aware surface.
 *
 * The label is always a real `<label for>` — a placeholder is a hint, never a
 * label.
 *
 * `error` marks the field invalid; it does NOT print a line of red text under
 * it any more. Transient validation copy is a toast now (see `@/lib/toast`),
 * raised once per submit by the form that owns the rules. What stays here is
 * everything that says WHERE the problem is and survives the toast closing:
 * the red border, `aria-invalid`, and the message itself carried in a
 * screen-reader-only node that `aria-describedby` points at — so the field is
 * never identified by colour alone, and the id is never left dangling.
 *
 * A `type="password"` field gets a REVEAL control, the same one the Profile's
 * Reset Password modal already uses: an eye on the trailing edge, quiet until
 * hovered, that flips the field between `password` and `text`. It is a real
 * button with an accessible name, and it is skipped in the tab order
 * (`tabIndex={-1}`) so keyboard users going through a form are not stopped by an
 * optional control between the field and the submit. The field keeps its own
 * `type` prop as the starting state, so nothing about validation or autofill
 * changes.
 *
 * `size="compact"` is the in-application density (dashboard forms): the same
 * border, focus, radius and transition, but a 44px field and a quieter label —
 * `label-ui`'s 0.16em drafting-annotation tracking is right for a five-field
 * marketing form and too loud for a settings screen. Auth pages keep the
 * default and render exactly as before.
 */
export default function FormInput({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  error,
  autoComplete,
  as = 'input',
  rows,
  inputMode,
  size = 'default',
  className,
  ...rest
}) {
  const Tag = as
  const errorId = `${id}-error`
  const compact = size === 'compact'

  const [revealed, setRevealed] = useState(false)
  const isPassword = as === 'input' && type === 'password'
  const resolvedType = isPassword && revealed ? 'text' : type

  return (
    <div className={cn('group', className)}>
      <label
        htmlFor={id}
        className={cn(
          'block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]',
          // `.label-ui` is hand-written in @layer utilities and outranks Tailwind
          // font utilities, so the compact label opts out of the class entirely
          // rather than trying to override it.
          compact
            ? 'text-[0.6875rem] font-semibold uppercase tracking-[0.06em]'
            : 'label-ui',
        )}
      >
        {label}
        {required && (
          <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={cn(isPassword && 'relative')}>
        <Tag
          id={id}
          name={name ?? id}
          type={as === 'input' ? resolvedType : undefined}
          rows={as === 'textarea' ? rows : undefined}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // min-h-12 keeps the touch target at 48px; compact holds 44px, the floor
            'block w-full rounded-sm border bg-[var(--field-bg)]',
            compact
              ? 'mt-2 min-h-11 px-3.5 py-2.5 text-[0.9375rem]'
              : 'mt-3 min-h-12 px-4 py-3.5 text-[1rem]',
            'text-[var(--tone-ink)] placeholder:text-[var(--tone-muted)]/55',
            'outline-none transition-[border-color,box-shadow] duration-300 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error
              ? 'border-[#E5484D] focus:border-[#E5484D]'
              : [
                  'border-[var(--tone-line-strong)] hover:border-[var(--tone-muted)]',
                  'focus:border-[var(--tone-accent)]',
                  // restrained brand-blue lift on focus, not a glow
                  'focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--tone-accent)_16%,transparent)]',
                ].join(' '),
            as === 'textarea' && 'min-h-32 resize-y',
            // Room for the reveal control, so a long password never runs under it.
            isPassword && 'pr-12',
          )}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            tabIndex={-1}
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={revealed}
            className={cn(
              'absolute right-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center',
              // The field's own `mt-3` collapses out of this wrapper (no border,
              // no padding), so the wrapper's box IS the field's box and 50%
              // centres on the field. Measured, not assumed.
              'text-[var(--tone-muted-dark)] opacity-40',
              'transition-all duration-200 hover:text-[var(--tone-ink)] hover:opacity-100',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]',
              disabled && 'pointer-events-none opacity-25',
            )}
          >
            {revealed ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="sr-only">
          Error — {error}
        </p>
      )}
    </div>
  )
}
