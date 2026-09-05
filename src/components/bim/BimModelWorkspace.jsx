import { useCallback, useMemo, useState } from 'react'
import {
  ArrowsIn,
  ArrowsOut,
  CheckSquare,
  Cube,
  Eye,
  EyeSlash,
  FrameCorners,
  MagnifyingGlass,
  Square,
} from '@phosphor-icons/react'

import BimModelViewer from '@/components/bim/BimModelViewer'
import { listElements } from '@/lib/bim/buildModel'
import { flaggedElementIds } from '@/lib/bim/planGeometry'
import { cn } from '@/lib/cn'

/**
 * The 3D workspace: an element tree, a toolbar, and the model.
 *
 * ALL VIEW STATE LIVES HERE, and the viewer is told about it through props.
 * Selection, what is hidden and what is isolated are things both halves need —
 * the tree renders them, the viewer applies them — so neither half may own
 * them. `BimModelViewer` holds only Three.js's own objects.
 *
 * ISOLATE AND HIDE ARE DIFFERENT OPERATIONS, not two spellings of one:
 *   hide     — take these out of the view, leave everything else alone
 *   isolate  — show ONLY these, whatever was hidden before
 * Both act on the checked rows, falling back to the single selected element
 * when nothing is checked, so neither needs its own selection mode.
 */

const CATEGORY_ORDER = ['wall', 'opening', 'room', 'fixture', 'slab']

const CATEGORY_LABEL = {
  wall: 'Walls',
  opening: 'Doors & Windows',
  room: 'Rooms',
  fixture: 'Fixtures',
  slab: 'Slabs',
}

const VIEW_BUTTONS = [
  { preset: 'fit', label: 'Fit model', icon: FrameCorners },
  { preset: 'iso', label: 'ISO' },
  { preset: 'top', label: 'TOP' },
  { preset: 'front', label: 'FRONT' },
]

