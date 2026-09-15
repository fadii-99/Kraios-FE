import { useState } from 'react'
import {
  ArrowClockwise,
  ArrowsOut,
  Cube,
  DotsThreeVertical,
  FrameCorners,
  Path,
  Ruler,
  Camera as CameraIcon,
} from '@phosphor-icons/react'

import { VIEW_PRESET_LIST } from '@/lib/floorplan3d/SemanticScene'
import { cn } from '@/lib/cn'

/**
 * The viewport's own controls: camera, and the one measurement tool.
 *
 * COMPACT ON PURPOSE. It sits on top of the canvas, and every row of chrome is
 * a row of building the user cannot see. Everything that is not a per-second
 * control — downloads, revisions, the review lists, and every per-element edit
 * — lives in the panels instead.
 *
 * WHAT IS NOT HERE IS DELIBERATE. Layer visibility, the section cut, the grid
 * and the move/rotate/scale gizmos were removed: they read as CAD chrome to a
 * reader who only wants to look at their building, and each of them has a
 * calmer equivalent elsewhere — furniture is positioned, turned and resized by
 * number in the Properties panel, which is exact rather than approximate.
 *
 * It is presentational: it holds only which of its own menus is open, and every
 * actual decision is a callback. The page owns the view state, because the
 * inspector needs it too.
 */

// The camera presets the editor offers. `SemanticScene` defines more of them
// (front, right), but a floor plan is read from above and from one side, and an
// unused button still costs the model a slice of the frame.
const SHOWN_VIEWS = new Set(['iso', 'isoLow', 'top', 'left'])

const BUTTON =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-[0.6875rem] font-medium tracking-[0.02em] transition-colors'
const BUTTON_IDLE =
  'text-[var(--tone-ink-soft)] hover:bg-[color-mix(in_oklab,var(--tone-accent)_8%,transparent)] hover:text-[var(--tone-accent)]'
const BUTTON_ACTIVE =
  'bg-[color-mix(in_oklab,var(--tone-accent)_12%,transparent)] text-[var(--tone-accent)]'

function ToolButton({ active, onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active ? 'true' : undefined}
      disabled={disabled}
      className={cn(
        BUTTON,
        active ? BUTTON_ACTIVE : BUTTON_IDLE,
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--tone-line)]" />
}

export default function ViewportToolbar({
  view,
  onView,
  projection,
  onProjection,
  axesVisible,
  onAxesVisible,
  measuring,
  onMeasuring,
  levels,
  isolatedLevelId,
  onIsolateLevel,
  quality,
  onQuality,
  onFullscreen,
  onScreenshot,
}) {
  const [openMenu, setOpenMenu] = useState(null)
  const toggleMenu = (name) => setOpenMenu((current) => (current === name ? null : name))

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--tone-line)] bg-white/95 px-2 py-1.5">
      {/* Camera presets */}
      {VIEW_PRESET_LIST.filter((preset) => SHOWN_VIEWS.has(preset.id)).map((preset) => (
        <ToolButton
          key={preset.id}
          active={view === preset.id}
          onClick={() => onView(preset.id)}
          title={`${preset.label} view`}
        >
          {preset.label}
        </ToolButton>
      ))}

      <Divider />

      <ToolButton onClick={() => onView('fit')} title="Fit the model to the frame">
        <FrameCorners size={14} />
        Fit
      </ToolButton>
      <ToolButton onClick={() => onView('iso')} title="Reset the view">
        <ArrowClockwise size={14} />
        Reset
      </ToolButton>
      <ToolButton
        active={projection === 'perspective'}
        onClick={() =>
          onProjection(projection === 'perspective' ? 'orthographic' : 'perspective')
        }
        title={
          projection === 'perspective'
            ? 'Switch to orthographic (architectural) projection'
            : 'Switch to perspective projection'
        }
      >
        <Cube size={14} />
        {projection === 'perspective' ? 'Perspective' : 'Ortho'}
      </ToolButton>

      {/* Floor isolation. Only ever shown for a building that HAS more than one
          floor, so a single-storey plan never sees it at all. */}
      {levels.length > 1 && (
        <>
          <Divider />
          <div className="relative">
            <ToolButton
              active={openMenu === 'levels' || Boolean(isolatedLevelId)}
              onClick={() => toggleMenu('levels')}
              title="Show one floor only"
            >
              <Path size={14} />
              {isolatedLevelId
                ? levels.find((level) => level.id === isolatedLevelId)?.name || 'Floor'
                : 'All floors'}
            </ToolButton>
            {openMenu === 'levels' && (
              <div className="absolute left-0 top-9 z-20 w-52 rounded-md border border-[var(--tone-line)] bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onIsolateLevel(null)
                    setOpenMenu(null)
                  }}
                  className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs text-[var(--tone-ink)] transition-colors hover:bg-[var(--color-light)]"
                >
                  All floors
                </button>
                {levels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => {
                      onIsolateLevel(level.id)
                      setOpenMenu(null)
                    }}
                    className={cn(
                      'w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-light)]',
                      isolatedLevelId === level.id
                        ? 'text-[var(--tone-accent)]'
                        : 'text-[var(--tone-ink)]',
                    )}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Divider />

      <ToolButton
        active={measuring}
        onClick={() => onMeasuring(!measuring)}
        title="Measure between two points on the model"
      >
        <Ruler size={14} />
        Measure
      </ToolButton>

      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton onClick={onScreenshot} title="Save this view as a PNG">
          <CameraIcon size={14} />
        </ToolButton>
        <ToolButton onClick={onFullscreen} title="Fill the workspace">
          <ArrowsOut size={14} />
        </ToolButton>

        <div className="relative">
          <ToolButton
            active={openMenu === 'more'}
            onClick={() => toggleMenu('more')}
            title="More viewport options"
          >
            <DotsThreeVertical size={16} />
          </ToolButton>
          {openMenu === 'more' && (
            <div className="absolute right-0 top-9 z-20 w-56 rounded-md border border-[var(--tone-line)] bg-white p-1.5 shadow-lg">
              <p className="label-ui px-2 pb-1 pt-1 text-[var(--tone-ink-soft)]">
                Quality
              </p>
              {['high', 'medium', 'low'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onQuality(level)}
                  className={cn(
                    'w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs capitalize transition-colors hover:bg-[var(--color-light)]',
                    quality === level
                      ? 'text-[var(--tone-accent)]'
                      : 'text-[var(--tone-ink)]',
                  )}
                >
                  {level}
                  {level === 'low' && (
                    <span className="ml-1 text-[var(--tone-ink-soft)]">
                      — for integrated graphics
                    </span>
                  )}
                </button>
              ))}
              <div className="my-1 h-px bg-[var(--tone-line)]" />
              <button
                type="button"
                onClick={() => onAxesVisible(!axesVisible)}
                className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs text-[var(--tone-ink)] transition-colors hover:bg-[var(--color-light)]"
              >
                {axesVisible ? 'Hide axes' : 'Show axes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
