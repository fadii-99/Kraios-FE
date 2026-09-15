import { useMemo, useState } from 'react'
import { Check, Copy, Trash, WarningCircle } from '@phosphor-icons/react'

import {
  confidenceOf,
  elementLabel,
  findElement,
  humanise,
  isConfirmed,
  polygonArea,
  polylineLength,
  wallById,
} from '@/lib/floorplan3d/semanticModel'
import { catalogByCategory } from '@/lib/floorplan3d/furniture'
import { formatArea, formatMetres } from '@/lib/floorplan3d/adapters'
import { cn } from '@/lib/cn'

/**
 * The right panel: what the selected element is, and how to change it.
 *
 * EVERY FIELD EDITS THE SEMANTIC DOCUMENT, through a command. Nothing here
 * touches geometry: a door's width is a number in the JSON, and the mesh
 * follows on the next rebuild. That is what makes the edits undoable, savable
 * as a revision, and reproducible by the Blender worker.
 *
 * WHY NUMERIC FIELDS AND NOT DRAG HANDLES.
 * A door's position is a DISTANCE ALONG ITS WALL, and a wall's shape is a
 * polyline whose endpoints other walls share — dragging either with a translate
 * gizmo would produce a value the model cannot express, or silently break a
 * junction. So those are edited as the numbers they actually are. Furniture
 * could have taken a gizmo, and once did; the toolbar's Move / Rotate / Scale
 * modes are gone, so every element in the building is now positioned, turned
 * and sized here, by number. Approximate dragging was the weaker half of that
 * pair anyway — a chair nudged by eye lands on no dimension anyone can check.
 *
 * PROVENANCE IS SHOWN, NOT HIDDEN. Every panel says where the value came from
 * and how confident the engine was, and offers "Confirm" — which is what stops
 * a later repair pass overwriting a decision the user has made.
 */

const FIELD =
  'w-full rounded-sm border border-[var(--tone-line)] bg-white px-2 py-1.5 text-xs text-[var(--tone-ink)] outline-none transition-colors focus:border-[var(--color-brand-deep)]'
const LABEL = 'mb-1 block text-[0.625rem] font-medium uppercase tracking-[0.08em] text-[var(--tone-ink-soft)]'

/**
 * Local draft text for a field whose committed value lives in the document.
 *
 * The "adjust state during render" pattern React documents for exactly this
 * case, and the one `ProfileContext` already uses for its form model: when the
 * incoming value changes, the draft is reset DURING RENDER rather than in an
 * effect. An effect would render once with the stale draft and once with the
 * new one, and `react-hooks/set-state-in-effect` is right to object to it.
 *
 * This matters here because the document is re-created by every command and by
 * every undo, so an inspector field has to follow a value it does not own —
 * while still letting the user type freely between commits.
 */
function useDraft(value) {
  const [draft, setDraft] = useState(() => String(value ?? ''))
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(String(value ?? ''))
  }
  return [draft, setDraft]
}

function Row({ label, children }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  )
}

/**
 * A number field that commits on blur or Enter, not on every keystroke.
 *
 * Committing per keystroke would rebuild the scene on every digit — and worse,
 * push a half-typed "2" through the command stack as its own undo step, so
 * typing "2400" would take four undos to reverse.
 */
function NumberField({ label, value, onCommit, min, max, step = 1, suffix, disabled }) {
  const [draft, setDraft] = useDraft(value)

  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(String(value ?? ''))
      return
    }
    const clamped = Math.min(Math.max(parsed, min ?? -Infinity), max ?? Infinity)
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <Row label={suffix ? `${label} (${suffix})` : label}>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        className={cn(FIELD, disabled && 'cursor-not-allowed opacity-60')}
      />
    </Row>
  )
}

function TextField({ label, value, onCommit, maxLength }) {
  const [draft, setDraft] = useDraft(value)
  return (
    <Row label={label}>
      <input
        type="text"
        value={draft}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        className={FIELD}
      />
    </Row>
  )
}

function SelectField({ label, value, options, onCommit }) {
  return (
    <Row label={label}>
      <select
        value={value ?? ''}
        onChange={(event) => onCommit(event.target.value)}
        className={cn(FIELD, 'cursor-pointer')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Row>
  )
}

function Readout({ label, value }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <p className="text-xs text-[var(--tone-ink)]">{value}</p>
    </div>
  )
}

/**
 * Where the value came from, and whether a person has confirmed it.
 *
 * The most product-critical block in this panel. A wall height nobody chose
 * still ends up in a bill of quantities, so the panel has to say when a value
 * is a default rather than a measurement.
 */
