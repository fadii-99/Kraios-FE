import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  CaretDown,
  CheckCircle,
  CircleNotch,
  Cube,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Trash,
} from '@phosphor-icons/react'

import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import { formatFileSize } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { assignDocumentsToSlots } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * PROJECT FILES — every file this workspace works from, behind ONE control.
 *
 * The BoQ header used to carry three separate dropdown triggers (Documents · 2D
 * Floor Plans · 3D Floor Plans) and the composer carried two more controls (the
 * paperclip and the document-type menu) for the same subject. Five entry points
 * for one idea — "the files this BOQ is built from" — is what made the header
 * read as a toolbar. They are one button now, and the panel behind it is the
 * whole set: what the project already holds, and the slots that are still
 * empty.
 *
 * TWO variants, one component, because the difference is genuinely only which
 * sections apply:
 *
 *   - `full`    (Step 3) — the 2D plan, the approved 3D render, and the four
 *                          document slots that can be filled here.
 *   - `compact` (Step 2) — the 2D plan alone, which is all Step 2 works from.
 *                          Narrower panel, same language.
 *
 * Nothing is invented. A missing plan, render or document says it is missing;
 * the panel never stands a fixture in for a file the project does not have.
 *
 * The panel does NOT scroll. What it holds is a fixed, small set — two required
 * files and four document slots — so the whole thing is meant to be read at a
 * glance; an inner scroller hid half the slots behind a gesture and made the
 * panel feel longer than its contents. Its height is its content's height, and
 * the cards are spaced to be read rather than packed. If a project ever grows
 * enough "Additional" documents to outrun a short viewport, cap and scroll THAT
 * list alone — never the panel.
 */
