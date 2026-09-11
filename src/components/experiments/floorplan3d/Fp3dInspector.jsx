import { useMemo, useState } from 'react'
import { Info, Trash, WarningCircle } from '@phosphor-icons/react'

import {
  describeProvenance,
  effectiveWallHeight,
  findElement,
  formatArea,
  formatMeters,
  levelById,
  materials as modelMaterials,
  polygonArea,
  wallLength,
} from '@/lib/experiments/floorplan3d/model'
import { cn } from '@/lib/cn'

/**
 * The right panel: what is selected, and every number that can be changed
 * about it.
 *
 * NUMBERS ARE COMMITTED, NOT TYPED. A field writes on blur or Enter, never on
 * every keystroke — an editor that sent a command per character would produce
 * a revision per character, and a wall would briefly be 2 mm thick on the way
 * to 250. `draft` holds what the user is typing; `commit` is what turns it
 * into a command.
 *
 * PROVENANCE IS SHOWN BESIDE THE VALUE, NOT IN A TAB. "Assumed" next to a wall
 * height is the difference between a number a user trusts and one they check,
 * and it is the whole reason this feature records provenance at all. The
 * moment it moves somewhere the user has to go looking for it, it stops
 * working.
 */

const PROVENANCE_TONE = {
  measured: 'text-[var(--color-success)] border-[color-mix(in_oklab,var(--color-success)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_8%,transparent)]',
  detected: 'text-[var(--color-brand-deep)] border-[color-mix(in_oklab,var(--color-brand-deep)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-brand-deep)_7%,transparent)]',
  assumed: 'text-[var(--color-warning)] border-[color-mix(in_oklab,var(--color-warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_9%,transparent)]',
  user: 'text-[var(--tone-ink)] border-[var(--tone-line-strong)] bg-[var(--color-light)]',
}

function ProvenanceChip({ provenance }) {
  if (!provenance) return null
  const described = describeProvenance(provenance)
  const percent =
    described.confidence == null ? null : Math.round(described.confidence * 100)

  return (
    <span
      title={`${described.detail}${percent != null ? ` Confidence ${percent}%.` : ''}${
        described.note ? ` ${described.note}` : ''
      }`}
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5',
        'text-[0.625rem] font-semibold',
        PROVENANCE_TONE[described.tone],
      )}
    >
      {described.label}
      {percent != null && described.tone !== 'user' && ` ${percent}%`}
    </span>
  )
}

function Row({ label, children, hint }) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[0.6875rem] font-semibold text-[var(--tone-muted-dark)]">
          {label}
        </span>
        {hint}
      </div>
      {children}
    </div>
  )
}

function NumberField({ value, onCommit, step = 0.01, min, max, suffix, disabled }) {
  const [draft, setDraft] = useState(String(value ?? ''))
  // The model is the source of truth: when it changes underneath — an undo, a
  // natural-language edit, a restored revision — the field has to follow it.
  //
  // Adjusted DURING RENDER against the previous prop, the `prevUser` pattern
  // `ProfileContext` already uses in this codebase, rather than in an effect.
  // An effect would render one frame showing the stale draft and then render
  // again, which in a numeric field is a visible flicker of the old number.
  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    setDraft(String(value ?? ''))
  }

  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(String(value ?? ''))
      return
    }
    if (Math.abs(parsed - (value ?? 0)) < 1e-9) return
    onCommit(parsed)
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            setDraft(String(value ?? ''))
            event.currentTarget.blur()
          }
        }}
        className={cn(
          'w-full rounded-sm border border-[var(--tone-line-strong)] bg-white',
          'px-2 py-1.5 text-[0.8125rem] tabular-nums text-[var(--tone-ink)]',
          'focus:border-[var(--color-brand-deep)] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
      {suffix && (
        <span className="shrink-0 text-[0.6875rem] text-[var(--tone-muted-dark)]">
          {suffix}
        </span>
      )}
    </div>
  )
}

function TextField({ value, onCommit, disabled, placeholder }) {
  const [draft, setDraft] = useState(value ?? '')
  // Same reasoning as `NumberField` above: adjusted during render, not in an
  // effect.
  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    setDraft(value ?? '')
  }

  return (
    <input
      type="text"
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(value ?? '')
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'w-full rounded-sm border border-[var(--tone-line-strong)] bg-white',
        'px-2 py-1.5 text-[0.8125rem] text-[var(--tone-ink)]',
        'focus:border-[var(--color-brand-deep)] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    />
  )
}