function Provenance({ element, onConfirm, canEdit }) {
  const provenance = element?.provenance ?? {}
  const confidence = Math.round(confidenceOf(element) * 100)
  const confirmed = isConfirmed(element)

  const sourceCopy = {
    vector: 'Read exactly from the drawing’s vector data.',
    raster: 'Measured off the drawing’s pixels, not estimated.',
    annotation: 'Read from a printed annotation.',
    vision: 'Recognised visually from the drawing.',
    derived: 'Derived from other elements that were detected.',
    default: 'NOT from the drawing — a default for this building type.',
    manual: 'Set by you.',
  }[provenance.detection_source] ?? ''

  return (
    <div className="rounded-md border border-[var(--tone-line)] bg-[var(--color-light)] p-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className={cn(LABEL, 'mb-0')}>Where this came from</span>
        {confirmed ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[0.625rem] font-medium text-[var(--color-success)]">
            <Check size={11} /> Confirmed
          </span>
        ) : (
          <span
            className={cn(
              'ml-auto text-[0.625rem] font-medium',
              confidence >= 75
                ? 'text-[var(--color-success)]'
                : confidence >= 50
                  ? 'text-[var(--color-warning)]'
                  : 'text-[var(--color-danger)]',
            )}
          >
            {confidence}% confident
          </span>
        )}
      </div>
      <p className="text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
        {sourceCopy}
        {provenance.note ? ` ${provenance.note}.` : ''}
      </p>
      {!confirmed && canEdit && (
        <button
          type="button"
          onClick={onConfirm}
          className="label-ui mt-2 cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--color-success)] hover:text-[var(--color-success)]"
        >
          Confirm this element
        </button>
      )}
    </div>
  )
}

