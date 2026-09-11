import { useMemo, useState } from 'react'
import { CaretRight, Eye, EyeSlash, Stack } from '@phosphor-icons/react'

import { LAYERS } from '@/lib/experiments/floorplan3d/model'
import { listElements } from '@/lib/experiments/floorplan3d/buildScene'
import { sourceFileUrl } from '@/lib/api/floorplan3d'
import { cn } from '@/lib/cn'

/**
 * The left rail: the drawing this came from, the storeys, the layers, and the
 * element tree.
 *
 * THE DRAWING STAYS ON SCREEN. The only way to tell a good conversion from a
 * confident wrong one is to look at both, so the source sits at the top of the
 * rail rather than behind a tab. Clicking it opens the Compare view, which is
 * the same picture at a size worth reading.
 *
 * THE TREE IS GROUPED BY LEVEL THEN BY LAYER, which is how a person looks for
 * something ("the doors on the ground floor"), rather than flat by id, which
 * is how the document stores it.
 */

function SectionHeading({ children }) {
  return (
    <h3
      className="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.09em] text-[var(--tone-muted-dark)]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </h3>
  )
}

function Toggle({ checked, onChange, label, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-[var(--color-light)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 accent-[var(--color-brand-deep)]"
      />
      <span className="min-w-0 flex-1 truncate text-[0.75rem] text-[var(--tone-ink)]">
        {label}
      </span>
      {count != null && (
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-[var(--tone-muted-dark)]">
          {count}
        </span>
      )}
    </label>
  )
}

export default function Fp3dLeftPanel({
  source,
  model,
  selectedId,
  onSelect,
  visibleLevelIds,
  onToggleLevel,
  visibleLayers,
  onToggleLayer,
  hiddenIds,
  onToggleHidden,
  isolatedIds,
  onIsolate,
  flaggedIds,
  onOpenSource,
  className,
}) {
  const [openGroups, setOpenGroups] = useState(() => new Set(['walls']))

  const elements = useMemo(() => listElements(model), [model])

  const grouped = useMemo(() => {
    const byLevel = new Map()
    for (const element of elements) {
      if (!byLevel.has(element.levelId)) byLevel.set(element.levelId, new Map())
      const byLayer = byLevel.get(element.levelId)
      if (!byLayer.has(element.layer)) byLayer.set(element.layer, [])
      byLayer.get(element.layer).push(element)
    }
    return byLevel
  }, [elements])

  const layerCounts = useMemo(() => {
    const counts = new Map()
    for (const element of elements) {
      counts.set(element.layer, (counts.get(element.layer) ?? 0) + 1)
    }
    return counts
  }, [elements])

  const levels = model?.levels ?? []

  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col overflow-y-auto border-r',
        'border-[var(--tone-line)] bg-white',
        className,
      )}
      aria-label="Model contents"
    >
      {source && (
        <div className="border-b border-[var(--tone-line)] p-3">
          <SectionHeading>Source drawing</SectionHeading>
          <button
            type="button"
            onClick={onOpenSource}
            className={cn(
              'block w-full overflow-hidden rounded-sm border',
              'border-[var(--tone-line-strong)] bg-[var(--color-light)]',
              'transition-colors hover:border-[var(--color-brand-deep)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-[var(--color-brand-deep)]',
            )}
          >
            {source.isPdf || source.isDxf ? (
              <span className="flex h-24 items-center justify-center text-[0.75rem] text-[var(--tone-muted-dark)]">
                {source.isPdf ? 'PDF' : 'DXF'} · {source.pageCount} page
                {source.pageCount === 1 ? '' : 's'}
              </span>
            ) : (
              <img
                src={sourceFileUrl(source.id)}
                alt={`Uploaded drawing: ${source.name}`}
                className="h-24 w-full object-contain p-1"
              />
            )}
          </button>
          <p className="mt-1.5 truncate text-[0.6875rem] text-[var(--tone-muted-dark)]">
            {source.originalName}
          </p>
          <button
            type="button"
            onClick={onOpenSource}
            className="mt-1 text-[0.6875rem] font-semibold text-[var(--color-brand-deep)] hover:underline"
          >
            Compare with the model →
          </button>
        </div>
      )}

      {levels.length > 0 && (
        <div className="border-b border-[var(--tone-line)] p-3">
          <SectionHeading>Levels</SectionHeading>
          <div className="space-y-0.5">
            {levels.map((level) => (
              <div key={level.id} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <Toggle
                    checked={visibleLevelIds.has(level.id)}
                    onChange={() => onToggleLevel(level.id)}
                    label={`${level.name} · ${level.elevation.toFixed(2)} m`}
                  />
                </div>
                <button
                  type="button"
                  title={`Show only ${level.name}`}
                  aria-label={`Show only ${level.name}`}
                  onClick={() => onToggleLevel(level.id, { only: true })}
                  className="shrink-0 rounded-xs p-1 text-[var(--tone-muted-dark)] hover:bg-[var(--color-light)] hover:text-[var(--color-brand-deep)]"
                >
                  <Stack size={13} weight="bold" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-[var(--tone-line)] p-3">
        <SectionHeading>Layers</SectionHeading>
        <div className="space-y-0.5">
          {LAYERS.map((layer) => (
            <Toggle
              key={layer.id}
              checked={visibleLayers.has(layer.id)}
              onChange={() => onToggleLayer(layer.id)}
              label={layer.label}
              count={layerCounts.get(layer.id) ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        <div className="mb-2 flex items-center justify-between">
          <SectionHeading>Elements</SectionHeading>
          {isolatedIds && (
            <button
              type="button"
              onClick={() => onIsolate(null)}
              className="text-[0.625rem] font-semibold text-[var(--color-brand-deep)] hover:underline"
            >
              Clear isolation
            </button>
          )}
        </div>

        {[...grouped.entries()].map(([levelId, byLayer]) => {
          const level = levels.find((entry) => entry.id === levelId)
          return (
            <div key={levelId} className="mb-3">
              <p className="mb-1 text-[0.6875rem] font-semibold text-[var(--tone-ink)]">
                {level?.name ?? levelId}
              </p>
              {LAYERS.filter((layer) => byLayer.has(layer.id)).map((layer) => {
                const key = `${levelId}:${layer.id}`
                const isOpen = openGroups.has(key)
                const rows = byLayer.get(layer.id) ?? []
                return (
                  <div key={key} className="mb-0.5">
                    <button
                      type="button"
                      onClick={() => setOpenGroups((current) => {
                        const next = new Set(current)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        return next
                      })}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-1 rounded-sm px-1 py-1 text-left hover:bg-[var(--color-light)]"
                    >
                      <CaretRight
                        size={10}
                        weight="bold"
                        aria-hidden="true"
                        className={cn('shrink-0 transition-transform', isOpen && 'rotate-90')}
                      />
                      <span className="min-w-0 flex-1 truncate text-[0.75rem] text-[var(--tone-ink)]">
                        {layer.label}
                      </span>
                      <span className="shrink-0 text-[0.6875rem] tabular-nums text-[var(--tone-muted-dark)]">
                        {rows.length}
                      </span>
                    </button>

                    {isOpen && (
                      <ul className="ml-3 border-l border-[var(--tone-line)] pl-1.5">
                        {rows.map((element) => (
                          <li key={element.id} className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onSelect(element.id)}
                              className={cn(
                                'min-w-0 flex-1 truncate rounded-xs px-1.5 py-1 text-left',
                                'text-[0.6875rem] transition-colors',
                                selectedId === element.id
                                  ? 'bg-[color-mix(in_oklab,var(--color-brand-deep)_10%,transparent)] font-semibold text-[var(--color-brand-deep)]'
                                  : 'text-[var(--tone-ink)] hover:bg-[var(--color-light)]',
                                flaggedIds?.has(element.id) && 'text-[var(--color-warning)]',
                              )}
                              title={`${element.name} (${element.id})`}
                            >
                              {element.name}
                              {flaggedIds?.has(element.id) && ' ⚠'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleHidden(element.id)}
                              aria-label={
                                hiddenIds.has(element.id)
                                  ? `Show ${element.name}`
                                  : `Hide ${element.name}`
                              }
                              className="shrink-0 rounded-xs p-1 text-[var(--tone-muted-dark)] hover:bg-[var(--color-light)]"
                            >
                              {hiddenIds.has(element.id) ? (
                                <EyeSlash size={11} weight="bold" aria-hidden="true" />
                              ) : (
                                <Eye size={11} weight="regular" aria-hidden="true" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {elements.length === 0 && (
          <p className="text-[0.75rem] text-[var(--tone-muted-dark)]">
            No elements yet.
          </p>
        )}
      </div>
    </aside>
  )
}
