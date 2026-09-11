import { useEffect, useRef, useState } from 'react'
import {
  ArrowCounterClockwise,
  ChatCircleDots,
  CheckCircle,
  ClockCounterClockwise,
  PaperPlaneRight,
  WarningCircle,
  Wrench,
} from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * The bottom panel: what the engine found, what you asked it to change, and
 * everything that has happened to this model.
 *
 * THREE LISTS, SPLIT ON PURPOSE — the same split the BIM engine settled on,
 * because the three answer different questions:
 *
 *   - **Needs your attention** — the engine could not decide; a person must.
 *   - **Assumed, not measured** — values invented because the drawing did not
 *     state them. The most commercially important list here: a wall height
 *     nobody chose still ends up in a bill of quantities.
 *   - **Fixed automatically** — a disclosure, not a to-do. The model was
 *     changed before the user saw it, and not saying so means their quantities
 *     differ from their drawing for reasons they were never told.
 */

const TABS = [
  { id: 'chat', label: 'Edit in words', icon: ChatCircleDots },
  { id: 'findings', label: 'Findings', icon: WarningCircle },
  { id: 'assumed', label: 'Assumed', icon: Wrench },
  { id: 'history', label: 'History', icon: ClockCounterClockwise },
]

const QUICK_PROMPTS = [
  'Change all external walls to 250 mm',
  'Increase the ground-floor height to 3.4 metres',
  'Move the selected door 300 mm along its wall',
  'Use concrete flooring in the lobby',
]

