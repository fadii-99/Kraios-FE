import { useId, useRef, useState } from 'react'
import { CircleNotch, PaperPlaneRight } from '@phosphor-icons/react'
import FloorPlanSourcePreview from '@/components/dashboard/projects/workflow/step-1/FloorPlanSourcePreview'
import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import FormInput from '@/components/ui/FormInput'
import {
  EMPTY_PROMPT_ERROR,
  PROMPT_PLACEHOLDER,
  createGeneratedSource,
} from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import {
  FloorPlanGenerationUnavailableError,
  GENERATION_FAILED_MESSAGE,
  requestFloorPlanGeneration,
} from '@/lib/dashboard/workflow/step-1/floorPlanGeneration'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * Generate mode's work surface: the floor-plan composer, or the generated plan
 * once one exists.
 *
 * Not a chat box — it collects one brief for one drawing, with the same framed
 * sheet, heading treatment and CTA the upload side uses, so switching modes
 * changes the task and not the design system.
 *
 * The prompt lives in the stage above, not here: toggling to Upload and back
 * must not throw away what the user typed, and Regenerate has to hand the same
 * brief back to this field.
 *
 * `requestFloorPlanGeneration` has no backend behind it yet and says so via Toast.
 */
export default function GenerateFloorPlanPanel({
  source,
  prompt,
  onPromptChange,
  onSourceChange,
  className,
}) {
  const fieldId = useId()
  const promptRef = useRef(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const brief = prompt.trim()

    if (!brief) {
      setError(EMPTY_PROMPT_ERROR)
      showErrorToast(EMPTY_PROMPT_ERROR, { id: 'empty-prompt' })
      promptRef.current?.focus()
      return
    }

    setError(null)
    setPending(true)

    try {
      const result = await requestFloorPlanGeneration(brief)

      onSourceChange(
        createGeneratedSource({
          prompt: brief,
          previewUrl: result.previewUrl,
          ownsPreviewUrl: result.ownsPreviewUrl,
        }),
      )
      showSuccessToast('Floor plan generated.')
    } catch (thrown) {
      const msg =
        thrown instanceof FloorPlanGenerationUnavailableError
          ? thrown.message
          : GENERATION_FAILED_MESSAGE

      // The generation backend is not connected: this is a notice about what
      // the product cannot do yet, not a failure the user caused.
      showInfoToast(msg, { id: 'floor-plan-generation-notice' })
    } finally {
      setPending(false)
    }
  }

  // Regenerate returns to the composer with the brief intact — it clears the
  // one active source rather than adding a second.
  const handleRegenerate = () => {
    onSourceChange(null)
  }

  const handleClear = () => {
    setError(null)
    onSourceChange(null)
  }

  if (source) {
    return (
      <div className={cn('flex flex-1 flex-col', className)}>
        <FloorPlanSourcePreview
          source={source}
          onRemove={handleClear}
          onRegenerate={handleRegenerate}
        />
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={cn('flex w-full flex-1 flex-col', className)}
    >
      <FloorPlanWorkArea className="w-full h-[430px] sm:h-[445px] lg:h-[455px] flex flex-col justify-between px-5 py-5 sm:px-6 sm:py-5.5">
        <h3
          className="text-[1.4375rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] sm:text-[1.75rem]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Describe Your Floor Plan
        </h3>

        {/* The Prompt Composer Field with Embedded Send Button */}
        <div className="relative mt-3.5 flex flex-1 flex-col min-h-0">
          <label
            htmlFor={fieldId}
            className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--tone-muted)] mb-1.5"
          >
            Floor plan description
          </label>

          <textarea
            id={fieldId}
            ref={promptRef}
            placeholder={PROMPT_PLACEHOLDER}
            value={prompt}
            onChange={(event) => {
              onPromptChange(event.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                handleSubmit(event)
              }
            }}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={cn(
              'block w-full flex-1 min-h-[210px] sm:min-h-[225px] lg:min-h-[235px] resize-none rounded-sm border bg-[var(--field-bg)]',
              'p-4 sm:p-4.5 pr-13 pb-13 text-[0.875rem] sm:text-[0.9375rem] leading-[1.65] sm:leading-[1.75]',
              'text-[var(--tone-ink)] placeholder:text-[var(--tone-muted)]/55',
              'outline-none transition-[border-color,box-shadow] duration-300 focus-visible:outline-none',
              error
                ? 'border-[#E5484D] focus:border-[#E5484D]'
                : 'border-[var(--tone-line-strong)] hover:border-[var(--tone-muted)] focus:border-[var(--tone-accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--tone-accent)_16%,transparent)]',
            )}
          />

          {/* The visible copy is a toast; the field keeps the red border,
              `aria-invalid`, and this description for assistive tech. */}
          {error && (
            <p id={`${fieldId}-error`} className="sr-only">
              Error — {error}
            </p>
          )}

          {/* Embedded Send Icon Button */}
          <div className="absolute bottom-3 right-3 z-10">
            <button
              type="submit"
              disabled={pending || !prompt?.trim()}
              aria-label="Generate floor plan"
              title="Generate Floor Plan (Ctrl + Enter)"
              className={cn(
                'flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm',
                'bg-[var(--color-brand-deep)] text-white shadow-xs transition-all duration-200',
                'hover:bg-[var(--color-brand)] active:scale-95',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--color-brand-deep)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
              )}
            >
              {pending ? (
                <CircleNotch size={18} weight="bold" className="animate-spin text-white" />
              ) : (
                <PaperPlaneRight size={17} weight="fill" className="text-white translate-x-px" />
              )}
            </button>
          </div>
        </div>
      </FloorPlanWorkArea>
    </form>
  )
}
