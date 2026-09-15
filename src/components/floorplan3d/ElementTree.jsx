import { useMemo, useState } from 'react'
import {
  CaretDown,
  CaretRight,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  WarningCircle,
} from '@phosphor-icons/react'

import {
  CATEGORIES,
  ELEMENT_KINDS,
  elementLabel,
  flaggedElementIds,
  isConfirmed,
  levels as documentLevels,
  polygonArea,
  polylineLength,
} from '@/lib/floorplan3d/semanticModel'
import { formatArea, formatMetres } from '@/lib/floorplan3d/adapters'
import { cn } from '@/lib/cn'

/**
 * The left panel: every element in the building, grouped by level and category.
 *
 * WHY A TREE AND NOT A FLAT LIST. A commercial floor is several hundred
 * elements. A flat list of those is unusable, and grouping them by the two
 * things a user actually navigates by — which floor, and what kind of thing —
 * makes "find that door" a two-click operation.
 *
 * SELECTION IS SHARED WITH THE 3D VIEW. Clicking a row selects the element in
 * the scene and vice versa; the page owns `selectedId` and both read it. That is
 * the whole point of a semantic model — the tree and the geometry are two views
 * of the same list.
 *
 * FLAGGED ELEMENTS ARE MARKED HERE TOO, not only in the review list. A user
 * working through the tree should be able to see which walls the engine was
 * unsure about without switching panels.
 */

const KIND_SUMMARY = {
  wall: (element) => `${formatMetres(polylineLength(element.polyline ?? []))} · ${Math.round(element.thickness ?? 0)} mm`,
  room: (element) => formatArea(polygonArea(element.polygon ?? [])),
  door: (element) => `${Math.round(element.width ?? 0)} × ${Math.round(element.height ?? 0)} mm`,
  window: (element) =>
    `${Math.round(element.width ?? 0)} × ${Math.round(element.height ?? 0)} mm`,
  opening: (element) => `${Math.round(element.width ?? 0)} mm wide`,
  stair: (element) => `${element.step_count ?? 0} steps`,
  column: (element) =>
    `${Math.round(element.size?.[0] ?? 0)} × ${Math.round(element.size?.[1] ?? 0)} mm`,
  beam: () => '',
  ramp: () => '',
  furniture: (element) =>
    `${Math.round(element.size?.[0] ?? 0)} × ${Math.round(element.size?.[1] ?? 0)} mm`,
  fixture: (element) =>
    `${Math.round(element.size?.[0] ?? 0)} × ${Math.round(element.size?.[1] ?? 0)} mm`,
}

function summarise(kind, element) {
  try {
    return KIND_SUMMARY[kind]?.(element) ?? ''
  } catch {
    return ''
  }
}

