import { ArrowsOut, FileArrowDown } from '@phosphor-icons/react'

import { renderStyleById, viewAngleById } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * One generated 3D result inside the conversation — the main content of this
 * workspace, so it gets the full column width. A render is what the user is
 * being asked to judge; a text turn is not, which is why the messages around it
 * are held to a reading measure and this is not.
 *
 * The render is never cropped: `object-contain` on a light stage, because a
 * cut-off model is a different model.
 *
 * ACTIONS split by what they do, and the split is what keeps this from becoming
 * a control panel with a picture in it. View angle and Approve CHANGE this
 * render, so they live in the message header above — always visible, never
 * competing with the drawing. Expand / Edit / DWG only LOOK at it, so they ride
 * an overlay rail that appears on hover or keyboard focus and never permanently
 * covers the model.
 *
 * On a coarse pointer — where hover is not a thing that reliably happens —
 * `touch:static` drops that rail out of the overlay and into a real row beneath
 * the image. Same markup, same actions, nothing hidden behind a gesture a touch
 * device cannot perform.
 *
 * DWG appears only when the service actually returned one. There is no
 * placeholder href and no disabled-looking button standing in for a file that
 * does not exist.
 *
 * SELECTING is a click on the render itself. The selected one is what the next
 * instruction changes, and only one is ever selected: the user's explicit
 * choice if they made one, otherwise the newest render. The mark is a hairline
 * of brand on the frame plus the word "Active" in the metadata line — not a
 * heavy blue outline, which would shout louder than the model it surrounds. It
 * pairs with the composer's context strip, which names the same render and
 * shows its thumbnail; the frame alone would be ambiguous, the strip alone
 * would leave the user hunting the transcript for which figure it meant.
 */
export default function AssistantResult({
  result,
  approved,
  isBase,
  onExpand,
  onSelect,
}) {
  const style = renderStyleById(result.renderStyleId)
  const angle = viewAngleById(result.viewAngleId)
  const angleLabel = angle?.label || 'Isometric 45°'
  const styleLabel = style?.label || 'SketchUp'
  const description = `${angleLabel}, ${styleLabel}`

  return (
    <figure
      className={cn(
        'group relative w-full rounded-md border bg-white shadow-2xs transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        approved
          ? 'border-[var(--color-success)]/45'
          : isBase
            ? 'border-[var(--color-brand-deep)]/40'
            : 'border-[var(--tone-line)] hover:border-[var(--tone-line-strong)]',
      )}
    >
      <div className="relative aspect-[4/3] max-h-[340px] sm:max-h-[380px] w-full overflow-hidden rounded-md bg-[var(--color-light)]">
        <img
          src={result.imageUrl}
          alt={`Generated 3D floor model — ${description}`}
          loading="eager"
          className="h-full w-full object-contain p-2"
        />

        {/* The whole render is the selection target. A transparent button
            rather than a handler on the figure, so it is reachable by keyboard
            and announces its state; the inspection rail is a later sibling and
            paints above it.

            It exists only when there IS something to select. A preview view
            cannot become the render the next instruction refines, so it gets no
            target at all rather than a focusable overlay that does nothing. */}
        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={isBase}
            aria-label={`Use this ${description} render as the current design`}
            className={cn(
              'absolute inset-0 cursor-pointer rounded-md',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
            )}
          />
        )}
      </div>

      {/* Inspection rail: an overlay on a mouse, a real row on touch. */}
      <div
        className={cn(
          'absolute right-2.5 top-2.5 flex flex-wrap items-center justify-end gap-1.5',
          'opacity-0 transition-opacity duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          'touch:static touch:border-t touch:border-[var(--tone-line)] touch:px-3 touch:py-2 touch:opacity-100',
        )}
      >
        <ResultAction icon={ArrowsOut} label="Full View" onClick={onExpand} />
        {result.dwgUrl && (
          <ResultAction
            as="a"
            icon={FileArrowDown}
            label="DWG"
            href={result.dwgUrl}
            download
            target="_blank"
            rel="noreferrer"
            accessibleLabel="Download DWG file"
          />
        )}
      </div>
    </figure>
  )
}

/** One rail action. Same box whether it is a button or a real download link. */
function ResultAction({
  as: Tag = 'button',
  icon: Icon,
  label,
  accessibleLabel,
  ...rest
}) {
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      aria-label={accessibleLabel || label}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xs border px-2.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] shadow-2xs font-display whitespace-nowrap',
        'transition-all duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
        'border-[var(--tone-line-strong)] bg-white/95 text-[var(--tone-ink)] backdrop-blur-[2px]',
        'hover:border-[var(--color-brand-deep)] hover:bg-white hover:text-[var(--color-brand-deep)]',
      )}
      style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}
      {...rest}
    >
      <Icon size={12} weight="bold" aria-hidden="true" className="shrink-0" />
      <span>{label}</span>
    </Tag>
  )
}
