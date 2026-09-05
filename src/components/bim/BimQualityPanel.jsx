import { CheckCircle, Info, Warning, WarningOctagon, Wrench } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * What the grader found, and what it changed on the user's behalf.
 *
 * Exported as three PIECES rather than one panel, because the details section
 * shows them on separate tabs — the score is always visible, findings and
 * assumptions are each their own tab. A single component would have to be told
 * which parts to render, which is a prop that exists only to undo the
 * component.
 *
 * Everything here takes the ADAPTED view models (`bimAdapters.qualityToView`
 * and `planFactsToView`); no raw payload reaches this file.
 *
 * The three lists are deliberately NOT merged, because they are different kinds
 * of news:
 *
 *   - findings that need attention — work. The engine could not decide, so a
 *     person has to.
 *   - assumptions — the commercially important one. Every value in it was
 *     invented because the drawing did not state it, and a wall height nobody
 *     chose still ends up in a bill of quantities.
 *   - automatic repairs — a disclosure, not a to-do. The model was altered
 *     before the user ever saw it, and not saying so would mean their
 *     quantities differ from their drawing for reasons they were never told.
 */

const GRADE_TONE = {
  A: 'border-emerald-500/40 bg-emerald-50 text-emerald-700',
  B: 'border-emerald-500/35 bg-emerald-50/70 text-emerald-700',
  C: 'border-amber-500/40 bg-amber-50 text-amber-700',
  D: 'border-orange-500/40 bg-orange-50 text-orange-700',
  F: 'border-rose-500/40 bg-rose-50 text-rose-700',
}

/** The grade badge and the two scores behind it. */
export function ExtractionScore({ quality, className }) {
  if (!quality) return null
  const grade = quality.grade || '—'

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-[1.25rem] font-bold',
          GRADE_TONE[grade] ?? GRADE_TONE.C,
        )}
        style={{ fontFamily: 'var(--font-display)' }}
        aria-hidden="true"
      >
        {grade}
      </div>

      <div className="min-w-0">
        <p className="text-[0.875rem] font-semibold text-[var(--tone-ink)]">
          {quality.score}/100 extraction quality
        </p>
        <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
          Geometry {quality.geometryScore}/100
          {/* null and 0 mean different things: the audit did not run, versus it
              ran and found nothing recognisable. Only the second is a score. */}
          {quality.visualScore === null
            ? ' · drawing comparison unavailable'
            : ` · matches your drawing ${quality.visualScore}/100`}
        </p>
      </div>

      {!quality.acceptable && (
        <span className="inline-flex items-center gap-1.5 rounded-xs border border-amber-500/40 bg-amber-50 px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-amber-800">
          <Warning size={11} weight="bold" aria-hidden="true" />
          Review before building
        </span>
      )}
    </div>
  )
}

/** What the audit and the grader flagged, plus what the grader fixed. */
export function FindingsList({ quality, className }) {
  if (!quality) return null

  const nothingToSay =
    quality.visualNotes.length === 0 &&
    quality.attention.length === 0 &&
    quality.repaired.length === 0

  if (nothingToSay) {
    return (
      <p className={cn('flex items-center gap-2 text-[0.8125rem] text-[var(--tone-muted-dark)]', className)}>
        <CheckCircle size={16} weight="fill" className="shrink-0 text-[var(--color-success)]" />
        No problems were found in this plan.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {quality.visualNotes.length > 0 && (
        <Group title="Checked against your drawing" count={quality.visualNotes.length}>
          {quality.visualNotes.map((note, index) => (
            <Row key={index} icon={Info} tone="neutral" text={note} />
          ))}
        </Group>
      )}

      {quality.attention.length > 0 && (
        <Group title="Needs your attention" count={quality.attention.length} tone="warning">
          {quality.attention.map((issue, index) => (
            <Row
              key={`${issue.code}-${index}`}
              icon={issue.severity === 'error' ? WarningOctagon : Warning}
              tone={issue.severity === 'error' ? 'danger' : 'warning'}
              text={issue.message}
              badge={issue.elementId}
            />
          ))}
        </Group>
      )}

      {quality.repaired.length > 0 && (
        <Group title="Fixed automatically" count={quality.repaired.length} tone="success">
          {quality.repaired.map((issue, index) => (
            <Row
              key={`${issue.code}-fixed-${index}`}
              icon={Wrench}
              tone="success"
              text={issue.repair}
              detail={issue.message}
              badge={issue.elementId}
            />
          ))}
        </Group>
      )}
    </div>
  )
}

/** Every value the engine supplied because the drawing did not state it. */
export function AssumptionsList({ facts, className }) {
  const assumptions = facts?.assumptions ?? []

  if (assumptions.length === 0) {
    return (
      <p className={cn('text-[0.8125rem] text-[var(--tone-muted-dark)]', className)}>
        Nothing was assumed — every value came off the drawing.
      </p>
    )
  }

  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {assumptions.map((assumption, index) => (
        <Row
          key={`${assumption.target}-${index}`}
          icon={Info}
          tone="neutral"
          text={assumption.reason || assumption.target}
          badge={assumption.target}
          value={
            assumption.value === null || assumption.value === undefined
              ? null
              : String(assumption.value)
          }
        />
      ))}
    </ul>
  )
}

const GROUP_TONE = {
  danger: 'text-rose-700',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  neutral: 'text-[var(--tone-muted-dark)]',
}

function Group({ title, count, tone = 'neutral', children }) {
  return (
    <div>
      <h3
        className={cn(
          'mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.08em]',
          GROUP_TONE[tone] ?? GROUP_TONE.neutral,
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title} <span className="opacity-60">({count})</span>
      </h3>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  )
}

const ROW_TONE = {
  danger: 'text-rose-600',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  neutral: 'text-[var(--tone-muted)]',
}

/**
 * One finding.
 *
 * The badge is BELOW the message, not beside it. Beside it, a `shrink-0` badge
 * holding a long target — `F001-F011.position_size_height_rotation`, or
 * `omitted_toilet_partitions_and_stall_doors` — took the whole row and
 * collapsed the message column to about one character wide, so the sentence
 * rendered as a vertical stack of single letters. A target is generated text
 * with no length limit, so the layout must not assume one: it wraps on its own
 * line, with `break-all` because these are unbroken identifier strings that no
 * word-wrap can split.
 */
function Row({ icon: Icon, tone, text, detail, badge, value }) {
  return (
    <li className="flex gap-2 rounded-xs border border-[var(--tone-line)] bg-white px-2.5 py-2">
      <Icon
        size={14}
        weight="fill"
        aria-hidden="true"
        className={cn('mt-0.5 shrink-0', ROW_TONE[tone] ?? ROW_TONE.neutral)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] leading-snug text-[var(--tone-ink)]">{text}</p>

        {detail && (
          <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--tone-muted-dark)]">
            {detail}
          </p>
        )}

        {(badge || value) && (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            {badge && (
              <span className="break-all rounded-xs bg-[var(--color-light)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--tone-muted-dark)]">
                {badge}
              </span>
            )}
            {value && (
              <span className="font-mono text-[0.6875rem] font-semibold text-[var(--tone-ink)]">
                = {value}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  )
}