export default function ElementTree({
  document: semanticDocument,
  selectedId,
  onSelect,
  hiddenElementIds,
  onToggleElement,
  isolatedLevelId,
  onIsolateLevel,
}) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())

  const flagged = useMemo(
    () => flaggedElementIds(semanticDocument),
    [semanticDocument],
  )

  /**
   * The tree, rebuilt only when the document or the query changes.
   *
   * One walk of the document rather than a filter per group: a commercial floor
   * with three hundred elements and eleven buckets per level is a lot of
   * repeated iteration to do on every keystroke.
   */
  const tree = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return documentLevels(semanticDocument).map((level) => {
      const groups = []
      for (const category of CATEGORIES) {
        if (!category.buckets.length) continue
        const rows = []
        for (const bucket of category.buckets) {
          for (const element of level[bucket] ?? []) {
            const kind = ELEMENT_KINDS[bucket]
            const label = elementLabel({ element, kind })
            if (needle && !`${label} ${element.id}`.toLowerCase().includes(needle)) {
              continue
            }
            rows.push({
              id: element.id,
              kind,
              label,
              summary: summarise(kind, element),
              flagged: flagged.has(element.id),
              confirmed: isConfirmed(element),
            })
          }
        }
        if (rows.length) {
          groups.push({ id: `${level.id}:${category.id}`, label: category.label, rows })
        }
      }
      return { level, groups, count: groups.reduce((sum, group) => sum + group.rows.length, 0) }
    })
  }, [semanticDocument, query, flagged])

  const toggleGroup = (id) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const totals = useMemo(
    () => tree.reduce((sum, entry) => sum + entry.count, 0),
    [tree],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--tone-line)] p-2.5">
        <label className="relative block">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tone-ink-soft)]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${totals} element${totals === 1 ? '' : 's'}`}
            className="w-full rounded-sm border border-[var(--tone-line)] bg-white py-1.5 pl-8 pr-2 text-xs text-[var(--tone-ink)] outline-none transition-colors placeholder:text-[var(--tone-ink-soft)] focus:border-[var(--color-brand-deep)]"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tree.map(({ level, groups, count }) => (
          <section key={level.id}>
            <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--tone-line)] bg-[var(--color-light)] px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => onIsolateLevel(isolatedLevelId === level.id ? null : level.id)}
                title={
                  isolatedLevelId === level.id
                    ? 'Show every floor again'
                    : 'Show only this floor'
                }
                className={cn(
                  'label-ui cursor-pointer truncate text-left transition-colors',
                  isolatedLevelId === level.id
                    ? 'text-[var(--color-brand-deep)]'
                    : 'text-[var(--tone-ink)] hover:text-[var(--color-brand-deep)]',
                )}
              >
                {level.name || 'Level'}
              </button>
              <span className="ml-auto shrink-0 text-[0.625rem] text-[var(--tone-ink-soft)]">
                {count}
              </span>
            </header>

            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.id)
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full cursor-pointer items-center gap-1 px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--color-light)]"
                  >
                    {isCollapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
                    <span className="text-[0.6875rem] font-medium text-[var(--tone-ink)]">
                      {group.label}
                    </span>
                    <span className="ml-auto text-[0.625rem] text-[var(--tone-ink-soft)]">
                      {group.rows.length}
                    </span>
                  </button>

                  {!isCollapsed &&
                    group.rows.map((row) => {
                      const hidden = hiddenElementIds.has(row.id)
                      const selected = row.id === selectedId
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            'group flex items-center gap-1.5 border-l-2 pl-4 pr-1.5 transition-colors',
                            selected
                              ? 'border-[var(--color-brand-deep)] bg-[color-mix(in_oklab,var(--color-brand)_10%,transparent)]'
                              : 'border-transparent hover:bg-[var(--color-light)]',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(row.id)}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-1.5 text-left"
                          >
                            {row.flagged && !row.confirmed && (
                              <WarningCircle
                                size={12}
                                className="shrink-0 text-[var(--color-danger)]"
                                aria-label="Needs review"
                              />
                            )}
                            <span
                              className={cn(
                                'truncate text-xs',
                                hidden
                                  ? 'text-[var(--tone-ink-soft)] line-through'
                                  : 'text-[var(--tone-ink)]',
                              )}
                            >
                              {row.label}
                            </span>
                            {row.summary && (
                              <span className="ml-auto shrink-0 text-[0.625rem] text-[var(--tone-ink-soft)]">
                                {row.summary}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleElement(row.id)}
                            title={hidden ? 'Show' : 'Hide'}
                            aria-label={hidden ? 'Show this element' : 'Hide this element'}
                            className={cn(
                              'shrink-0 cursor-pointer rounded-xs p-1 transition-opacity',
                              hidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                            )}
                          >
                            {hidden ? (
                              <EyeSlash size={12} className="text-[var(--tone-ink-soft)]" />
                            ) : (
                              <Eye size={12} className="text-[var(--tone-ink-soft)]" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </section>
        ))}

        {totals === 0 && (
          <p className="p-4 text-xs text-[var(--tone-ink-soft)]">
            {query
              ? 'Nothing matches that search.'
              : 'This plan has no elements yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
