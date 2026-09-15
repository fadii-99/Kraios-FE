import { useCallback, useId, useRef, useState } from 'react'
import { FileArrowUp, WarningCircle, X } from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import { UPLOAD_ACCEPT, UPLOAD_PHASES, describeRejection } from '@/lib/floorplan3d/useChunkedUpload'
import { cn } from '@/lib/cn'

/**
 * Drop a 2D floor plan here.
 *
 * The drag counter is not decoration. `dragleave` fires when the pointer
 * crosses into any CHILD element, so a naive boolean makes the highlight
 * flicker every time the cursor passes over the icon or the text. Counting
 * enter/leave pairs is the only way to know the pointer has actually left.
 *
 * Client-side validation is deliberately thin — extension and size only. The
 * server decides by reading the file's own signature, and duplicating that
 * judgement here would mean two rules that disagree.
 *
 * The progress bar is honest about its phases: hashing happens before a byte is
 * sent, and assembly plus hash verification happen after the last one. A bar
 * that jumps to 100% and then waits is a bar that lies.
 */

const PHASE_COPY = {
  [UPLOAD_PHASES.HASHING]: 'Checksumming the file…',
  [UPLOAD_PHASES.UPLOADING]: 'Uploading…',
  [UPLOAD_PHASES.ASSEMBLING]: 'Verifying and assembling…',
  [UPLOAD_PHASES.DONE]: 'Uploaded.',
}

export default function PlanUploader({ onUpload, onCancel, phase, progress, error, filename, busy }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')

  const submit = useCallback(
    (file) => {
      const rejection = describeRejection(file)
      if (rejection) {
        setLocalError(rejection)
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

  const message = localError || error

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current -= 1
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setDragging(false)
        }
      }}
      onDrop={onDrop}
      className={cn(
        'relative rounded-md border border-dashed p-6 text-center transition-colors sm:p-8',
        dragging
          ? 'border-[var(--color-brand-deep)] bg-[color-mix(in_oklab,var(--color-brand)_6%,transparent)]'
          : 'border-[var(--tone-line-strong)] bg-white',
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={UPLOAD_ACCEPT}
        disabled={busy}
        onChange={(event) => {
          submit(event.target.files?.[0])
          // Cleared so choosing the SAME file twice still fires a change event —
          // which is exactly what a user does after a failed upload.
          event.target.value = ''
        }}
        className="sr-only"
      />

      <FileArrowUp
        size={30}
        className={cn(
          'mx-auto mb-3',
          dragging ? 'text-[var(--color-brand-deep)]' : 'text-[var(--tone-ink-soft)]',
        )}
      />

      {busy ? (
        <div className="mx-auto max-w-sm">
          <p className="truncate text-sm font-medium text-[var(--tone-ink)]">{filename}</p>
          <p className="mt-0.5 text-xs text-[var(--tone-ink-soft)]">
            {PHASE_COPY[phase] ?? 'Working…'}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-xs bg-[var(--color-light)]">
            <div
              className="h-full rounded-xs bg-[var(--color-brand-deep)] transition-[width] duration-300"
              style={{ width: `${Math.max(3, progress)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2.5 inline-flex cursor-pointer items-center gap-1 text-xs text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--color-danger)]"
          >
            <X size={12} />
            Cancel this upload
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-[var(--tone-ink)]">
            Drop a 2D floor plan here
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--tone-ink-soft)]">
            PNG, JPEG, WEBP, a single- or multi-page PDF, or a DXF with named wall
            layers. Large files are uploaded in resumable 3 MB parts and verified
            by checksum.
          </p>
          <PrimaryButton
            as="label"
            htmlFor={inputId}
            size="compact"
            withArrow={false}
            className="mt-4 inline-flex"
          >
            Choose a file
          </PrimaryButton>
        </>
      )}

      {message && (
        <p className="mt-3 inline-flex items-start gap-1.5 text-left text-xs text-[var(--color-danger)]">
          <WarningCircle size={14} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}
    </div>
  )
}
