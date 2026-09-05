import { useCallback, useId, useRef, useState } from 'react'
import { FileArrowUp, WarningCircle } from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * Drop a 2D floor plan here.
 *
 * The drag counter is not decoration. `dragleave` fires when the pointer
 * crosses into any child element, so a naive boolean makes the highlight
 * flicker every time the cursor passes over the icon or the text. Counting
 * enter/leave pairs is the only way to know the pointer has actually left.
 *
 * Validation is deliberately thin here — extension and size only. The server
 * decides by decoding the file, and duplicating that judgement in the browser
 * would mean two rules that disagree.
 */

const ACCEPT = '.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,.pdf'
const ACCEPTED_EXTENSIONS = ACCEPT.split(',')

// Mirrors BIM_MAX_UPLOAD_BYTES on the server. Checked here only to fail fast on
// something obviously too big rather than after a 25 MB upload.
const MAX_BYTES = 25 * 1024 * 1024

export default function BimUploader({ onUpload, busy = false, className }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const dragDepth = useRef(0)

  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')

  const submit = useCallback(
    (file) => {
      if (!file) return

      const name = file.name.toLowerCase()
      if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
        setLocalError('Upload a PNG, JPEG, WebP, BMP, TIFF or PDF floor plan.')
        return
      }
      if (file.size > MAX_BYTES) {
        setLocalError('That file is larger than 25 MB.')
        return
      }

      setLocalError('')
      onUpload(file)
    },
    [onUpload],
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
          'flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-10 text-center',
          'transition-colors duration-200',
          dragging
            ? 'border-[var(--color-brand-deep)] bg-blue-50/60'
            : 'border-[var(--tone-line-strong)] bg-[var(--color-light)]',
          busy && 'opacity-60',
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
            Drop a 2D floor plan
          </p>
          <p className="mt-1 text-[0.8125rem] text-[var(--tone-muted-dark)]">
            House, shop, office, warehouse — any building. PNG, JPEG, WebP, BMP,
            TIFF or a single-page PDF.
          </p>
        </div>

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

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
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
