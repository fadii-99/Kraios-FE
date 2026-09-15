import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowClockwise,
  Check,
  PaperPlaneRight,
  Prohibit,
  Question,
  Sparkle,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'

import { humanise } from '@/lib/floorplan3d/semanticModel'
import { cn } from '@/lib/cn'

/**
 * Editing by typing, as one tab of the right-hand panel.
 *
 * THE ANSWER IS IN THE VIEWPORT. This panel itemises a proposal; it does not
 * try to describe the building. Changed elements are painted green in the model
 * and the numbers are listed here, because "three windows on the south wall"
 * means nothing until you can see which three.
 *
 * NOTHING HERE APPLIES ANYTHING. The panel renders a proposal and reports the
 * user's decision upwards. Applying runs in the editor page, through the same
 * command history a Properties-panel edit uses, so undo works on a prompt edit
 * exactly as it does on a typed one.
 *
 * A REJECTED OPERATION IS SHOWN, NOT SWALLOWED. If a plan asked for six changes
 * and two were thrown away, this says so. A preview that quietly lists four
 * looks like a small plan rather than a plan that lost a third of its work, and
 * the user approves it without knowing what is missing.
 */

const STATUS_LABEL = {
  PROPOSED: 'Proposed',
  APPLIED: 'Applied',
  DISCARDED: 'Discarded',
  ASKED: 'Question',
  REFUSED: 'Not possible',
  FAILED: 'Failed',
}

/** Field names as a person would say them. Anything absent is humanised. */
const FIELD_LABELS = {
  width: 'Width',
  height: 'Height',
  sill_height: 'Sill height',
  thickness: 'Thickness',
  position: 'Position along wall',
  host_wall_id: 'Host wall',
  room_type: 'Room type',
  floor_material_id: 'Floor finish',
  material_id: 'Material',
  ceiling_height: 'Ceiling height',
  wall_type: 'Wall type',
  load_bearing: 'Load bearing',
  semantic_class: 'Item',
  asset_id: 'Catalogue item',
  step_count: 'Steps',
  tread_depth: 'Tread depth',
  riser_height: 'Riser height',
  run_width: 'Run width',
  total_rise: 'Total rise',
  goes_up: 'Goes up',
  polyline: 'Shape',
  polygon: 'Shape',
  slab_polygon: 'Floor outline',
  color: 'Colour',
  rotation: 'Rotation',
}

/** Fields measured in millimetres, so a value can be shown with its unit. */
const MILLIMETRE_FIELDS = new Set([
  'width',
  'height',
  'sill_height',
  'thickness',
  'position',
  'ceiling_height',
  'floor_to_floor',
  'slab_thickness',
  'tread_depth',
  'riser_height',
  'run_width',
  'total_rise',
  'elevation',
  'base_elevation',
])

function formatValue(name, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') {
    const rounded = Math.round(value * 10) / 10
    return MILLIMETRE_FIELDS.has(name) ? `${Math.round(value)} mm` : String(rounded)
  }
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === 'number')) {
      return value.map((entry) => Math.round(entry)).join(', ')
    }
    return `${value.length} points`
  }
  if (typeof value === 'string') return humanise(value)
  return '—'
}

function fieldLabel(name) {
  return FIELD_LABELS[name] ?? humanise(name)
}

/**
 * One element's before and after.
 *
 * Fields are capped at four. A wall whose polyline moved also reports its
 * length, its openings and its material in the same breath, and a list that
 * long stops being read — which defeats the point of showing it at all.
 */
function ChangeRow({ change, onSelect }) {
  const fields = (change.fields ?? []).slice(0, 4)
  const overflow = (change.fields?.length ?? 0) - fields.length
  return (
    <button
      type="button"
      onClick={() => onSelect?.(change.id)}
      className="block w-full cursor-pointer px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--color-light)]"
    >
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-[var(--tone-ink-soft)]">
        {change.label}
      </p>
      {fields.map((field) => (
        <p
          key={field.name}
          className="flex items-baseline gap-1.5 text-[0.6875rem] text-[var(--tone-ink)]"
        >
          <span className="text-[var(--tone-ink-soft)]">{fieldLabel(field.name)}</span>
          <span className="tabular-nums">{formatValue(field.name, field.before)}</span>
          <span className="text-[var(--tone-ink-soft)]">&rarr;</span>
          <span className="font-semibold tabular-nums text-[var(--color-brand-deep)]">
            {formatValue(field.name, field.after)}
          </span>
        </p>
      ))}
      {overflow > 0 && (
        <p className="text-[0.625rem] text-[var(--tone-ink-soft)]">
          and {overflow} more field{overflow === 1 ? '' : 's'}
        </p>
      )}
    </button>
  )
}

