import { useCallback, useEffect, useState } from 'react'
import {
  ArrowCounterClockwise,
  ArrowsLeftRight,
  ClockCounterClockwise,
  GitBranch,
  X,
} from '@phosphor-icons/react'

import { getRevisionDiff, listRevisions } from '@/lib/api/floorplan3d'
import { cn } from '@/lib/cn'

/**
 * Every saved version, and the way back to any of them.
 *
 * RESTORING BRANCHES. IT NEVER DELETES.
 * Going back to revision 3 after ten prompts writes revision 14 with revision
 * 3's content and revision 3 as its parent. Four to thirteen stay exactly where
 * they are, still listed, still restorable. That is the whole reason
 * `FloorPlanRevision.parent` exists, and it is the behaviour this drawer has to
 * make obvious — a user who believes "restore" destroys their afternoon will
 * never press it, which costs them the feature.
 *
 * TWO LAYERS, AND THEY ARE NOT THE SAME THING.
 * Undo (Ctrl/Cmd+Z) walks back through UNSAVED edits in this tab: instant,
 * twenty deep, gone when the tab closes. A version is on the server, numbered
 * and permanent. The header says which state you are in; this drawer is only
 * ever about the second.
 *
 * A DRAWER, NOT A PAGE. The model stays on screen behind it, because
 * "which version was that?" is a question you answer by looking at the building.
 */