function SelectField({ value, options, onCommit, disabled }) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onCommit(event.target.value || null)}
      className={cn(
        'w-full rounded-sm border border-[var(--tone-line-strong)] bg-white',
        'px-2 py-1.5 text-[0.8125rem] text-[var(--tone-ink)]',
        'focus:border-[var(--color-brand-deep)] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      {options.map((option) => (
        <option key={option.value ?? 'none'} value={option.value ?? ''}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default function Fp3dInspector({
  model,
  selectedId,
  warnings = [],
  busy,
  onEdit,
  onDelete,
  className,
}) {
  const found = useMemo(
    () => (selectedId ? findElement(model, selectedId) : null),
    [model, selectedId],
  )

  const materialOptions = useMemo(
    () => [
      { value: null, label: 'Not assigned' },
      ...modelMaterials(model).map((material) => ({
        value: material.id,
        label: material.name,
      })),
    ],
    [model],
  )

  const elementWarnings = useMemo(
    () => warnings.filter((warning) => warning.elementId === selectedId),
    [warnings, selectedId],
  )

  if (!found) {
    return (
      <aside
        className={cn(
          'flex min-h-0 flex-col overflow-y-auto border-l',
          'border-[var(--tone-line)] bg-white p-4',
          className,
        )}
        aria-label="Inspector"
      >
        <p className="text-[0.8125rem] text-[var(--tone-muted-dark)]">
          Select a wall, room, door, window or furniture item — in the 3D view,
          the plan, or the element list — to edit it here.
        </p>
      </aside>
    )
  }

  const { element, kind } = found

  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col overflow-y-auto border-l',
        'border-[var(--tone-line)] bg-white',
        className,
      )}
      aria-label="Inspector"
    >
      <div className="border-b border-[var(--tone-line)] px-4 py-3">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.09em] text-[var(--color-brand-deep)]">
          {kind}
        </p>
        <p className="mt-0.5 truncate text-[0.9375rem] font-semibold text-[var(--tone-ink)]">
          {element.name || element.id}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.6875rem] text-[var(--tone-muted-dark)]">
            {element.id}
          </span>
          <ProvenanceChip provenance={element.provenance} />
        </div>
      </div>

      {elementWarnings.length > 0 && (
        <div className="border-b border-[var(--tone-line)] bg-amber-50/60 px-4 py-2.5">
          {elementWarnings.map((warning, index) => (
            <p
              key={`${warning.code}-${index}`}
              className="mb-1.5 flex gap-1.5 text-[0.75rem] leading-snug text-amber-900 last:mb-0"
            >
              <WarningCircle
                size={13}
                weight="fill"
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <span>
                {warning.message}
                {warning.repair && (
                  <span className="mt-0.5 block text-[0.6875rem] opacity-80">
                    Fixed automatically: {warning.repair}
                  </span>
                )}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="flex-1 px-4 py-3">
        {kind === 'wall' && (
          <WallFields
            model={model}
            wall={element}
            busy={busy}
            onEdit={onEdit}
            materialOptions={materialOptions}
          />
        )}
        {kind === 'room' && (
          <RoomFields
            room={element}
            busy={busy}
            onEdit={onEdit}
            materialOptions={materialOptions}
          />
        )}
        {['door', 'window', 'passage'].includes(kind) && (
          <OpeningFields
            model={model}
            opening={element}
            kind={kind}
            busy={busy}
            onEdit={onEdit}
          />
        )}
        {['furniture', 'fixture'].includes(kind) && (
          <ItemFields
            item={element}
            kind={kind}
            busy={busy}
            onEdit={onEdit}
            materialOptions={materialOptions}
          />
        )}
        {kind === 'level' && (
          <LevelFields level={element} busy={busy} onEdit={onEdit} />
        )}
        {['column', 'beam', 'stair', 'slab', 'material', 'dimension', 'label']
          .includes(kind) && (
          <ReadOnlyFields element={element} kind={kind} />
        )}

        {['wall', 'door', 'window', 'passage', 'furniture'].includes(kind) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(kind, element.id)}
            className={cn(
              'mt-4 inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5',
              'border-[var(--tone-line-strong)] text-[0.75rem] font-semibold',
              'text-[var(--color-danger)] transition-colors',
              'hover:border-[var(--color-danger)] hover:bg-rose-50',
              'disabled:cursor-not-allowed disabled:opacity-45',
            )}
          >
            <Trash size={13} weight="bold" aria-hidden="true" />
            Delete this {kind}
          </button>
        )}
      </div>
    </aside>
  )
}

function WallFields({ model, wall, busy, onEdit, materialOptions }) {
  const level = levelById(model, wall.level_id)
  const inherited = effectiveWallHeight(model, wall)

  return (
    <>
      <Row label="Length" hint={<ProvenanceChip provenance={wall.provenance} />}>
        <NumberField
          value={Number(wallLength(wall).toFixed(3))}
          step={0.01}
          min={0.05}
          suffix="m"
          disabled={busy}
          onCommit={(value) => onEdit({ type: 'wallLength', id: wall.id, value })}
        />
      </Row>

      <Row label="Thickness">
        <NumberField
          value={Number((wall.thickness * 1000).toFixed(0))}
          step={5}
          min={20}
          suffix="mm"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'wallThickness', id: wall.id, value: value / 1000 })}
        />
      </Row>

      <Row
        label="Height"
        hint={
          wall.height == null ? (
            <span className="text-[0.625rem] text-[var(--tone-muted-dark)]">
              from {level?.name ?? 'the level'}
            </span>
          ) : null
        }
      >
        <NumberField
          value={Number(inherited.toFixed(3))}
          step={0.05}
          min={0.3}
          suffix="m"
          disabled={busy}
          onCommit={(value) => onEdit({ type: 'wallHeight', id: wall.id, value })}
        />
        {wall.height != null && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit({ type: 'wallHeight', id: wall.id, value: null })}
            className="mt-1 text-[0.6875rem] font-semibold text-[var(--color-brand-deep)] hover:underline"
          >
            Use the level height instead
          </button>
        )}
      </Row>

      <Row label="Type">
        <SelectField
          value={wall.type}
          disabled={busy}
          options={[
            { value: 'exterior', label: 'Exterior' },
            { value: 'interior', label: 'Interior' },
            { value: 'partition', label: 'Partition' },
            { value: 'retaining', label: 'Retaining' },
            { value: 'curtain', label: 'Curtain wall' },
          ]}
          onCommit={(value) => onEdit({ type: 'wallType', id: wall.id, value })}
        />
      </Row>

      <Row label="Material">
        <SelectField
          value={wall.material_id}
          options={materialOptions}
          disabled={busy}
          onCommit={(value) =>
            value && onEdit({ type: 'material', id: wall.id, value, slot: 'default' })}
        />
      </Row>

      <dl className="mt-3 space-y-1 border-t border-[var(--tone-line)] pt-2.5">
        <Readout label="Start" value={`${wall.start[0].toFixed(2)}, ${wall.start[1].toFixed(2)}`} />
        <Readout label="End" value={`${wall.end[0].toFixed(2)}, ${wall.end[1].toFixed(2)}`} />
        <Readout label="Level" value={level?.name ?? wall.level_id} />
        <Readout label="Load bearing" value={wall.load_bearing ? 'Yes' : 'No'} />
      </dl>
      <p className="mt-2 flex gap-1.5 text-[0.6875rem] leading-snug text-[var(--tone-muted-dark)]">
        <Info size={12} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
        Move a wall by dragging its corner in the 2D plan. Walls sharing that
        corner move with it.
      </p>
    </>
  )
}