export default function BimModelWorkspace({
  plan,
  quality,
  expanded = false,
  onToggleExpanded,
  className,
}) {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [checked, setChecked] = useState(() => new Set())
  const [hidden, setHidden] = useState(() => new Set())
  const [isolated, setIsolated] = useState(null)
  const [view, setView] = useState({ preset: 'iso', nonce: 0 })

  const elements = useMemo(() => listElements(plan), [plan])
  const flagged = useMemo(() => flaggedElementIds(quality), [quality])
  const levels = plan?.levels ?? []

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return elements.filter((element) => {
      if (levelFilter !== 'all' && element.levelId !== levelFilter) return false
      if (!needle) return true
      return (
        element.name.toLowerCase().includes(needle) ||
        element.id.toLowerCase().includes(needle) ||
        element.ifcClass.toLowerCase().includes(needle)
      )
    })
  }, [elements, levelFilter, search])

  const grouped = useMemo(() => {
    const buckets = new Map()
    for (const element of visibleRows) {
      if (!buckets.has(element.kind)) buckets.set(element.kind, [])
      buckets.get(element.kind).push(element)
    }
    return CATEGORY_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({
      kind,
      label: CATEGORY_LABEL[kind] ?? kind,
      rows: buckets.get(kind),
    }))
  }, [visibleRows])

  /** The rows an action applies to: everything checked, else the selected one. */
  const actionTargets = useCallback(() => {
    if (checked.size > 0) return new Set(checked)
    return selectedId ? new Set([selectedId]) : new Set()
  }, [checked, selectedId])

  const toggleChecked = useCallback((id) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allVisibleChecked =
    visibleRows.length > 0 && visibleRows.every((element) => checked.has(element.id))

  const toggleSelectAll = useCallback(() => {
    setChecked((current) => {
      const next = new Set(current)
      const everySelected = visibleRows.every((element) => next.has(element.id))
      for (const element of visibleRows) {
        if (everySelected) next.delete(element.id)
        else next.add(element.id)
      }
      return next
    })
  }, [visibleRows])

  const onIsolate = useCallback(() => {
    const targets = actionTargets()
    if (targets.size === 0) return
    setIsolated(targets)
  }, [actionTargets])

  const onHide = useCallback(() => {
    const targets = actionTargets()
    if (targets.size === 0) return
    setHidden((current) => new Set([...current, ...targets]))
    // A hidden element must not stay isolated — the two would fight, and the
    // viewer resolves that in isolate's favour, so the element would stay on
    // screen after the user asked for it to go.
    setIsolated((current) => {
      if (!current) return current
      const next = new Set([...current].filter((id) => !targets.has(id)))
      return next.size > 0 ? next : null
    })
  }, [actionTargets])

  const onShowAll = useCallback(() => {
    setHidden(new Set())
    setIsolated(null)
  }, [])

  const requestView = useCallback((preset) => {
    setView((current) => ({ preset, nonce: current.nonce + 1 }))
  }, [])

  const hasModel = elements.length > 0
  const somethingConcealed = hidden.size > 0 || Boolean(isolated)

  return (
    <div
      className={cn(
        // Fills whatever the page gives it, and NOTHING more. Expanding used to
        // be `fixed inset-3`, which escaped the dashboard shell and covered the
        // sidebar; the page now simply gives this element more room by hiding
        // its siblings, so "fullscreen" stays inside the content area and the
        // navigation never disappears.
        'flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-[var(--tone-line)] bg-white',
        className,
      )}
    >
      <Toolbar
        onView={requestView}
        onIsolate={onIsolate}
        onHide={onHide}
        onShowAll={onShowAll}
        canAct={actionTargets().size > 0}
        somethingConcealed={somethingConcealed}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
      />

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r border-[var(--tone-line)] sm:flex',
            expanded ? 'w-72' : 'w-60',
          )}
        >
          <div className="border-b border-[var(--tone-line)] p-2">
            <label className="relative block">
              <MagnifyingGlass
                size={13}
                weight="bold"
                aria-hidden="true"
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--tone-muted)]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search elements"
                aria-label="Search elements"
                className="w-full rounded-xs border border-[var(--tone-line-strong)] py-1.5 pl-7 pr-2 text-[0.75rem] text-[var(--tone-ink)] placeholder:text-[var(--tone-muted)] focus:border-[var(--color-brand-deep)] focus:outline-none"
              />
            </label>

            {levels.length > 1 && (
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
                aria-label="Filter by level"
                className="mt-1.5 w-full rounded-xs border border-[var(--tone-line-strong)] px-2 py-1.5 text-[0.75rem] text-[var(--tone-ink)] focus:border-[var(--color-brand-deep)] focus:outline-none"
              >
                <option value="all">Whole project</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={visibleRows.length === 0}
              className="mt-1.5 flex w-full items-center gap-1.5 rounded-xs px-1 py-1 text-[0.6875rem] font-semibold text-[var(--tone-ink)] hover:bg-[var(--color-light)] disabled:opacity-40"
            >
              {allVisibleChecked ? (
                <CheckSquare size={13} weight="fill" className="text-[var(--color-brand-deep)]" />
              ) : (
                <Square size={13} weight="bold" className="text-[var(--tone-muted)]" />
              )}
              Select all ({visibleRows.length})
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {grouped.length === 0 ? (
              <p className="px-2 py-4 text-center text-[0.75rem] text-[var(--tone-muted-dark)]">
                Nothing matches.
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.kind} className="mb-2">
                  <p className="px-2 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-[var(--tone-muted-dark)]">
                    {group.label} <span className="opacity-60">{group.rows.length}</span>
                  </p>
                  <ul>
                    {group.rows.map((element) => (
                      <ElementRow
                        key={element.id}
                        element={element}
                        selected={selectedId === element.id}
                        checked={checked.has(element.id)}
                        concealed={
                          isolated ? !isolated.has(element.id) : hidden.has(element.id)
                        }
                        flagged={flagged.has(element.id)}
                        onSelect={() => setSelectedId(element.id)}
                        onToggle={() => toggleChecked(element.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          {hasModel ? (
            <BimModelViewer
              plan={plan}
              flaggedIds={flagged}
              selectedId={selectedId}
              hiddenIds={hidden}
              isolatedIds={isolated}
              view={view}
              onSelect={setSelectedId}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Cube size={32} weight="light" aria-hidden="true" className="text-[var(--tone-muted)]" />
              <p className="text-[0.8125rem] text-[var(--tone-muted-dark)]">
                This plan has nothing to build.
              </p>
            </div>
          )}

          {somethingConcealed && (
            <p className="pointer-events-none absolute bottom-2 left-2 rounded-xs border border-[var(--tone-line-strong)] bg-white/90 px-2 py-1 text-[0.625rem] font-semibold text-[var(--tone-ink)] backdrop-blur-[2px]">
              {isolated
                ? `Isolated ${isolated.size} element${isolated.size === 1 ? '' : 's'}`
                : `${hidden.size} hidden`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Toolbar({
  onView,
  onIsolate,
  onHide,
  onShowAll,
  canAct,
  somethingConcealed,
  expanded,
  onToggleExpanded,
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--tone-line)] px-2 py-1.5">
      {VIEW_BUTTONS.map((button) => (
        <ToolButton
          key={button.preset}
          icon={button.icon}
          onClick={() => onView(button.preset)}
        >
          {button.label}
        </ToolButton>
      ))}

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--tone-line)]" />

      <ToolButton icon={Eye} onClick={onIsolate} disabled={!canAct}>
        Isolate
      </ToolButton>
      <ToolButton icon={EyeSlash} onClick={onHide} disabled={!canAct}>
        Hide
      </ToolButton>
      <ToolButton onClick={onShowAll} disabled={!somethingConcealed}>
        Show all
      </ToolButton>

      {onToggleExpanded && (
        <ToolButton
          icon={expanded ? ArrowsIn : ArrowsOut}
          onClick={onToggleExpanded}
          className="ml-auto"
        >
          {expanded ? 'Exit' : 'Expand'}
        </ToolButton>
      )}
    </div>
  )
}

function ToolButton({ icon: Icon, children, className, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs px-2 py-1 text-[0.6875rem] font-semibold text-[var(--tone-ink)]',
        'transition-colors hover:bg-[var(--color-light)] hover:text-[var(--color-brand-deep)]',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-deep)]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={13} weight="bold" aria-hidden="true" />}
      {children}
    </button>
  )
}

function ElementRow({ element, selected, checked, concealed, flagged, onSelect, onToggle }) {
  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-xs px-1.5 py-1',
          selected ? 'bg-blue-50' : 'hover:bg-[var(--color-light)]',
          concealed && 'opacity-45',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${checked ? 'Deselect' : 'Select'} ${element.name}`}
          aria-pressed={checked}
          className="shrink-0"
        >
          {checked ? (
            <CheckSquare size={13} weight="fill" className="text-[var(--color-brand-deep)]" />
          ) : (
            <Square size={13} weight="bold" className="text-[var(--tone-muted)]" />
          )}
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
          aria-current={selected ? 'true' : undefined}
        >
          <span
            className={cn(
              'block truncate text-[0.6875rem] font-medium',
              flagged ? 'text-rose-700' : 'text-[var(--tone-ink)]',
            )}
          >
            {element.name}
          </span>
          <span className="block truncate font-mono text-[0.5625rem] uppercase tracking-[0.04em] text-[var(--tone-muted-dark)]">
            {element.ifcClass}
          </span>
        </button>
      </div>
    </li>
  )
}