function formatWhen(value) {
  if (!value) return ''
  const when = new Date(value)
  const minutes = Math.round((Date.now() - when.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`
  return when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function DiffSummary({ diff }) {
  if (!diff) return null
  const { counts } = diff
  const parts = []
  if (counts.changed) parts.push(`${counts.changed} changed`)
  if (counts.added) parts.push(`${counts.added} added`)
  if (counts.removed) parts.push(`${counts.removed} removed`)

  return (
    <div className="mt-1.5 rounded-sm border border-[var(--tone-line)] bg-[var(--color-light)] p-2">
      <p className="text-[0.625rem] font-medium text-[var(--tone-ink)]">
        Revision {diff.from.number} &rarr; {diff.to.number}
        {parts.length ? ` · ${parts.join(', ')}` : ' · nothing differs'}
      </p>
      {diff.changed.slice(0, 8).map((entry) => (
        <p key={entry.id} className="mt-0.5 text-[0.625rem] text-[var(--tone-ink-soft)]">
          {entry.label} — {entry.fields.slice(0, 4).join(', ')}
        </p>
      ))}
      {diff.changed.length > 8 && (
        <p className="mt-0.5 text-[0.625rem] text-[var(--tone-ink-soft)]">
          and {diff.changed.length - 8} more
        </p>
      )}
      {diff.score_delta !== 0 && (
        <p
          className={cn(
            'mt-1 text-[0.625rem] font-medium',
            diff.score_delta > 0
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-warning)]',
          )}
        >
          Quality score {diff.score_delta > 0 ? '+' : ''}
          {diff.score_delta}
        </p>
      )}
    </div>
  )
}

function Row({ revision, isCurrent, isRestored, busy, onRestore, onCompare, diff, comparing }) {
  return (
    <li className="relative grid grid-cols-[18px_1fr] gap-2">
      {/* The rail. A dot per version, filled for the one on screen. */}
      <div className="relative">
        <span className="absolute left-[8px] top-0 h-full w-px bg-[var(--tone-line)]" aria-hidden="true" />
        <span
          className={cn(
            'absolute left-[4px] top-3.5 h-2.5 w-2.5 rounded-full border-[1.5px] bg-white',
            isCurrent
              ? 'border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-deep)]/20'
              : 'border-[var(--tone-line-strong)]',
          )}
        />
      </div>

      <div className="border-b border-[var(--tone-line)] py-2.5 last:border-b-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-[var(--tone-ink)]">
            r{revision.number}
          </span>
          {isCurrent && (
            <span className="rounded-sm border border-[var(--color-brand-deep)] px-1.5 py-0.5 text-[0.5625rem] font-medium uppercase tracking-wide text-[var(--color-brand-deep)]">
              On screen
            </span>
          )}
          {isRestored && (
            <GitBranch size={11} className="text-[var(--color-brand-deep)]" aria-label="Branched" />
          )}
          <span className="text-[0.625rem] text-[var(--tone-ink-soft)]">
            {formatWhen(revision.created_at)}
          </span>

          <span className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => onCompare(revision)}
              className="cursor-pointer rounded-sm border border-[var(--tone-line)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--tone-ink-soft)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
            >
              <ArrowsLeftRight size={10} className="inline" /> {comparing ? 'Hide' : 'Compare'}
            </button>
            {!isCurrent && (
              <button
                type="button"
                onClick={() => onRestore(revision)}
                disabled={busy}
                className="cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowCounterClockwise size={10} className="inline" /> Restore
              </button>
            )}
          </span>
        </div>

        <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
          {revision.change_summary || 'Created by the recognition pipeline.'}
        </p>

        <p className="mt-0.5 text-[0.625rem] tabular-nums text-[var(--tone-ink-soft)]">
          {revision.grade ? `${revision.grade} · ${revision.score}/100` : 'Not graded'}
        </p>

        {comparing && <DiffSummary diff={diff} />}
      </div>
    </li>
  )
}

export default function VersionsDrawer({
  open,
  conversionId,
  currentRevisionId,
  reloadToken,
  onClose,
  onRestored,
}) {
  const [revisions, setRevisions] = useState([])
  const [error, setError] = useState('')
  const [restoringId, setRestoringId] = useState(null)
  const [comparingId, setComparingId] = useState(null)
  const [diff, setDiff] = useState(null)

  /**
   * Load the history.
   *
   * Every `setState` happens in a promise CALLBACK, never in the body — the
   * same shape the editor page's own loader uses, and what
   * `react-hooks/set-state-in-effect` asks for. There is no separate loading
   * flag for the same reason: an empty list with no error IS the loading state,
   * and a refresh keeps the rows on screen until the new ones arrive rather
   * than blanking a list the user is reading.
   */
  const load = useCallback(() => {
    if (!conversionId) return undefined
    return listRevisions(conversionId)
      .then((rows) => {
        setRevisions(rows ?? [])
        setError('')
      })
      .catch((caught) => setError(caught?.message || 'The history could not be loaded.'))
  }, [conversionId])

  // Reloaded whenever the drawer opens AND whenever the caller bumps the token,
  // which is how a save made while the drawer is open shows up in it.
  useEffect(() => {
    if (open) load()
  }, [open, load, reloadToken])

  const handleCompare = useCallback(
    (revision) => {
      if (comparingId === revision.id) {
        setComparingId(null)
        setDiff(null)
        return
      }
      setComparingId(revision.id)
      setDiff(null)
      // Against its own parent by default — "what did this version change?" is
      // the question a row in a history answers.
      getRevisionDiff(conversionId, revision.id, {
        against: revision.parent ? undefined : currentRevisionId,
      })
        .then(setDiff)
        .catch((caught) =>
          setDiff({
            from: { number: '—' },
            to: { number: revision.number },
            counts: { added: 0, removed: 0, changed: 0 },
            changed: [],
            score_delta: 0,
            error: caught?.message,
          }),
        )
    },
    [comparingId, conversionId, currentRevisionId],
  )

  const handleRestore = useCallback(
    (revision) => {
      setRestoringId(revision.id)
      onRestored(revision).finally(() => setRestoringId(null))
    },
    [onRestored],
  )

  if (!open) return null

  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex w-[22rem] max-w-[92vw] flex-col border-l border-[var(--tone-line)] bg-white shadow-[-8px_0_24px_-16px_rgba(11,22,36,0.35)]"
      aria-label="Version history"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--tone-line)] px-3 py-2">
        <ClockCounterClockwise size={14} className="text-[var(--tone-ink-soft)]" />
        <span className="text-xs font-medium text-[var(--tone-ink)]">Versions</span>
        <span className="text-[0.625rem] text-[var(--tone-ink-soft)]">
          {revisions.length ? `${revisions.length} saved` : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the version history"
          className="ml-auto cursor-pointer rounded-sm p-1 text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
        >
          <X size={13} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {/* Said once, at the top, because it is the fact that makes the Restore
            buttons below safe to press. */}
        <p className="border-b border-[var(--tone-line)] py-2 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
          Restoring an older version adds it to the top of this list. Nothing in
          between is deleted.
        </p>

        {error && (
          <p className="py-3 text-[0.6875rem] text-[var(--color-danger)]">{error}</p>
        )}
        {!error && !revisions.length && (
          <p className="py-3 text-[0.6875rem] text-[var(--tone-ink-soft)]">Loading…</p>
        )}

        <ul className="pb-4">
          {revisions.map((revision) => (
            <Row
              key={revision.id}
              revision={revision}
              isCurrent={revision.id === currentRevisionId}
              isRestored={(revision.change_summary || '').startsWith('Restored revision')}
              busy={Boolean(restoringId)}
              diff={diff}
              comparing={comparingId === revision.id}
              onCompare={handleCompare}
              onRestore={handleRestore}
            />
          ))}
        </ul>
      </div>
    </aside>
  )
}