function RoomFields({ room, busy, onEdit, materialOptions }) {
  return (
    <>
      <Row label="Name" hint={<ProvenanceChip provenance={room.provenance} />}>
        <TextField
          value={room.name}
          disabled={busy}
          onCommit={(value) => onEdit({ type: 'roomName', id: room.id, value })}
        />
      </Row>
      <Row label="Type">
        <TextField
          value={room.type}
          disabled={busy}
          placeholder="bedroom, office, circulation…"
          onCommit={(value) => onEdit({ type: 'roomType', id: room.id, value })}
        />
      </Row>
      <Row label="Floor material">
        <SelectField
          value={room.floor_material_id}
          options={materialOptions}
          disabled={busy}
          onCommit={(value) =>
            value && onEdit({ type: 'material', id: room.id, value, slot: 'floor' })}
        />
      </Row>
      <Row label="Ceiling material">
        <SelectField
          value={room.ceiling_material_id}
          options={materialOptions}
          disabled={busy}
          onCommit={(value) =>
            value && onEdit({ type: 'material', id: room.id, value, slot: 'ceiling' })}
        />
      </Row>
      <dl className="mt-3 space-y-1 border-t border-[var(--tone-line)] pt-2.5">
        <Readout label="Area" value={formatArea(polygonArea(room.polygon))} />
        <Readout label="Corners" value={String(room.polygon?.length ?? 0)} />
      </dl>
    </>
  )
}

