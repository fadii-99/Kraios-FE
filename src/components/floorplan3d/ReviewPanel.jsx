import { useState } from 'react'
import { CaretDown, CaretRight, CheckCircle, Info, WarningCircle, Wrench } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * The three review lists, and the scale caveat above them.
 *
 * THIS PANEL IS THE PRODUCT, NOT A FAILURE MODE.
 * A floor plan can omit its scale, use unusual symbols, carry handwriting, or
 * superimpose demolition and construction layers. No detector resolves all of
 * that, and the honest design is to automate the confident parts and ASK about
 * the rest. That is what this panel does, and the three lists are split because
 * they need three different responses:
 *
 *   - **Needs your attention** — the engine could not decide; a person must.
 *   - **Assumed, not measured** — a value invented because the drawing did not
 *     state it. The most commercially important list here: a wall height nobody
 *     chose still ends up in a bill of quantities.
 *   - **Fixed automatically** — a DISCLOSURE, not a to-do. The model was changed
 *     before the user saw it, and not saying so means their quantities differ
 *     from their drawing for reasons they were never told.
 */

const SEVERITY_ICON = {
  error: WarningCircle,
  warning: WarningCircle,
  info: Info,
}

const SEVERITY_TONE = {
  error: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--tone-ink-soft)]',
}

function Section({ title, count, icon: Icon, children, defaultOpen = true, tone }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!count) return null
  return (
    <section className="border-b border-[var(--tone-line)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-light)]"
      >
        {open ? <CaretDown size={12} /> : <CaretRight size={12} />}
        <Icon size={14} className={tone} />
        <span className="text-xs font-medium text-[var(--tone-ink)]">{title}</span>
        <span className="ml-auto text-[0.625rem] text-[var(--tone-ink-soft)]">{count}</span>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </section>
  )
}

