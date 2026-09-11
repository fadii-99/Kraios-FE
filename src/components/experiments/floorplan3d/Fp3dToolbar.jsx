import { useEffect, useRef, useState } from 'react'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsOutSimple,
  CaretDown,
  Cube,
  DownloadSimple,
  FloppyDisk,
  Selection,
  SquaresFour,
} from '@phosphor-icons/react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import { VIEW_PRESETS } from '@/lib/experiments/floorplan3d/Scene3D'
import { cn } from '@/lib/cn'

/**
 * The workspace's top bar: what this is, whether it is saved, and the controls
 * that change what you are looking at rather than what the model is.
 *
 * Save state is a WORD, not an icon. "Saved", "Unsaved changes" and "Saving…"
 * are three states a person has to be able to read at a glance in an editor,
 * and a dot that changes colour makes them guess which colour meant which.
 */

const VIEW_LABELS = {
  iso: 'Isometric',
  top: 'Top',
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  fit: 'Fit',
}

const TAB_LABELS = {
  '3d': '3D',
  '2d': '2D plan',
  split: 'Split',
  compare: 'Compare',
}

function ToolbarButton({ active, className, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5',
        'text-[0.75rem] font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-[var(--color-brand-deep)]',
        'disabled:cursor-not-allowed disabled:opacity-45',
        active
          ? 'border-[var(--color-brand-deep)] bg-[color-mix(in_oklab,var(--color-brand-deep)_9%,transparent)] text-[var(--color-brand-deep)]'
          : 'border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)]',
        className,
      )}
      {...rest}
    />
  )
}

function Menu({ label, icon: Icon, children, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Click-outside and Escape, the same behaviour the assistant menus have
  // (CLAUDE.md §32). Arrow-key roving focus is NOT implemented here either,
  // and nothing in this component claims it is.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        ref.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <ToolbarButton
        active={open}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {Icon && <Icon size={14} weight="bold" aria-hidden="true" />}
        {label}
        <CaretDown size={10} weight="bold" aria-hidden="true" />
      </ToolbarButton>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-9 z-30 min-w-56 rounded-md border',
            'border-[var(--tone-line-strong)] bg-white p-1 shadow-lg',
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ children, description, disabled, ...rest }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        'block w-full rounded-sm px-2.5 py-2 text-left transition-colors',
        'hover:bg-[var(--color-light)] disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
        'focus-visible:outline-[var(--color-brand-deep)]',
      )}
      {...rest}
    >
      <span className="block text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
        {children}
      </span>
      {description && (
        <span className="mt-0.5 block text-[0.6875rem] leading-snug text-[var(--tone-muted-dark)]">
          {description}
        </span>
      )}
    </button>
  )
}

const SAVE_STATE_COPY = {
  saved: ['Saved', 'text-[var(--color-success)]'],
  dirty: ['Unsaved changes', 'text-[var(--color-warning)]'],
  saving: ['Saving…', 'text-[var(--color-brand-deep)]'],
  conflict: ['Reload needed', 'text-[var(--color-danger)]'],
}

export default function Fp3dToolbar({
  title,
  subtitle,
  saveState = 'saved',
  tab,
  onTab,
  view,
  onView,
  projection,
  onProjection,
  transformMode,
  onTransformMode,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onSave,
  saving,
  exportFormats = [],
  onExport,
  exporting,
  skpReason,
}) {
  const [saveLabel, saveTone] = SAVE_STATE_COPY[saveState] ?? SAVE_STATE_COPY.saved

  return (
    <header
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b',
        'border-[var(--tone-line)] bg-white px-3 py-2',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-semibold text-[var(--tone-ink)]">
          {title}
        </p>
        <p className="truncate text-[0.6875rem] text-[var(--tone-muted-dark)]">
          {subtitle}
          {subtitle && ' · '}
          <span className={saveTone}>{saveLabel}</span>
        </p>
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="View mode">
        {Object.entries(TAB_LABELS).map(([id, label]) => (
          <ToolbarButton key={id} active={tab === id} onClick={() => onTab(id)}>
            {label}
          </ToolbarButton>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={onUndo}
          disabled={!canUndo}
          title={undoLabel}
          aria-label={undoLabel}
        >
          <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          onClick={onRedo}
          disabled={!canRedo}
          title={redoLabel}
          aria-label={redoLabel}
        >
          <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
        </ToolbarButton>
      </div>

      {tab !== '2d' && tab !== 'compare' && (
        <>
          <Menu label={VIEW_LABELS[view] ?? 'View'} icon={ArrowsOutSimple}>
            {VIEW_PRESETS.map((preset) => (
              <MenuItem key={preset} onClick={() => onView(preset)}>
                {VIEW_LABELS[preset]}
              </MenuItem>
            ))}
          </Menu>

          <div className="flex items-center gap-1" role="group" aria-label="Camera">
            <ToolbarButton
              active={projection === 'perspective'}
              onClick={() => onProjection('perspective')}
              title="Perspective camera"
            >
              <Cube size={14} weight="bold" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              active={projection === 'orthographic'}
              onClick={() => onProjection('orthographic')}
              title="Orthographic camera — what a measured drawing uses"
            >
              <SquaresFour size={14} weight="bold" aria-hidden="true" />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Gizmo">
            <ToolbarButton
              active={transformMode === 'translate'}
              onClick={() => onTransformMode('translate')}
              title="Move selected furniture"
            >
              <Selection size={14} weight="bold" aria-hidden="true" />
              Move
            </ToolbarButton>
            <ToolbarButton
              active={transformMode === 'rotate'}
              onClick={() => onTransformMode('rotate')}
              title="Rotate selected furniture"
            >
              <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
              Rotate
            </ToolbarButton>
          </div>
        </>
      )}

      <Menu label="Export" icon={DownloadSimple} disabled={exporting}>
        {exportFormats.map((format) => (
          <MenuItem
            key={format.key}
            disabled={!format.available}
            description={
              format.available
                ? format.description
                : format.unavailableReason || 'Not available here.'
            }
            onClick={() => format.available && onExport(format.key)}
          >
            {format.label}
            {format.lossless && ' — lossless'}
          </MenuItem>
        ))}
        {skpReason && (
          <p className="border-t border-[var(--tone-line)] px-2.5 py-2 text-[0.6875rem] leading-snug text-[var(--tone-muted-dark)]">
            Native .skp is unavailable on this deployment. {skpReason} Export
            COLLADA (.dae) and import it into SketchUp instead.
          </p>
        )}
      </Menu>

      <PrimaryButton
        size="xs"
        withArrow={false}
        loading={saving}
        loadingLabel="Saving"
        onClick={onSave}
        disabled={saveState === 'saved'}
      >
        <FloppyDisk size={14} weight="bold" aria-hidden="true" />
        Save
      </PrimaryButton>
    </header>
  )
}