function OpeningFields({ model, opening, kind, busy, onEdit }) {
  const wall = model?.walls?.find((entry) => entry.id === opening.wall_id)
  const wallSpan = wall ? wallLength(wall) : null

  return (
    <>
      <Row
        label="Position along its wall"
        hint={<ProvenanceChip provenance={opening.provenance} />}
      >
        <NumberField
          value={Number(opening.distance_along.toFixed(3))}
          step={0.05}
          min={0}
          max={wallSpan ? Number((wallSpan - opening.width).toFixed(3)) : undefined}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'openingPosition', id: opening.id, value })}
        />
      </Row>
      <Row label="Width">
        <NumberField
          value={Number(opening.width.toFixed(3))}
          step={0.05}
          min={0.1}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'openingSize', id: opening.id, width: value })}
        />
      </Row>
      <Row label="Height">
        <NumberField
          value={Number(opening.height.toFixed(3))}
          step={0.05}
          min={0.1}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'openingSize', id: opening.id, height: value })}
        />
      </Row>
      {kind !== 'door' && (
        <Row label="Sill height">
          <NumberField
            value={Number((opening.sill_height ?? 0).toFixed(3))}
            step={0.05}
            min={0}
            suffix="m"
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'openingSize', id: opening.id, sill: value })}
          />
        </Row>
      )}
      {kind === 'door' && (
        <>
          <Row label="Hinge side">
            <SelectField
              value={opening.swing_side}
              disabled={busy}
              options={[
                { value: 'left', label: 'Left (from the wall start)' },
                { value: 'right', label: 'Right' },
                { value: 'none', label: 'No swing' },
              ]}
              onCommit={(value) =>
                onEdit({ type: 'openingSwing', id: opening.id, side: value })}
            />
          </Row>
          <Row label="Opens toward">
            <SelectField
              value={opening.swing_direction}
              disabled={busy}
              options={[
                { value: 'in', label: 'One side of the wall' },
                { value: 'out', label: 'The other side' },
              ]}
              onCommit={(value) =>
                onEdit({ type: 'openingSwing', id: opening.id, direction: value })}
            />
          </Row>
        </>
      )}
      <dl className="mt-3 space-y-1 border-t border-[var(--tone-line)] pt-2.5">
        <Readout label="Host wall" value={opening.wall_id} />
        {wallSpan != null && (
          <Readout label="Wall length" value={formatMeters(wallSpan)} />
        )}
      </dl>
    </>
  )
}

