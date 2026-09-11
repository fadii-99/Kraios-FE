import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  PLAN_PADDING,
  planShapes,
  planTransform,
  pointsToPath,
} from '@/lib/experiments/floorplan3d/plan2d'
import { modelBounds } from '@/lib/experiments/floorplan3d/model'
import { cn } from '@/lib/cn'

/**
 * The plan view: the model drawn the way a drawing draws it.
 *
 * SVG rather than a second canvas, because this is where a corner is dragged
 * and a door is clicked, and every element has to be a real hit-testable
 * target. In SVG the browser already does that; on a canvas each one would be
 * a manual pick against a list of shapes.
 *
 * WALL CORNERS ARE DRAGGED HERE, NOT IN 3D
 * ----------------------------------------
 * Moving a wall means moving the corners it shares, the rooms whose polygons
 * use them and the openings it hosts. A 3D transform gizmo cannot express
 * that; a plan can, because a corner IS a point. The drag reports a MODEL
 * coordinate, and the workspace turns it into a `move_wall_endpoint` command
 * whose `drag_connected` flag is what carries the neighbours.
 *
 * Nothing here mutates the model. A drag in progress is local state; releasing
 * it emits one command.
 */

const WALL_FILL = {
  exterior: '#c9c5be',
  interior: '#dcd9d3',
  partition: '#e7e4df',
  retaining: '#bdb8b0',
  curtain: '#c6dcec',
}

const OPENING_FILL = {
  door: '#ffffff',
  window: '#dff0fb',
  passage: '#ffffff',
}

// A handle small enough not to obscure the corner, big enough to grab. 5 px is
// under the 24 px touch target guidance, so the hit area is a separate,
// invisible, larger circle — the visible dot is the affordance, not the target.
const HANDLE_RADIUS = 4
const HANDLE_HIT_RADIUS = 11

