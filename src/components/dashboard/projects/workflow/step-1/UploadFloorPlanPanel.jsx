import { useId, useRef, useState } from 'react'
import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import PrimaryButton from '@/components/ui/PrimaryButton'
import {
  FLOOR_PLAN_ACCEPT,
  MULTIPLE_FILES_NOTICE,
  UNSUPPORTED_FILE_ERROR,
  createUploadSource,
  isSupportedFloorPlanFile,
} from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * Upload mode's work surface: a drafted dropzone ready for 2D architectural drawings.
 */
export default function UploadFloorPlanPanel({
  onSourceChange,
  onUploadSuccess,
  className,
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  // dragenter/dragleave fire for every child element the pointer crosses, so
  // the active state is refcounted rather than toggled.
  const dragDepth = useRef(0)

  const acceptFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return

    // Only ever one plan. Extra files are ignored, and the user is told via toast.
    if (files.length > 1) {
      showInfoToast(MULTIPLE_FILES_NOTICE, { id: 'multiple-files' })
    }

    const [file] = files

    if (!isSupportedFloorPlanFile(file)) {
      showErrorToast(UNSUPPORTED_FILE_ERROR, { id: 'unsupported-file' })
      return
    }

    const newSource = createUploadSource(file)
    if (onUploadSuccess) {
      onUploadSuccess(newSource)
    } else {
      onSourceChange?.(newSource)
      showSuccessToast('Floor plan uploaded successfully.', { id: 'upload-success' })
    }
  }

  const handleInputChange = (event) => {
    acceptFiles(event.target.files)
    event.target.value = ''
  }

  const handleDragEnter = (event) => {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    acceptFiles(event.dataTransfer?.files)
  }

  return (
    <div className={cn('flex w-full flex-1 flex-col', className)}>
      <FloorPlanWorkArea
        active={dragging}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'group relative w-full h-[430px] sm:h-[445px] lg:h-[455px] flex flex-col items-center justify-center px-4 py-6 text-center sm:px-8 sm:py-7 lg:px-10 lg:py-8',
          'transition-all duration-300 ease-[var(--ease-out-expo)]',
          'hover:border-[var(--tone-line-strong)]',
        )}
      >
        {/* ── 1. Architectural 2D Floor-Plan Icon ── */}
        <TechnicalIconFrame
          size={64}
          accent="var(--color-brand-deep)"
          interactive={true}
          className="transition-transform duration-300 group-hover:scale-105"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="text-[var(--color-brand-deep)] transition-transform duration-300 group-hover:scale-105"
          >
            {/* Outer Perimeter Boundary */}
            <rect
              x="3"
              y="3"
              width="26"
              height="26"
              rx="2"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Room Partition Walls */}
            <path
              d="M3 14H17M17 3V21M17 21H29M10 14V29"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Architectural Door Swing Arc & Hinge */}
            <path
              d="M17 8A6 6 0 0 1 23 14"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeDasharray="2 2"
              strokeLinecap="round"
            />
            <circle cx="17" cy="14" r="1.5" fill="currentColor" />
          </svg>
        </TechnicalIconFrame>

        {/* ── 2. Main Heading ── */}
        <h3
          className="mt-3.5 text-[1.4375rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] sm:mt-4 sm:text-[1.75rem]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {dragging ? 'Drop Floor Plan to Upload' : 'Upload Now'}
        </h3>

        {/* ── 3. Primary Upload CTA ── */}
        {/* The input IS the control; the button is its label. */}
        <input
          id={inputId}
          type="file"
          accept={FLOOR_PLAN_ACCEPT}
          onChange={handleInputChange}
          className="peer sr-only"
        />

        <PrimaryButton
          as="label"
          htmlFor={inputId}
          size="compact"
          align="center"
          withArrow={false}
          className={cn(
            'mt-5 sm:mt-6 cursor-pointer px-6',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--tone-accent)]',
          )}
        >
          Choose File
        </PrimaryButton>

        {/* ── 5. Drag & Drop Helper ── */}
        <p className="mt-3 text-[0.75rem] sm:text-[0.8125rem] text-[var(--tone-muted)]">
          or drag and drop your floor plan here
        </p>

        {/* ── 6. Supported Formats ── */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-7 lg:mt-8">
          <span className="label-ui text-[0.6875rem] uppercase tracking-wider text-[var(--tone-muted)]">
            Supported
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {['PNG', 'JPG', 'JPEG', 'PDF'].map((ext) => (
              <span
                key={ext}
                className="rounded-xs border border-[var(--tone-line)] bg-white px-2 py-0.5 text-[0.625rem] sm:text-[0.6875rem] font-semibold tracking-wider text-[var(--tone-ink)]"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </FloorPlanWorkArea>
    </div>
  )
}