function ItemFields({ item, kind, busy, onEdit, materialOptions }) {
  return (
    <>
      {kind === 'furniture' && (
        <Row label="Name" hint={<ProvenanceChip provenance={item.provenance} />}>
          <TextField
            value={item.name}
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'furnitureName', id: item.id, value })}
          />
        </Row>
      )}
      <Row label="Position (x, y)">
        <div className="flex gap-1.5">
          <NumberField
            value={Number(item.position[0].toFixed(3))}
            step={0.05}
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'itemPosition', id: item.id, kind,
                position: [value, item.position[1]] })}
          />
          <NumberField
            value={Number(item.position[1].toFixed(3))}
            step={0.05}
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'itemPosition', id: item.id, kind,
                position: [item.position[0], value] })}
          />
        </div>
      </Row>
      <Row label="Footprint (w × d)">
        <div className="flex gap-1.5">
          <NumberField
            value={Number(item.size[0].toFixed(3))}
            step={0.05}
            min={0.05}
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'itemSize', id: item.id, kind,
                size: [value, item.size[1]] })}
          />
          <NumberField
            value={Number(item.size[1].toFixed(3))}
            step={0.05}
            min={0.05}
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'itemSize', id: item.id, kind,
                size: [item.size[0], value] })}
          />
        </div>
      </Row>
      <Row label="Height">
        <NumberField
          value={Number(item.height.toFixed(3))}
          step={0.05}
          min={0.05}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'itemSize', id: item.id, kind, height: value })}
        />
      </Row>
      <Row label="Rotation">
        <NumberField
          value={Number((item.rotation ?? 0).toFixed(1))}
          step={15}
          min={-360}
          max={360}
          suffix="°"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'itemRotation', id: item.id, kind, value })}
        />
      </Row>
      {kind === 'furniture' && (
        <Row label="Seats">
          <NumberField
            value={item.seats ?? 0}
            step={1}
            min={0}
            disabled={busy}
            onCommit={(value) =>
              onEdit({ type: 'itemSeats', id: item.id, value: Math.round(value) })}
          />
        </Row>
      )}
      <Row label="Material">
        <SelectField
          value={item.material_id}
          options={materialOptions}
          disabled={busy}
          onCommit={(value) =>
            value && onEdit({ type: 'material', id: item.id, value, slot: 'default' })}
        />
      </Row>
      <dl className="mt-3 space-y-1 border-t border-[var(--tone-line)] pt-2.5">
        <Readout label={kind === 'fixture' ? 'Category' : 'Asset type'}
          value={item.category ?? item.asset_type} />
        <Readout label="Room" value={item.room_id || '—'} />
      </dl>
    </>
  )
}

function LevelFields({ level, busy, onEdit }) {
  return (
    <>
      <Row label="Wall height" hint={<ProvenanceChip provenance={level.provenance} />}>
        <NumberField
          value={Number(level.default_wall_height.toFixed(3))}
          step={0.05}
          min={0.3}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'levelHeights', id: level.id, wallHeight: value })}
        />
      </Row>
      <Row label="Floor to floor">
        <NumberField
          value={Number(level.floor_to_floor.toFixed(3))}
          step={0.05}
          min={0.3}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'levelHeights', id: level.id, floorToFloor: value })}
        />
      </Row>
      <Row label="Elevation">
        <NumberField
          value={Number(level.elevation.toFixed(3))}
          step={0.05}
          suffix="m"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'levelElevation', id: level.id, value })}
        />
      </Row>
      <Row label="Slab thickness">
        <NumberField
          value={Number((level.slab_thickness * 1000).toFixed(0))}
          step={10}
          min={20}
          suffix="mm"
          disabled={busy}
          onCommit={(value) =>
            onEdit({ type: 'levelHeights', id: level.id, slabThickness: value / 1000 })}
        />
      </Row>
    </>
  )
}

function ReadOnlyFields({ element, kind }) {
  return (
    <>
      <p className="mb-3 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
        {kind === 'material'
          ? 'Materials are assigned from the element that uses them.'
          : `${kind.charAt(0).toUpperCase()}${kind.slice(1)}s are read from the drawing and are not editable in this experiment yet. Use the chat to change one.`}
      </p>
      <dl className="space-y-1">
        {Object.entries(element)
          .filter(([key]) => !['provenance', 'polygon', 'id'].includes(key))
          .slice(0, 12)
          .map(([key, value]) => (
            <Readout
              key={key}
              label={key.replace(/_/g, ' ')}
              value={
                Array.isArray(value)
                  ? value.map((entry) =>
                    typeof entry === 'number' ? entry.toFixed(2) : String(entry),
                  ).join(', ')
                  : String(value ?? '—')
              }
            />
          ))}
      </dl>
    </>
  )
}

function Readout({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-[0.6875rem] capitalize text-[var(--tone-muted-dark)]">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-[0.75rem] tabular-nums text-[var(--tone-ink)]">
        {value}
      </dd>
    </div>
  )
}
