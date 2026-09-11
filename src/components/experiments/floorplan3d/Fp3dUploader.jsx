import { useCallback, useId, useRef, useState } from 'react'
import { FileArrowUp, WarningCircle } from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * Drop a floor plan here.
 *
 * The drag counter is not decoration. `dragleave` fires when the pointer
 * crosses into any child element, so a naive boolean makes the highlight
 * flicker every time the cursor passes over the icon or the text. Counting
 * enter/leave pairs is the only way to know the pointer has actually left.
 *
 * Validation here is deliberately thin — extension and size only. The server
 * decides by DECODING the file, and duplicating that judgement in the browser
 * would mean two rules that disagree. What the browser checks is what it can
 * check without reading the file: is this the kind of thing to send at all.
 *
 * The limits come from the server's own capability report rather than being
 * typed here, so a deployment that raises the ceiling does not need a frontend
 * change to allow it.
 */

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf,.dxf'
const FALLBACK_MAX_BYTES = 25 * 1024 * 1024

export default function Fp3dUploader({
  onUpload,
  busy = false,
  progress = null,
  limits,
  className,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const dragDepth = useRef(0)

  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')

  const maxBytes = limits?.maxUploadBytes || FALLBACK_MAX_BYTES
  const extensions = limits?.acceptedExtensions?.length
    ? limits.acceptedExtensions
    : ACCEPT.split(',')

  const submit = useCallback(
    (file) => {
      if (!file) return
      const name = file.name.toLowerCase()
      if (!extensions.some((extension) => name.endsWith(extension))) {
        setLocalError('Upload a PNG, JPG, WEBP, PDF or DXF floor plan.')
        return
      }
      if (file.size > maxBytes) {
        setLocalError(
          `That file is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`,
        )
        return
      }
      setLocalError('')
      onUpload(file)
    },
    [extensions, maxBytes, onUpload],
  )

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      if (busy) return
      submit(event.dataTransfer?.files?.[0])
    },
    [busy, submit],
  )

  const percent = progress == null ? null : Math.round(progress * 100)

  return (
    <div className={className}>
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setDragging(false)
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-md border-2',
          'border-dashed px-6 py-10 text-center transition-colors duration-200',
          dragging
            ? 'border-[var(--color-brand-deep)] bg-blue-50/60'
            : 'border-[var(--tone-line-strong)] bg-[var(--color-light)]',
          busy && 'opacity-70',
        )}
      >
        <FileArrowUp
          size={34}
          weight="light"
          aria-hidden="true"
          className="text-[var(--color-brand-deep)]"
        />

        <div>
          <p className="text-[0.9375rem] font-semibold text-[var(--tone-ink)]">
            Drop a floor plan
          </p>
          <p className="mt-1 max-w-md text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
            Residential or commercial. PNG, JPG, WEBP, a PDF of up to{' '}
            {limits?.maxPdfPages ?? 20} pages, or a DXF — a vector drawing gives
            the best result, because its coordinates are read rather than
            interpreted.
          </p>
        </div>

        {busy && percent != null ? (
          <div className="w-full max-w-xs">
            <div
              className="h-1.5 w-full overflow-hidden rounded-xs bg-[var(--tone-line)]"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
            >
              <div
                className="h-full bg-[var(--color-brand-deep)] transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.75rem] tabular-nums text-[var(--tone-muted-dark)]">
              Uploading… {percent}%
            </p>
          </div>
        ) : (
          <PrimaryButton
            type="button"
            size="compact"
            withArrow={false}
            loading={busy}
            loadingLabel="Uploading"
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </PrimaryButton>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={extensions.join(',')}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            submit(event.target.files?.[0])
            // Cleared so choosing the same file twice in a row still fires a
            // change event — otherwise a failed upload cannot be retried by
            // re-picking the same file.
            event.target.value = ''
          }}
        />
      </div>

      {localError && (
        <p
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-rose-700"
        >
          <WarningCircle size={14} weight="fill" aria-hidden="true" className="shrink-0" />
          {localError}
        </p>
      )}
    </div>
  )
}