export default function Fp3dActivityPanel({
  quality,
  model,
  revisions,
  transcript,
  chatBusy,
  onSendInstruction,
  onRestoreRevision,
  onFocusElement,
  selectedId,
  className,
}) {
  const [tab, setTab] = useState('chat')
  const [instruction, setInstruction] = useState('')
  const scrollerRef = useRef(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (tab === 'chat' && scroller) scroller.scrollTop = scroller.scrollHeight
  }, [transcript, tab])

  const needsReview = quality?.needsReview ?? []
  const repaired = quality?.repaired ?? []
  const assumptions = model?.assumptions ?? []

  const counts = {
    chat: transcript?.length ?? 0,
    findings: needsReview.length,
    assumed: assumptions.length,
    history: revisions?.length ?? 0,
  }

  const submit = (event) => {
    event.preventDefault()
    const text = instruction.trim()
    if (!text || chatBusy) return
    setInstruction('')
    onSendInstruction(text)
  }

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col border-t border-[var(--tone-line)] bg-white',
        className,
      )}
      aria-label="Activity"
    >
      <div
        role="tablist"
        aria-label="Activity"
        className="flex shrink-0 items-center gap-1 border-b border-[var(--tone-line)] px-2 py-1.5"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5',
              'text-[0.75rem] font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-[var(--color-brand-deep)]',
              tab === id
                ? 'bg-[color-mix(in_oklab,var(--color-brand-deep)_10%,transparent)] text-[var(--color-brand-deep)]'
                : 'text-[var(--tone-muted-dark)] hover:bg-[var(--color-light)]',
            )}
          >
            <Icon size={13} weight="bold" aria-hidden="true" />
            {label}
            {counts[id] > 0 && (
              <span className="tabular-nums opacity-70">{counts[id]}</span>
            )}
          </button>
        ))}
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {tab === 'chat' && (
          <ChatList transcript={transcript} onFocusElement={onFocusElement} />
        )}

        {tab === 'findings' && (
          needsReview.length === 0 ? (
            <Empty icon={CheckCircle}>
              Nothing needs your attention. Every check the engine runs either
              passed or was fixed — see the Assumed tab for what it had to guess.
            </Empty>
          ) : (
            <ul className="space-y-2">
              {needsReview.map((finding, index) => (
                <FindingRow
                  key={`${finding.code}-${index}`}
                  finding={finding}
                  onFocusElement={onFocusElement}
                />
              ))}
            </ul>
          )
        )}

        {tab === 'assumed' && (
          <>
            {assumptions.length === 0 && repaired.length === 0 ? (
              <Empty icon={CheckCircle}>
                Nothing was assumed and nothing was repaired — every value in
                this model was read from your drawing.
              </Empty>
            ) : null}

            {assumptions.length > 0 && (
              <>
                <Heading>Assumed, not measured</Heading>
                <p className="mb-2 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
                  The drawing did not state these, so a standard construction
                  value was used. They are as real as any other number in a bill
                  of quantities, so check the ones that matter.
                </p>
                <ul className="mb-4 space-y-1.5">
                  {assumptions.map((assumption, index) => (
                    <li
                      key={`${assumption.target}-${index}`}
                      className="rounded-sm border border-[var(--tone-line)] px-2.5 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => onFocusElement(assumption.target.split('.')[0])}
                        className="text-[0.75rem] font-semibold text-[var(--color-brand-deep)] hover:underline"
                      >
                        {assumption.target}
                      </button>
                      {assumption.value != null && (
                        <span className="ml-1.5 text-[0.75rem] tabular-nums text-[var(--tone-ink)]">
                          = {String(assumption.value)}
                        </span>
                      )}
                      <p className="mt-0.5 text-[0.6875rem] leading-snug text-[var(--tone-muted-dark)]">
                        {assumption.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {repaired.length > 0 && (
              <>
                <Heading>Fixed automatically</Heading>
                <p className="mb-2 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
                  The model was changed before you saw it. Nothing here needs
                  doing — it is here because you should know it happened.
                </p>
                <ul className="space-y-1.5">
                  {repaired.map((finding, index) => (
                    <li
                      key={`${finding.code}-${index}`}
                      className="rounded-sm border border-[var(--tone-line)] px-2.5 py-2"
                    >
                      <p className="text-[0.75rem] leading-snug text-[var(--tone-ink)]">
                        {finding.message}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] leading-snug text-[var(--color-success)]">
                        {finding.repair}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          (revisions?.length ?? 0) === 0 ? (
            <Empty icon={ClockCounterClockwise}>No revisions yet.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {revisions.map((revision) => (
                <li
                  key={revision.id}
                  className="flex items-start gap-2 rounded-sm border border-[var(--tone-line)] px-2.5 py-2"
                >
                  <span className="mt-0.5 shrink-0 rounded-xs bg-[var(--color-light)] px-1.5 py-0.5 text-[0.625rem] font-bold tabular-nums text-[var(--tone-muted-dark)]">
                    r{revision.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.75rem] leading-snug text-[var(--tone-ink)]">
                      {revision.summary || 'Saved.'}
                    </p>
                    {revision.instruction && (
                      <p className="mt-0.5 text-[0.6875rem] italic leading-snug text-[var(--tone-muted-dark)]">
                        “{revision.instruction}”
                      </p>
                    )}
                    {revision.assumption && (
                      <p className="mt-0.5 text-[0.6875rem] leading-snug text-[var(--color-warning)]">
                        Assumed: {revision.assumption}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestoreRevision(revision.number)}
                    className="shrink-0 rounded-xs p-1 text-[var(--tone-muted-dark)] hover:bg-[var(--color-light)] hover:text-[var(--color-brand-deep)]"
                    title={`Restore revision ${revision.number}`}
                    aria-label={`Restore revision ${revision.number}`}
                  >
                    <ArrowCounterClockwise size={13} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {tab === 'chat' && (
        <form
          onSubmit={submit}
          className="shrink-0 border-t border-[var(--tone-line)] p-2.5"
        >
          {(transcript?.length ?? 0) === 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInstruction(prompt)}
                  className={cn(
                    'rounded-xs border border-[var(--tone-line-strong)] px-2 py-1',
                    'text-[0.6875rem] text-[var(--tone-muted-dark)] transition-colors',
                    'hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={instruction}
              disabled={chatBusy}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={
                selectedId
                  ? `Change ${selectedId}, or anything else…`
                  : 'Describe the change — “make the north wall 250 mm”'
              }
              className={cn(
                'min-w-0 flex-1 rounded-[var(--radius-field)] border bg-white px-3.5 py-2',
                'border-[var(--tone-line-strong)] text-[0.8125rem] text-[var(--tone-ink)]',
                'placeholder:text-[var(--tone-muted-dark)]',
                'focus:border-[var(--color-brand-deep)] focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            />
            <PrimaryButton
              type="submit"
              size="sm"
              withArrow={false}
              loading={chatBusy}
              loadingLabel="Applying"
              disabled={!instruction.trim()}
            >
              <PaperPlaneRight size={14} weight="bold" aria-hidden="true" />
              Apply
            </PrimaryButton>
          </div>
        </form>
      )}
    </section>
  )
}

function Heading({ children }) {
  return (
    <h4 className="mb-1.5 text-[0.625rem] font-bold uppercase tracking-[0.09em] text-[var(--tone-muted-dark)]">
      {children}
    </h4>
  )
}

function Empty({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-2 py-3 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
      <Icon size={15} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0 opacity-60" />
      <span>{children}</span>
    </p>
  )
}

function FindingRow({ finding, onFocusElement }) {
  const tone =
    finding.severity === 'error'
      ? 'border-rose-300 bg-rose-50/60'
      : finding.severity === 'warning'
        ? 'border-amber-300 bg-amber-50/50'
        : 'border-[var(--tone-line)]'

  return (
    <li className={cn('rounded-sm border px-2.5 py-2', tone)}>
      <p className="text-[0.75rem] leading-snug text-[var(--tone-ink)]">
        {finding.message}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {finding.elementId && (
          <button
            type="button"
            onClick={() => onFocusElement(finding.elementId)}
            className="text-[0.6875rem] font-semibold text-[var(--color-brand-deep)] hover:underline"
          >
            Show {finding.elementId}
          </button>
        )}
        <span className="text-[0.625rem] uppercase tracking-[0.06em] text-[var(--tone-muted-dark)]">
          {finding.code}
        </span>
      </div>
    </li>
  )
}

function ChatList({ transcript, onFocusElement }) {
  if (!transcript?.length) {
    return (
      <Empty icon={ChatCircleDots}>
        Describe a change in ordinary words and it becomes a validated edit — no
        code is generated and nothing is run. Every instruction that changes the
        model is saved as a revision you can undo.
      </Empty>
    )
  }

  return (
    <ul className="space-y-2.5">
      {transcript.map((turn) => (
        <li key={turn.id} className="rounded-sm border border-[var(--tone-line)] p-2.5">
          <p className="text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
            {turn.instruction}
          </p>

          {turn.pending && (
            <p className="mt-1 text-[0.75rem] text-[var(--color-brand-deep)]">
              Working on it…
            </p>
          )}

          {turn.descriptions?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {turn.descriptions.map((description, index) => (
                <li
                  key={index}
                  className="flex gap-1.5 text-[0.75rem] leading-snug text-[var(--color-success)]"
                >
                  <CheckCircle
                    size={12}
                    weight="fill"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  {description}
                </li>
              ))}
            </ul>
          )}

          {turn.assumption && (
            <p className="mt-1.5 rounded-xs bg-amber-50 px-2 py-1.5 text-[0.6875rem] leading-snug text-amber-900">
              It had to decide something for you: {turn.assumption}
            </p>
          )}

          {turn.explanation && !turn.descriptions?.length && (
            <p className="mt-1 text-[0.75rem] leading-snug text-[var(--tone-muted-dark)]">
              {turn.explanation}
            </p>
          )}

          {turn.rejected?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {turn.rejected.map((rejection, index) => (
                <li
                  key={index}
                  className="flex gap-1.5 text-[0.6875rem] leading-snug text-[var(--color-danger)]"
                >
                  <WarningCircle
                    size={12}
                    weight="fill"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {rejection.reason}
                    {rejection.target && (
                      <button
                        type="button"
                        onClick={() => onFocusElement(rejection.target)}
                        className="ml-1 font-semibold underline"
                      >
                        {rejection.target}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