export default function Fp3dPlan2D({
  model,
  selectedId = null,
  flaggedIds,
  visibleLevelIds = null,
  visibleLayers = null,
  showSwings = true,
  showLabels = true,
  showDimensions = true,
  editable = true,
  onSelect,
  onMoveEndpoint,
  className,
}) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [drag, setDrag] = useState(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const bounds = useMemo(() => modelBounds(model), [model])
  const transform = useMemo(
    () => planTransform(bounds, size.width, size.height),
    [bounds, size.width, size.height],
  )
  const shapes = useMemo(
    () => planShapes(model, transform, {
      levelIds: visibleLevelIds,
      layers: visibleLayers,
      flagged: flaggedIds,
    }),
    [model, transform, visibleLevelIds, visibleLayers, flaggedIds],
  )

  const pointerToModel = useCallback((event) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return transform.unproject([event.clientX - rect.left, event.clientY - rect.top])
  }, [transform])

  const onHandleDown = useCallback((event, handle) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDrag({ ...handle, at: handle.at })
  }, [editable])

  const onPointerMove = useCallback((event) => {
    if (!drag) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setDrag((current) => (current
      ? { ...current, at: [event.clientX - rect.left, event.clientY - rect.top] }
      : current))
  }, [drag])

  const onPointerUp = useCallback((event) => {
    if (!drag) return
    const target = pointerToModel(event)
    setDrag(null)
    if (target) onMoveEndpoint?.(drag.wallId, drag.endpoint, target)
  }, [drag, onMoveEndpoint, pointerToModel])

  const hasContent = shapes.wallBodies.length > 0 || shapes.rooms.length > 0

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full overflow-hidden bg-white', className)}
    >
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label="2D floor plan"
        className="h-full w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={() => onSelect?.(null)}
      >
        <defs>
          <pattern id="fp3d-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#eaeef2" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={size.width} height={size.height} fill="url(#fp3d-grid)" />

        {/* Rooms first: a wash under everything, never over a wall. */}
        {shapes.rooms.map((room) => (
          <polygon
            key={room.id}
            points={pointsToPath(room.points)}
            fill={room.flagged ? 'rgba(181,71,8,0.14)' : 'rgba(199,214,232,0.42)'}
            stroke={selectedId === room.id ? '#1677ff' : 'transparent'}
            strokeWidth={selectedId === room.id ? 2 : 0}
            className="cursor-pointer"
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(room.id)
            }}
          />
        ))}

        {shapes.wallBodies.map((wall) => (
          <polygon
            key={wall.id}
            points={pointsToPath(wall.points)}
            fill={wall.flagged ? '#e7c3a8' : (WALL_FILL[wall.type] ?? WALL_FILL.interior)}
            stroke={selectedId === wall.id ? '#1677ff' : '#2a3138'}
            strokeWidth={selectedId === wall.id ? 2.5 : 1.2}
            className="cursor-pointer"
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(wall.id)
            }}
          />
        ))}

        {/* Openings are drawn OVER the wall, in white, which is how a plan
            shows a hole: the wall stops. */}
        {shapes.openingMarks.map((opening) => (
          <polygon
            key={opening.id}
            points={pointsToPath(opening.points)}
            fill={opening.flagged ? '#f6e0cf' : (OPENING_FILL[opening.kind] ?? '#ffffff')}
            stroke={selectedId === opening.id ? '#1677ff' : '#2a3138'}
            strokeWidth={selectedId === opening.id ? 2.5 : 1}
            className="cursor-pointer"
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(opening.id)
            }}
          />
        ))}

        {showSwings && shapes.swings.map((swing) => (
          <g key={`swing-${swing.id}`} pointerEvents="none">
            <polyline
              points={pointsToPath(swing.arc)}
              fill="none"
              stroke="#7d8994"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={swing.leaf[0][0]} y1={swing.leaf[0][1]}
              x2={swing.leaf[1][0]} y2={swing.leaf[1][1]}
              stroke="#5a6570"
              strokeWidth="1.6"
            />
          </g>
        ))}

        {shapes.structure.map((element) => {
          if (element.kind === 'column') {
            return element.shape === 'circular' ? (
              <circle
                key={element.id}
                cx={element.at[0]} cy={element.at[1]}
                r={Math.max(element.width, element.depth) / 2}
                fill="#9aa4ae"
                stroke={selectedId === element.id ? '#1677ff' : '#2a3138'}
                strokeWidth={selectedId === element.id ? 2.5 : 1}
                className="cursor-pointer"
                onClick={(event) => { event.stopPropagation(); onSelect?.(element.id) }}
              />
            ) : (
              <rect
                key={element.id}
                x={element.at[0] - element.width / 2}
                y={element.at[1] - element.depth / 2}
                width={element.width} height={element.depth}
                transform={`rotate(${-element.rotation} ${element.at[0]} ${element.at[1]})`}
                fill="#9aa4ae"
                stroke={selectedId === element.id ? '#1677ff' : '#2a3138'}
                strokeWidth={selectedId === element.id ? 2.5 : 1}
                className="cursor-pointer"
                onClick={(event) => { event.stopPropagation(); onSelect?.(element.id) }}
              />
            )
          }
          if (element.kind === 'beam') {
            return (
              <line
                key={element.id}
                x1={element.from[0]} y1={element.from[1]}
                x2={element.to[0]} y2={element.to[1]}
                stroke={selectedId === element.id ? '#1677ff' : '#8d949c'}
                strokeWidth="2"
                strokeDasharray="8 4"
                className="cursor-pointer"
                onClick={(event) => { event.stopPropagation(); onSelect?.(element.id) }}
              />
            )
          }
          return (
            <g
              key={element.id}
              className="cursor-pointer"
              onClick={(event) => { event.stopPropagation(); onSelect?.(element.id) }}
            >
              {element.treads.map(([from, to], index) => (
                <line
                  key={index}
                  x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}
                  stroke={selectedId === element.id ? '#1677ff' : '#7d8994'}
                  strokeWidth="1"
                />
              ))}
              <line
                x1={element.arrow[0][0]} y1={element.arrow[0][1]}
                x2={element.arrow[1][0]} y2={element.arrow[1][1]}
                stroke="#5a6570" strokeWidth="1.4"
                markerEnd="url(#fp3d-arrow)"
              />
            </g>
          )
        })}

        {shapes.contents.map((item) => (
          <g
            key={item.id}
            className="cursor-pointer"
            onClick={(event) => { event.stopPropagation(); onSelect?.(item.id) }}
          >
            <rect
              x={item.at[0] - item.width / 2}
              y={item.at[1] - item.depth / 2}
              width={item.width}
              height={item.depth}
              transform={`rotate(${-item.rotation} ${item.at[0]} ${item.at[1]})`}
              fill={item.flagged ? 'rgba(181,71,8,0.16)' : 'rgba(150,163,177,0.24)'}
              stroke={selectedId === item.id ? '#1677ff' : '#8d949c'}
              strokeWidth={selectedId === item.id ? 2.2 : 1}
            />
          </g>
        ))}

        {showDimensions && shapes.dimensions.map((dimension) => (
          <g key={dimension.id} pointerEvents="none">
            <line
              x1={dimension.from[0]} y1={dimension.from[1]}
              x2={dimension.to[0]} y2={dimension.to[1]}
              stroke="#0b5ed7" strokeWidth="1"
            />
            <text
              x={(dimension.from[0] + dimension.to[0]) / 2}
              y={(dimension.from[1] + dimension.to[1]) / 2 - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#0b5ed7"
            >
              {dimension.text}
            </text>
          </g>
        ))}

        {showLabels && shapes.labels.map((label) => (
          <text
            key={`label-${label.id}`}
            x={label.at[0]}
            y={label.at[1]}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#16202b"
            pointerEvents="none"
          >
            {label.text}
          </text>
        ))}

        {/* Handles last, so they are always grabbable — a corner under a
            furniture rectangle would otherwise be unreachable. */}
        {editable && shapes.handles.map((handle) => {
          const at = drag?.id === handle.id ? drag.at : handle.at
          return (
            <g key={handle.id}>
              <circle
                cx={at[0]} cy={at[1]} r={HANDLE_HIT_RADIUS}
                fill="transparent"
                className="cursor-move"
                onPointerDown={(event) => onHandleDown(event, handle)}
              />
              <circle
                cx={at[0]} cy={at[1]} r={HANDLE_RADIUS}
                fill={drag?.id === handle.id ? '#1677ff' : '#ffffff'}
                stroke="#0b5ed7"
                strokeWidth="1.5"
                pointerEvents="none"
              />
            </g>
          )
        })}

        <defs>
          <marker
            id="fp3d-arrow" markerWidth="8" markerHeight="8"
            refX="7" refY="4" orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#5a6570" />
          </marker>
        </defs>
      </svg>

      {!hasContent && (
        <p className="absolute inset-0 flex items-center justify-center text-[0.8125rem] text-[var(--tone-muted-dark)]">
          Nothing to draw on this level.
        </p>
      )}

      {editable && (
        <p className="pointer-events-none absolute bottom-2 left-3 text-[0.6875rem] text-[var(--tone-muted-dark)]">
          Drag a corner to move it. Walls sharing it follow.
        </p>
      )}
    </div>
  )
}

export { PLAN_PADDING }
