import { cn } from '@/lib/cn'

/**
 * The one input used by every form on the site (Contact, Login, Forgot
 * Password, Signup). Boxed, sharp corners, tone-aware surface.
 *
 * The label is always a real `<label for>` — a placeholder is a hint, never a
 * label. Errors are wired through `aria-describedby` + `role="alert"` and are
 * prefixed "Error —" so the state never depends on colour alone.
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
  className,
  ...rest
}) {
  const Tag = as
  const errorId = `${id}-error`

  return (
    <div className={cn('group', className)}>
      <label
        htmlFor={id}
        className="label-mono block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
      >
        {label}
        {required && (
          <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <Tag
        id={id}
        name={name ?? id}
        type={as === 'input' ? type : undefined}
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
          // min-h-12 keeps the touch target at 48px
          'mt-3 block min-h-12 w-full border bg-[var(--field-bg)] px-4 py-3.5',
          'text-[1rem] text-[var(--tone-ink)] placeholder:text-[var(--tone-muted)]/55',
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
        )}
        {...rest}
      />

      {error && (
        <p id={errorId} role="alert" className="label-mono mt-2.5 text-[#E5484D]">
          Error — {error}
        </p>
      )}
    </div>
  )
}