export default function ProjectFilesPanel({
  plan,
  render,
  documents = [],
  onUploadDocument,
  onRemoveDocument,
  uploading = false,
  disabled = false,
  variant = 'full',
  className,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  /**
   * WHICH slot is uploading, and what file — so the wait is legible.
   *
   * The page's `uploading` flag says only that an upload is in flight, and two
   * slots can share a `typeId`, so neither could tell the user which card they
   * are waiting on. This is held here, keyed by SLOT id, and the panel awaits
   * the page's handler (which resolves only after the document list has been
   * refetched) — so the busy state ends exactly when the card is ready to show
   * the real file, with no gap in between.
   */
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const buttonId = useId()
  const panelId = useId()

  const compact = variant === 'compact'

  const planFile = plan?.previewUrl || plan?.imageUrl
    ? {
        name: plan.name || '2D Floor Plan',
        previewUrl: plan.previewUrl || plan.imageUrl,
        imageUrl: plan.previewUrl || plan.imageUrl,
        kind: plan.kind || 'image',
        extension: plan.extension || 'PNG',
      }
    : null

  const renderFile = render?.imageUrl
    ? {
        name: render.assetName || render.title || 'Approved 3D Render',
        previewUrl: render.imageUrl,
        imageUrl: render.imageUrl,
        kind: 'image',
        extension: '3D Render',
      }
    : null

  const { slots, extra } = assignDocumentsToSlots(documents)
  const filledSlots = slots.filter((slot) => slot.document).length
  const busyUploading = uploading || Boolean(uploadingSlot)

  // What the trigger counts: the required files that are present, plus every
  // document actually uploaded, over what this variant can hold.
  const requiredPresent = (planFile ? 1 : 0) + (compact ? 0 : renderFile ? 1 : 0)
  const requiredTotal = compact ? 1 : 2
  const presentCount = requiredPresent + (compact ? 0 : documents.length)
  const totalCount = requiredTotal + (compact ? 0 : slots.length)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleView(file) {
    if (!file) return
    setPreview(file)
    setIsOpen(false)
  }

  const handleSlotUpload = useCallback(
    async (file, slot) => {
      if (!onUploadDocument || uploadingSlot) return

      setUploadingSlot({ id: slot.id, fileName: file.name })
      try {
        await onUploadDocument(file, slot)
      } finally {
        setUploadingSlot(null)
      }
    },
    [onUploadDocument, uploadingSlot],
  )

  return (
    <>
      <div ref={containerRef} className={cn('relative inline-flex items-center', className)}>
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={cn(
            'inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-2.5 font-display select-none sm:h-8.5 sm:px-3',
            'shadow-2xs transition-all duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
            isOpen
              ? 'border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)]/8 text-[var(--color-brand-deep)]'
              : 'border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <FolderOpen size={14} weight="bold" aria-hidden="true" className="shrink-0" />
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.12em] whitespace-nowrap">
            Project Files
          </span>
          <span
            className={cn(
              'flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[0.5625rem] font-bold tabular-nums',
              'bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]',
            )}
          >
            {busyUploading && (
              <CircleNotch
                size={9}
                weight="bold"
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            {presentCount}/{totalCount}
          </span>
          <CaretDown
            size={9}
            weight="bold"
            aria-hidden="true"
            className={cn(
              'shrink-0 transition-transform duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        {isOpen && (
          <div
            id={panelId}
            role="dialog"
            aria-label="Project files"
            className={cn(
              'absolute right-0 top-full z-[100] mt-2 rounded-md border border-[var(--tone-line-strong)] bg-white shadow-[0_16px_40px_rgba(7,20,38,0.18)]',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              compact ? 'w-[20rem]' : 'w-[22rem] sm:w-[31rem]',
            )}
          >
            {/* Panel head */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--tone-line)] px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p
                  className="font-display text-[0.6875rem] font-black uppercase tracking-[0.1em] text-[var(--tone-ink)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Project Files
                </p>
                <p className="mt-1 text-[0.6875rem] leading-snug text-[var(--tone-muted-dark)]">
                  {compact
                    ? 'Used throughout this 3D rendering conversation'
                    : 'Used throughout this BOQ conversation'}
                </p>
              </div>
              <span className="mt-0.5 shrink-0 rounded-xs bg-[var(--color-brand-deep)]/10 px-1.5 py-0.5 text-[0.5625rem] font-bold tabular-nums text-[var(--color-brand-deep)]">
                {presentCount}/{totalCount}
              </span>
            </div>

            <div className="px-4 py-4 sm:px-5 sm:py-4.5">
              {/* ── Required project files ── */}
              <SectionLabel>Required</SectionLabel>

              <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
                <RequiredCard
                  title="2D Floor Plan"
                  fallbackIcon={ImageIcon}
                  file={planFile}
                  emptyLabel="No approved 2D plan yet"
                  onView={() => handleView(planFile)}
                />

                {!compact && (
                  <RequiredCard
                    title="3D Image"
                    fallbackIcon={Cube}
                    file={renderFile}
                    emptyLabel="No approved 3D render yet"
                    onView={() => handleView(renderFile)}
                  />
                )}
              </div>

              {/* ── Supporting documents ── */}
              {!compact && (
                <>
                  <SectionLabel
                    trailing={`${filledSlots}/${slots.length}`}
                    className="mt-5 sm:mt-6"
                  >
                    Documents
                  </SectionLabel>

                  <div className="grid grid-cols-2 gap-3">
                    {slots.map((slot) => (
                      <DocumentSlotCard
                        key={slot.id}
                        slot={slot}
                        busy={uploadingSlot?.id === slot.id}
                        busyFileName={uploadingSlot?.id === slot.id ? uploadingSlot.fileName : null}
                        disabled={busyUploading}
                        onUpload={onUploadDocument && handleSlotUpload}
                        onRemove={onRemoveDocument}
                      />
                    ))}
                  </div>

                  {extra.length > 0 && (
                    <>
                      <SectionLabel className="mt-5 sm:mt-6">Additional</SectionLabel>
                      <ul className="flex flex-col gap-2">
                        {extra.map((record) => (
                          <li
                            key={record.id}
                            className="flex items-center justify-between gap-2 rounded-xs border border-[var(--tone-line)] bg-[var(--color-light)]/60 px-3 py-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText
                                size={15}
                                weight="bold"
                                aria-hidden="true"
                                className="shrink-0 text-[var(--color-brand-deep)]"
                              />
                              <p className="truncate text-[0.6875rem] font-bold text-[var(--tone-ink)]">
                                {record.name}
                              </p>
                            </div>
                            {onRemoveDocument && (
                              <RemoveDocumentButton
                                name={record.name}
                                onClick={() => onRemoveDocument(record.id)}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {preview && (
        <FloorPlanFullscreenModal
          source={preview}
          open={Boolean(preview)}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Panel pieces
   --------------------------------------------------------------------------- */

function SectionLabel({ children, trailing, className }) {
  return (
    <div className={cn('mb-2.5 flex items-center justify-between gap-2', className)}>
      <span
        className="font-display text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-deep)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {children}
      </span>
      {trailing && (
        <span className="text-[0.5625rem] font-bold tabular-nums text-[var(--tone-muted-dark)]">
          {trailing}
        </span>
      )}
    </div>
  )
}

/** One of the files the stage cannot proceed without. */
function RequiredCard({ title, file, fallbackIcon: FallbackIcon, emptyLabel, onView }) {
  const present = Boolean(file)

  return (
    <div
      className={cn(
        'flex flex-col rounded-sm border bg-white p-3',
        present ? 'border-[var(--tone-line-strong)]' : 'border-dashed border-[var(--tone-line-strong)]',
      )}
    >
      <div className="mb-2.5 flex items-center gap-1.5">
        {present ? (
          <CheckCircle
            size={13}
            weight="fill"
            aria-hidden="true"
            className="shrink-0 text-[var(--color-success)]"
          />
        ) : (
          <FallbackIcon
            size={13}
            weight="bold"
            aria-hidden="true"
            className="shrink-0 text-[var(--tone-muted-dark)]"
          />
        )}
        <span
          className="font-display text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-[var(--tone-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </span>
      </div>

      <div className="flex h-[5rem] w-full items-center justify-center overflow-hidden rounded-xs border border-[var(--tone-line)] bg-[var(--color-light)]">
        {present ? (
          <img src={file.previewUrl} alt={file.name} className="h-full w-full object-contain p-1" />
        ) : (
          <FallbackIcon size={22} weight="duotone" aria-hidden="true" className="text-[var(--tone-muted)]" />
        )}
      </div>

      <p
        className="mt-2.5 truncate text-[0.6875rem] font-bold text-[var(--tone-ink)]"
        title={present ? file.name : emptyLabel}
      >
        {present ? file.name : emptyLabel}
      </p>

      {present && (
        <div className="mt-2.5 border-t border-[var(--tone-line)] pt-2">
          <PanelAction onClick={onView}>View</PanelAction>
        </div>
      )}
    </div>
  )
}

/** One document slot — filled, uploading, or an empty upload target. */
function DocumentSlotCard({ slot, busy, busyFileName, disabled, onUpload, onRemove }) {
  const inputRef = useRef(null)
  const inputId = useId()
  const record = slot.document

  const handleChange = (event) => {
    const [file] = Array.from(event.target.files || [])
    // Reset first: picking the same file twice in a row must still fire.
    event.target.value = ''
    if (file) onUpload?.(file, slot)
  }

  /* THIS slot is uploading. The card takes the state rather than the button:
     the whole card is what the user pointed at, so the whole card is what says
     "this one is going". It names the file, because a slot with four siblings
     that all say "Uploading…" would not answer the question being asked. */
  if (busy) {
    return (
      <div className="flex flex-col rounded-sm border border-[var(--color-brand-deep)]/35 bg-[var(--color-brand-deep)]/6 p-3">
        <span
          className="font-display mb-2.5 truncate text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-[var(--color-brand-deep)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {slot.label}
        </span>

        <div
          className="flex h-[5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xs border border-dashed border-[var(--color-brand-deep)]/40 bg-white/70 px-2 text-center"
          aria-live="polite"
        >
          <CircleNotch
            size={16}
            weight="bold"
            aria-hidden="true"
            className="animate-spin text-[var(--color-brand-deep)] motion-reduce:animate-none"
          />
          <span className="text-[0.625rem] font-semibold text-[var(--color-brand-deep)]">
            Uploading…
          </span>
          {busyFileName && (
            <span
              className="w-full truncate text-[0.5625rem] text-[var(--tone-muted-dark)]"
              title={busyFileName}
            >
              {busyFileName}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (record) {
    return (
      <div className="flex flex-col rounded-sm border border-[var(--tone-line-strong)] bg-white p-3">
        <div className="mb-2.5 flex items-center gap-1.5">
          <CheckCircle
            size={13}
            weight="fill"
            aria-hidden="true"
            className="shrink-0 text-[var(--color-success)]"
          />
          <span
            className="font-display truncate text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {slot.label}
          </span>
        </div>

        <div className="flex min-w-0 items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-[var(--tone-line)] bg-[var(--color-light)] text-[var(--color-brand-deep)]">
            <FileText size={16} weight="bold" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.6875rem] font-bold text-[var(--tone-ink)]" title={record.name}>
              {record.name}
            </p>
            <p className="mt-0.5 text-[0.5625rem] text-[var(--tone-muted-dark)]">
              {record.typeLabel || 'Document'}
              {typeof record.size === 'number' ? ` · ${formatFileSize(record.size)}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--tone-line)] pt-2">
          {record.previewUrl ? (
            <PanelAction as="a" href={record.previewUrl} target="_blank" rel="noreferrer">
              View
            </PanelAction>
          ) : (
            <span className="text-[0.5625rem] text-[var(--tone-muted)]">Uploaded</span>
          )}

          {onRemove && (
            <RemoveDocumentButton name={record.name} onClick={() => onRemove(record.id)} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-sm border border-dashed border-[var(--tone-line-strong)] bg-[var(--color-light)]/45 p-3">
      <span
        className="font-display mb-2.5 truncate text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-[var(--tone-muted-dark)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {slot.label}
      </span>

      <label htmlFor={inputId} className="sr-only">
        {`Upload ${slot.label}`}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        onChange={handleChange}
        disabled={disabled || !onUpload}
        className="sr-only"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || !onUpload}
        className={cn(
          'flex h-[5rem] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xs border border-dashed',
          'border-[var(--tone-line-strong)] bg-white text-[var(--tone-muted-dark)]',
          'transition-colors duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
          'disabled:cursor-not-allowed disabled:opacity-55',
        )}
      >
        <Plus size={14} weight="bold" aria-hidden="true" />
        <span className="text-[0.625rem] font-semibold">Add document</span>
      </button>
    </div>
  )
}

function RemoveDocumentButton({ name, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Remove ${name}`}
      title={`Remove ${name}`}
      className={cn(
        'flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-xs text-[var(--tone-muted-dark)]',
        'transition-colors duration-200 hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger)]',
      )}
    >
      <Trash size={12} weight="bold" aria-hidden="true" />
    </button>
  )
}

/** The panel's one small text action, as a button or a real link. */
function PanelAction({ as: Tag = 'button', children, ...rest }) {
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      className={cn(
        'inline-flex cursor-pointer items-center rounded-xs px-1 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.1em]',
        'text-[var(--color-brand-deep)] transition-colors duration-200 hover:underline',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