/**
 * The result of one operation, with whatever it actually did underneath.
 *
 * `skipped` is its own state and is worded as a fact rather than an error: the
 * commands refuse edits that would not fit, and "the plan already says that" is
 * a perfectly good outcome that should not look like a failure.
 */
function OperationCard({ result, onSelect }) {
  const tone =
    result.status === 'applied'
      ? 'border-[var(--tone-line)]'
      : 'border-[var(--color-warning)]/40'

  return (
    <div className={cn('rounded-sm border bg-white', tone)}>
      <div className="flex items-start gap-2 px-2.5 py-1.5">
        {result.destructive ? (
          <Trash size={12} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
        ) : result.status === 'applied' ? (
          <Check size={12} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
        ) : (
          <WarningCircle size={12} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-medium leading-snug text-[var(--tone-ink)]">
            {result.describe || result.label}
          </p>
          {result.status !== 'applied' && (
            <p className="mt-0.5 text-[0.625rem] leading-relaxed text-[var(--color-warning)]">
              {result.reason}
            </p>
          )}
          {result.confirmed && (
            <p className="mt-0.5 text-[0.625rem] leading-relaxed text-[var(--color-warning)]">
              You had confirmed this element.
            </p>
          )}
        </div>
      </div>

      {result.status === 'applied' && (result.changes?.length ?? 0) > 0 && (
        <div className="border-t border-[var(--tone-line)]">
          {result.changes.slice(0, 6).map((change) => (
            <ChangeRow key={change.id} change={change} onSelect={onSelect} />
          ))}
          {result.changes.length > 6 && (
            <p className="px-2.5 py-1 text-[0.625rem] text-[var(--tone-ink-soft)]">
              and {result.changes.length - 6} more element
              {result.changes.length - 6 === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}

      {(result.added?.length ?? 0) > 0 && (
        <p className="border-t border-[var(--tone-line)] px-2.5 py-1 text-[0.625rem] text-[var(--color-success)]">
          Adds {result.added.length} element{result.added.length === 1 ? '' : 's'} — recorded
          as added by you, not as something the drawing showed.
        </p>
      )}
      {(result.removed?.length ?? 0) > 0 && (
        <p className="border-t border-[var(--tone-line)] px-2.5 py-1 text-[0.625rem] text-[var(--color-danger)]">
          Removes {result.removed.map((entry) => entry.label).slice(0, 4).join(', ')}
          {result.removed.length > 4 ? ` and ${result.removed.length - 4} more` : ''}.
        </p>
      )}
    </div>
  )
}

function Turn({ edit, preview, onSelect, onApply, onDiscard, onAsk, busy }) {
  const isOpen = edit.status === 'PROPOSED'
  const rejections = edit.rejections ?? []

  return (
    <article className="border-b border-[var(--tone-line)] px-3 py-3">
      {/* What they typed. Right-aligned, so a long conversation reads as one. */}
      <p className="ml-auto w-fit max-w-[90%] rounded-sm rounded-br-none border border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)]/8 px-2 py-1.5 text-[0.6875rem] leading-snug text-[var(--tone-ink)]">
        {edit.prompt}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        {edit.outcome === 'refuse' ? (
          <Prohibit size={12} className="text-[var(--tone-ink-soft)]" />
        ) : edit.outcome === 'question' ? (
          <Question size={12} className="text-[var(--color-warning)]" />
        ) : (
          <Sparkle size={12} className="text-[var(--color-brand-deep)]" />
        )}
        <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-[var(--tone-ink-soft)]">
          {STATUS_LABEL[edit.status] ?? edit.status}
        </span>
        {preview && preview.applied > 0 && (
          <span className="text-[0.5625rem] text-[var(--tone-ink-soft)]">
            · {preview.applied} change{preview.applied === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {edit.summary && (
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
          {edit.summary}
        </p>
      )}

      {/* A question, with its answers as buttons. Clicking one sends it as the
          next instruction, which is what makes answering cost a click. */}
      {(edit.questions ?? []).map((question) => (
        <div key={question.question} className="mt-2">
          <p className="text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
            {question.question}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(question.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onAsk?.(`${edit.prompt} — ${option}`)}
                disabled={busy}
                className="cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-2 py-1 text-[0.625rem] text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      {preview && preview.results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {preview.results.map((result, index) => (
            <OperationCard
              key={`${result.operation}-${result.targetId ?? index}`}
              result={result}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {(edit.notes ?? []).map((note) => (
        <p
          key={note}
          className="mt-1.5 border-l-2 border-[var(--tone-line-strong)] pl-2 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]"
        >
          {note}
        </p>
      ))}

      {rejections.length > 0 && (
        <p className="mt-1.5 border-l-2 border-[var(--color-warning)] pl-2 text-[0.625rem] leading-relaxed text-[var(--color-warning)]">
          {rejections.length} part{rejections.length === 1 ? '' : 's'} of that could not be
          used: {rejections.map((entry) => entry.reason).slice(0, 2).join('; ')}.
        </p>
      )}

      {isOpen && preview && preview.applied > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onApply}
            disabled={busy}
            className="label-ui inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-[var(--btn-bg)] px-3 py-1.5 text-[var(--btn-ink)] transition-colors hover:bg-[var(--btn-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={12} />
            Keep {preview.applied} change{preview.applied === 1 ? '' : 's'}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={busy}
            className="label-ui inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-3 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={12} />
            Discard
          </button>
        </div>
      )}

      {isOpen && preview && preview.applied === 0 && preview.results.length > 0 && (
        <button
          type="button"
          onClick={onDiscard}
          className="label-ui mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-3 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)]"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </article>
  )
}

const SUGGESTIONS = [
  'Set the ceilings to 3 m',
  'Make the front door 1 m wide',
  'Turn the store into a meeting room',
]

export default function AssistPanel({
  edits,
  preview,
  openEditId,
  busy,
  disabled,
  disabledReason,
  levelName,
  selectionLabel,
  onSend,
  onApply,
  onDiscard,
  onSelect,
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  // Newest at the bottom, like every other conversation. The API answers
  // newest-first because a list endpoint should, so the reversal is here.
  const ordered = useMemo(() => [...(edits ?? [])].reverse(), [edits])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [ordered.length, preview])

  const send = (text) => {
    const instruction = (text ?? draft).trim()
    if (!instruction || busy || disabled) return
    setDraft('')
    onSend(instruction)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {ordered.length === 0 && (
          <div className="px-3 py-4">
            <p className="text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
              Describe a change and it will be worked out as a list of edits you can
              look at before keeping.
            </p>
            <p className="mt-1.5 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
              Nothing is saved until you press Keep. Everything it changes is the same
              set of controls the Properties tab has.
            </p>
            <div className="mt-2.5 flex flex-col items-start gap-1">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={disabled || busy}
                  className="cursor-pointer text-left text-[0.625rem] text-[var(--color-brand-deep)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-[var(--tone-ink-soft)] disabled:no-underline"
                >
                  “{suggestion}”
                </button>
              ))}
            </div>
          </div>
        )}

        {ordered.map((edit) => (
          <Turn
            key={edit.id}
            edit={edit}
            preview={edit.id === openEditId ? preview : null}
            busy={busy}
            onSelect={onSelect}
            onApply={onApply}
            onDiscard={onDiscard}
            onAsk={send}
          />
        ))}

        {busy && (
          <p className="flex items-center gap-1.5 px-3 py-3 text-[0.6875rem] text-[var(--tone-ink-soft)]">
            <ArrowClockwise size={12} className="animate-spin" />
            Working out what to change…
          </p>
        )}
      </div>

      {/* Compose. The scope chips are not decoration: "make this wall thicker"
          cannot be answered without knowing what `this` is, and a user who can
          see that nothing is selected rephrases before sending. */}
      <div className="shrink-0 border-t border-[var(--tone-line)] p-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-[var(--tone-ink-soft)]">
            Scope
          </span>
          <span className="rounded-sm border border-[var(--color-brand-deep)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--color-brand-deep)]">
            {levelName || 'This level'}
          </span>
          <span className="rounded-sm border border-[var(--tone-line)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--tone-ink-soft)]">
            {selectionLabel ? `Selected: ${selectionLabel}` : 'Nothing selected'}
          </span>
        </div>

        <textarea
          id="floorplan3d-assist-prompt"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is a newline. Ctrl/Cmd+Enter also sends,
            // because half of everybody has learned that instead.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          rows={2}
          maxLength={1000}
          disabled={disabled || busy}
          placeholder={
            disabled
              ? disabledReason || 'Prompt editing is unavailable.'
              : 'Ask for a change — “widen the corridor to 1500”…'
          }
          className="w-full resize-none rounded-sm border border-[var(--tone-line-strong)] bg-[var(--field-bg)] px-2 py-1.5 text-[0.6875rem] text-[var(--tone-ink)] outline-none transition-colors placeholder:text-[var(--tone-ink-soft)] focus:border-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => send()}
            disabled={!draft.trim() || busy || disabled}
            className="label-ui inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-[var(--btn-bg)] px-3 py-1.5 text-[var(--btn-ink)] transition-colors hover:bg-[var(--btn-bg-hover)] disabled:cursor-not-allowed disabled:bg-[var(--tone-line-strong)]"
          >
            <PaperPlaneRight size={12} />
            Send
          </button>
          <span className="ml-auto text-[0.5625rem] text-[var(--tone-ink-soft)]">
            Enter to send
          </span>
        </div>

        {disabled && disabledReason && (
          <p className="mt-1.5 text-[0.625rem] leading-relaxed text-[var(--color-warning)]">
            {disabledReason}
          </p>
        )}
      </div>
    </div>
  )
}