function Finding({ finding, onSelect, onConfirm, canEdit }) {
  const Icon = SEVERITY_ICON[finding.severity] ?? Info
  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-2">
        <Icon
          size={13}
          className={cn('mt-0.5 shrink-0', SEVERITY_TONE[finding.severity])}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
            {finding.message}
          </p>
          {finding.suggestion && (
            <p className="mt-1 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
              {finding.suggestion}
            </p>
          )}
          {(finding.elementId || canEdit) && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {finding.elementId && (
                <button
                  type="button"
                  onClick={() => onSelect(finding.elementId)}
                  className="cursor-pointer text-[0.625rem] font-medium text-[var(--color-brand-deep)] underline-offset-2 hover:underline"
                >
                  Show me
                </button>
              )}
              {finding.elementId && canEdit && !finding.autoRepaired && (
                <button
                  type="button"
                  onClick={() => onConfirm(finding.elementId)}
                  className="cursor-pointer text-[0.625rem] font-medium text-[var(--color-success)] underline-offset-2 hover:underline"
                >
                  It’s correct
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReviewPanel({
  review,
  canEdit,
  onSelect,
  onConfirm,
  onCalibrate,
  assumedCount,
  onSetStoreyHeight,
}) {
  if (!review) return null
  const { needsAttention, repaired, validation, scale, stats } = review

  const scaleStatus = scale?.status
  const scaleNeedsWork = scaleStatus === 'needs_confirmation' || !scale?.pixels_to_mm

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {/* The scale caveat comes FIRST and unconditionally, because every
          dimension in the model inherits it. */}
      <section
        className={cn(
          'border-b p-3',
          scaleNeedsWork
            ? 'border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)]'
            : 'border-[var(--tone-line)]',
        )}
      >
        <div className="flex items-start gap-2">
          {scaleNeedsWork ? (
            <WarningCircle size={15} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
          ) : (
            <CheckCircle size={15} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--tone-ink)]">
              {scaleNeedsWork ? 'The size is not confirmed' : 'Size confirmed'}
            </p>
            <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
              {scaleNeedsWork
                ? 'Every dimension below is provisional until you say which size is right.'
                : scale?.evidence || 'No evidence was recorded.'}
            </p>
            {scaleNeedsWork && scale?.evidence && (
              <p className="mt-1 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
                {scale.evidence}
              </p>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={onCalibrate}
                className="label-ui mt-2 cursor-pointer rounded-sm border border-[var(--tone-line-strong)] bg-white px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
              >
                {scaleNeedsWork ? 'Confirm the size' : 'Change the size'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* What the engine understood, in numbers. Shown before the findings so a
          misread is visible before the user has inspected any geometry. */}
      {validation && (
        <section className="border-b border-[var(--tone-line)] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="label-ui text-[var(--tone-ink-soft)]">Quality</span>
            <span
              className={cn(
                'ml-auto rounded-xs px-1.5 py-0.5 text-[0.625rem] font-semibold',
                validation.score >= 80
                  ? 'bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[var(--color-success)]'
                  : validation.score >= 55
                    ? 'bg-[color-mix(in_oklab,var(--color-warning)_15%,transparent)] text-[var(--color-warning)]'
                    : 'bg-[color-mix(in_oklab,var(--color-danger)_15%,transparent)] text-[var(--color-danger)]',
              )}
            >
              {validation.grade} · {validation.score}/100
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem]">
            {[
              ['Walls', stats.walls],
              ['Rooms', stats.rooms],
              ['Doors', stats.doors],
              ['Windows', stats.windows],
              ['Furniture', (stats.furniture ?? 0) + (stats.fixtures ?? 0)],
              ['Footprint', stats.footprint_m2 ? `${stats.footprint_m2} m²` : '—'],
              [
                'Overall size',
                stats.width_m ? `${stats.width_m} × ${stats.depth_m} m` : '—',
              ],
              [
                'Rooms cover',
                stats.room_coverage != null
                  ? `${Math.round(stats.room_coverage * 100)}% of the floor`
                  : '—',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-[var(--tone-ink-soft)]">{label}</dt>
                <dd className="font-medium text-[var(--tone-ink)]">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <Section
        title="Needs your attention"
        count={needsAttention.length}
        icon={WarningCircle}
        tone="text-[var(--color-warning)]"
      >
        {needsAttention.map((finding) => (
          <Finding
            key={finding.id}
            finding={finding}
            canEdit={canEdit}
            onSelect={onSelect}
            onConfirm={onConfirm}
          />
        ))}
      </Section>

      <Section
        title="Assumed, not measured"
        count={assumedCount}
        icon={Info}
        tone="text-[var(--tone-ink-soft)]"
        defaultOpen={false}
      >
        <div className="px-3 py-2">
          <p className="text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
            {assumedCount} value
            {assumedCount === 1 ? '' : 's'} in this model came from a
            building-type default rather than from the drawing — heights are
            almost never printed on a plan.
          </p>
          <p className="mt-1 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
            A wall height nobody chose still ends up in a quantity take-off, so
            it is worth setting once.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={onSetStoreyHeight}
              className="label-ui mt-2 cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
            >
              Set the storey height
            </button>
          )}
        </div>
      </Section>

      <Section
        title="Fixed automatically"
        count={repaired.length}
        icon={Wrench}
        tone="text-[var(--tone-ink-soft)]"
        defaultOpen={false}
      >
        <p className="px-3 pb-1 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
          These were changed before you saw the model. Nothing needs doing — they
          are listed so your model and your drawing can be reconciled.
        </p>
        {repaired.map((finding) => (
          <Finding
            key={finding.id}
            finding={finding}
            canEdit={false}
            onSelect={onSelect}
            onConfirm={onConfirm}
          />
        ))}
      </Section>

      {!needsAttention.length && !repaired.length && !assumedCount && (
        <p className="p-3 text-[0.6875rem] text-[var(--tone-ink-soft)]">
          Nothing was flagged on this plan.
        </p>
      )}
    </div>
  )
}