export default function PropertyInspector({
  document: semanticDocument,
  catalog,
  selectedId,
  canEdit,
  onCommand,
  onDelete,
  onDuplicate,
  onSelect,
}) {
  const entry = useMemo(
    () => findElement(semanticDocument, selectedId),
    [semanticDocument, selectedId],
  );

  const assetGroups = useMemo(() => catalogByCategory(catalog?.payload), [catalog])

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-xs text-[var(--tone-ink-soft)]">
          Select an element in the model to see and edit its properties.
        </p>
      </div>
    )
  }

  const { element, kind, level } = entry
  const materialOptions = [
    { value: '', label: 'Default' },
    ...(semanticDocument.materials ?? []).map((material) => ({
      value: material.id,
      label: material.name || material.id,
    })),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-[var(--tone-line)] px-3 py-2.5">
        <p className="label-ui text-[var(--color-brand-deep)]">{humanise(kind)}</p>
        <h3 className="truncate text-sm font-medium text-[var(--tone-ink)]">
          {elementLabel(entry)}
        </h3>
        <p className="mt-0.5 truncate font-mono text-[0.625rem] text-[var(--tone-ink-soft)]">
          {element.id}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <Provenance
          element={element}
          canEdit={canEdit}
          onConfirm={() => onCommand('confirmElement', { elementId: element.id })}
        />

        {kind === 'wall' && (
          <>
            <Readout
              label="Length"
              value={formatMetres(polylineLength(element.polyline ?? []))}
            />
            <NumberField
              label="Thickness"
              suffix="mm"
              value={Math.round(element.thickness ?? 0)}
              min={60}
              max={1200}
              step={10}
              disabled={!canEdit}
              onCommit={(thickness) =>
                onCommand('setWallDimensions', { elementId: element.id, thickness })
              }
            />
            <NumberField
              label="Height"
              suffix="mm"
              value={Math.round(element.height ?? 0)}
              min={300}
              max={12000}
              step={50}
              disabled={!canEdit}
              onCommit={(height) =>
                onCommand('setWallDimensions', { elementId: element.id, height })
              }
            />
            <SelectField
              label="Type"
              value={element.wall_type}
              options={[
                { value: 'exterior', label: 'Exterior' },
                { value: 'interior', label: 'Interior' },
                { value: 'partition', label: 'Partition' },
                { value: 'retaining', label: 'Retaining' },
                { value: 'curtain', label: 'Curtain wall' },
              ]}
              onCommit={(wallType) =>
                onCommand('setWallDimensions', { elementId: element.id, wallType })
              }
            />
            <SelectField
              label="Material"
              value={element.material_id}
              options={materialOptions}
              onCommit={(materialId) =>
                onCommand('setElementMaterial', { elementId: element.id, materialId })
              }
            />

            <div className="rounded-md border border-[var(--tone-line)] p-2.5">
              <p className={LABEL}>Endpoints (mm)</p>
              {(element.polyline ?? []).map((point, index) => (
                <div key={index} className="mb-1.5 grid grid-cols-2 gap-1.5">
                  <NumberField
                    label={`P${index + 1} x`}
                    value={Math.round(point[0])}
                    step={10}
                    disabled={!canEdit}
                    onCommit={(x) =>
                      onCommand('setWallEndpoint', {
                        elementId: element.id,
                        index,
                        point: [x, point[1]],
                      })
                    }
                  />
                  <NumberField
                    label={`P${index + 1} y`}
                    value={Math.round(point[1])}
                    step={10}
                    disabled={!canEdit}
                    onCommit={(y) =>
                      onCommand('setWallEndpoint', {
                        elementId: element.id,
                        index,
                        point: [point[0], y],
                      })
                    }
                  />
                </div>
              ))}
              <p className="text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
                Endpoints snap onto a nearby wall corner, so a wall meets the
                building instead of stopping just short of it.
              </p>
            </div>

            {(element.opening_ids ?? []).length > 0 && (
              <div>
                <p className={LABEL}>Openings in this wall</p>
                <div className="flex flex-wrap gap-1">
                  {element.opening_ids.map((openingId) => (
                    <button
                      key={openingId}
                      type="button"
                      onClick={() => onSelect(openingId)}
                      className="cursor-pointer rounded-xs border border-[var(--tone-line)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--tone-ink-soft)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
                    >
                      {openingId.slice(0, 8)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canEdit && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onCommand('addOpening', {
                      levelId: level.id,
                      wallId: element.id,
                      kind: 'door',
                    })
                  }
                  className="label-ui cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
                >
                  Add door
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onCommand('addOpening', {
                      levelId: level.id,
                      wallId: element.id,
                      kind: 'window',
                    })
                  }
                  className="label-ui cursor-pointer rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
                >
                  Add window
                </button>
              </div>
            )}
          </>
        )}

        {(kind === 'door' || kind === 'window' || kind === 'opening') && (
          <>
            {(() => {
              const host = wallById(level, element.host_wall_id)
              const hostLength = polylineLength(host?.polyline ?? [])
              return (
                <>
                  <Readout
                    label="Host wall"
                    value={
                      host ? `${humanise(host.wall_type)} · ${formatMetres(hostLength)}` : '—'
                    }
                  />
                  <NumberField
                    label="Position along the wall"
                    suffix="mm from its start"
                    value={Math.round(element.position ?? 0)}
                    min={0}
                    max={Math.round(hostLength)}
                    step={10}
                    disabled={!canEdit}
                    onCommit={(position) =>
                      onCommand('setOpeningPlacement', { elementId: element.id, position })
                    }
                  />
                </>
              )
            })()}
            <NumberField
              label="Width"
              suffix="mm"
              value={Math.round(element.width ?? 0)}
              min={200}
              max={12000}
              step={25}
              disabled={!canEdit}
              onCommit={(width) =>
                onCommand('setOpeningDimensions', { elementId: element.id, width })
              }
            />
            <NumberField
              label="Height"
              suffix="mm"
              value={Math.round(element.height ?? 0)}
              min={200}
              max={6000}
              step={25}
              disabled={!canEdit}
              onCommit={(height) =>
                onCommand('setOpeningDimensions', { elementId: element.id, height })
              }
            />
            {kind !== 'door' && (
              <NumberField
                label="Sill height"
                suffix="mm above the floor"
                value={Math.round(element.sill_height ?? 0)}
                min={0}
                max={4000}
                step={25}
                disabled={!canEdit}
                onCommit={(sillHeight) =>
                  onCommand('setOpeningDimensions', { elementId: element.id, sillHeight })
                }
              />
            )}
            <SelectField
              label="Kind"
              value={element.kind}
              options={[
                { value: 'door', label: 'Door' },
                { value: 'double_door', label: 'Double door' },
                { value: 'sliding_door', label: 'Sliding door' },
                { value: 'folding_door', label: 'Folding door' },
                { value: 'garage_door', label: 'Garage door' },
                { value: 'window', label: 'Window' },
                { value: 'fixed_window', label: 'Fixed window' },
                { value: 'bay_window', label: 'Bay window' },
                { value: 'passage', label: 'Passage (no leaf)' },
              ]}
              onCommit={(nextKind) =>
                onCommand('setOpeningDimensions', { elementId: element.id, kind: nextKind })
              }
            />
            {kind === 'door' && (
              <SelectField
                label="Swing"
                value={element.swing}
                options={[
                  { value: 'unknown', label: 'Unknown (not drawn)' },
                  { value: 'left_in', label: 'Left, inwards' },
                  { value: 'left_out', label: 'Left, outwards' },
                  { value: 'right_in', label: 'Right, inwards' },
                  { value: 'right_out', label: 'Right, outwards' },
                  { value: 'sliding', label: 'Sliding' },
                  { value: 'none', label: 'No leaf' },
                ]}
                onCommit={(swing) =>
                  onCommand('setOpeningDimensions', { elementId: element.id, swing })
                }
              />
            )}
          </>
        )}

        {kind === 'room' && (
          <>
            <TextField
              label="Name"
              value={element.name}
              maxLength={120}
              onCommit={(name) => onCommand('setRoomProperties', { elementId: element.id, name })}
            />
            <TextField
              label="Type"
              value={element.room_type}
              maxLength={60}
              onCommit={(roomType) =>
                onCommand('setRoomProperties', { elementId: element.id, roomType })
              }
            />
            <Readout label="Area" value={formatArea(polygonArea(element.polygon ?? []))} />
            {element.stated_area_m2 ? (
              <Readout
                label="Area printed on the drawing"
                value={`${element.stated_area_m2} m²`}
              />
            ) : null}
            <SelectField
              label="Floor finish"
              value={element.floor_material_id}
              options={materialOptions}
              onCommit={(materialId) =>
                onCommand('setElementMaterial', {
                  elementId: element.id,
                  materialId,
                  field: 'floor_material_id',
                })
              }
            />
          </>
        )}

        {kind === 'column' && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Width"
                suffix="mm"
                value={Math.round(element.size?.[0] ?? 0)}
                min={100}
                max={2000}
                step={10}
                disabled={!canEdit}
                onCommit={(width) =>
                  onCommand('setColumnProperties', {
                    elementId: element.id,
                    size: [width, element.size?.[1] ?? width],
                  })
                }
              />
              <NumberField
                label="Depth"
                suffix="mm"
                value={Math.round(element.size?.[1] ?? 0)}
                min={100}
                max={2000}
                step={10}
                disabled={!canEdit}
                onCommit={(depth) =>
                  onCommand('setColumnProperties', {
                    elementId: element.id,
                    size: [element.size?.[0] ?? depth, depth],
                  })
                }
              />
            </div>
            <NumberField
              label="Height"
              suffix="mm"
              value={Math.round(element.height ?? 0)}
              min={300}
              max={12000}
              step={50}
              disabled={!canEdit}
              onCommit={(height) =>
                onCommand('setColumnProperties', { elementId: element.id, height })
              }
            />
            <SelectField
              label="Shape"
              value={element.shape}
              options={[
                { value: 'rectangular', label: 'Rectangular' },
                { value: 'circular', label: 'Circular' },
              ]}
              onCommit={(shape) =>
                onCommand('setColumnProperties', { elementId: element.id, shape })
              }
            />
          </>
        )}

        {kind === 'stair' && (
          <>
            <NumberField
              label="Total rise"
              suffix="mm"
              value={Math.round(element.total_rise ?? 0)}
              min={200}
              max={12000}
              step={10}
              disabled={!canEdit}
              onCommit={(totalRise) =>
                onCommand('setStairProperties', { elementId: element.id, totalRise })
              }
            />
            <NumberField
              label="Number of steps"
              value={element.step_count ?? 0}
              min={1}
              max={80}
              step={1}
              disabled={!canEdit}
              onCommit={(stepCount) =>
                onCommand('setStairProperties', { elementId: element.id, stepCount })
              }
            />
            <Readout
              label="Riser height (derived)"
              value={`${Math.round(element.riser_height ?? 0)} mm`}
            />
            <NumberField
              label="Tread depth"
              suffix="mm"
              value={Math.round(element.tread_depth ?? 0)}
              min={200}
              max={500}
              step={5}
              disabled={!canEdit}
              onCommit={(treadDepth) =>
                onCommand('setStairProperties', { elementId: element.id, treadDepth })
              }
            />
            <NumberField
              label="Width"
              suffix="mm"
              value={Math.round(element.run_width ?? 0)}
              min={600}
              max={4000}
              step={25}
              disabled={!canEdit}
              onCommit={(runWidth) =>
                onCommand('setStairProperties', { elementId: element.id, runWidth })
              }
            />
            <NumberField
              label="Direction"
              suffix="degrees"
              value={Math.round(element.direction ?? 0)}
              min={-360}
              max={360}
              step={5}
              disabled={!canEdit}
              onCommit={(direction) =>
                onCommand('setStairProperties', { elementId: element.id, direction })
              }
            />
            <p className="rounded-md border border-[var(--tone-line)] bg-[var(--color-light)] p-2.5 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
              The riser height is derived from the total rise and the step count, so
              the flight always lands exactly on the floor above.
            </p>
          </>
        )}

        {(kind === 'furniture' || kind === 'fixture') && (
          <>
            <Readout label="Recognised as" value={humanise(element.semantic_class)} />
            {assetGroups.length > 0 && (
              <Row label="Item">
                <select
                  value={element.asset_id ?? ''}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const asset = (catalog?.payload?.assets ?? []).find(
                      (candidate) => candidate.asset_id === event.target.value,
                    )
                    onCommand('setFurnitureAsset', {
                      elementId: element.id,
                      assetId: asset?.asset_id,
                      semanticClass: asset?.semantic_class,
                      size: asset?.default_size,
                    })
                  }}
                  className={cn(FIELD, 'cursor-pointer')}
                >
                  <option value="">Unrecognised (plain box)</option>
                  {assetGroups.map((group) => (
                    <optgroup key={group.category} label={humanise(group.category)}>
                      {group.assets.map((asset) => (
                        <option key={asset.asset_id} value={asset.asset_id}>
                          {asset.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Row>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="X"
                suffix="mm"
                value={Math.round(element.position?.[0] ?? 0)}
                step={10}
                disabled={!canEdit}
                onCommit={(x) =>
                  onCommand('setFurniturePosition', {
                    elementId: element.id,
                    position: [x, element.position?.[1] ?? 0],
                  })
                }
              />
              <NumberField
                label="Y"
                suffix="mm"
                value={Math.round(element.position?.[1] ?? 0)}
                step={10}
                disabled={!canEdit}
                onCommit={(y) =>
                  onCommand('setFurniturePosition', {
                    elementId: element.id,
                    position: [element.position?.[0] ?? 0, y],
                  })
                }
              />
            </div>
            <NumberField
              label="Rotation"
              suffix="degrees"
              value={Math.round(element.rotation ?? 0)}
              min={-360}
              max={360}
              step={15}
              disabled={!canEdit}
              onCommit={(absolute) =>
                onCommand('rotateFurniture', { elementId: element.id, absolute })
              }
            />
            <div className="grid grid-cols-3 gap-1.5">
              {['Width', 'Depth', 'Height'].map((axis, index) => (
                <NumberField
                  key={axis}
                  label={axis}
                  suffix="mm"
                  value={Math.round(element.size?.[index] ?? 0)}
                  min={50}
                  max={20000}
                  step={10}
                  disabled={!canEdit}
                  onCommit={(next) => {
                    const size = [...(element.size ?? [600, 600, 750])]
                    size[index] = next
                    onCommand('scaleFurniture', { elementId: element.id, size })
                  }}
                />
              ))}
            </div>
            <Row label="Colour">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={element.color || '#9AA3AB'}
                  disabled={!canEdit}
                  onChange={(event) =>
                    onCommand('setElementColor', {
                      elementId: element.id,
                      color: event.target.value.toUpperCase(),
                    })
                  }
                  className="h-8 w-12 cursor-pointer rounded-sm border border-[var(--tone-line)] bg-white p-0.5"
                />
                {element.color && canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      onCommand('setElementColor', { elementId: element.id, color: '' })
                    }
                    className="cursor-pointer text-[0.6875rem] text-[var(--tone-ink-soft)] underline transition-colors hover:text-[var(--tone-accent)]"
                  >
                    Use the catalogue colours
                  </button>
                )}
              </div>
            </Row>
          </>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--tone-line)] pt-3">
            {(kind === 'furniture' || kind === 'fixture') && (
              <button
                type="button"
                onClick={() => onDuplicate(element.id)}
                className="label-ui inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
              >
                <Copy size={13} />
                Duplicate
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(element.id)}
              className="label-ui inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              <Trash size={13} />
              Delete
            </button>
          </div>
        )}

        {kind === 'wall' && (
          <p className="flex items-start gap-1.5 text-[0.625rem] leading-relaxed text-[var(--tone-ink-soft)]">
            <WarningCircle size={12} className="mt-0.5 shrink-0" />
            Deleting a wall also deletes the doors and windows it hosts — an
            opening with no wall cannot be built.
          </p>
        )}
      </div>
    </div>
  )
}
