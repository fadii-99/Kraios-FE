import { cn } from '@/lib/cn'
import { formatArea, formatLength } from '@/lib/bim/planGeometry'

/**
 * What the extraction concluded, in numbers.
 *
 * Takes the ADAPTED view models — `bimAdapters.planFactsToView` and
 * `qualityToView` — so no raw payload reaches this file.
 *
 * The scale row is first and is not a statistic: it is the caveat every other
 * number here depends on. A plan scaled from an assumed door width can be
 * geometrically flawless and still have every dimension out by 20%, so the user
 * is told how the size was established before they are told any size.
 */
export default function BimPlanFacts({ facts, quality, className }) {
  if (!facts) return null

  const stats = quality?.stats ?? {}

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <ScaleNote source={facts.scaleSource} evidence={facts.scaleEvidence} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Building type" value={labelForType(facts.buildingType)} />
        <Fact label="Levels" value={stats.levels ?? '—'} />
        <Fact label="Footprint" value={formatArea(stats.footprintM2)} />
        <Fact label="Walls" value={stats.walls ?? '—'} />
        <Fact label="Doors" value={stats.doors ?? '—'} />
        <Fact label="Windows" value={stats.windows ?? '—'} />
        <Fact label="Rooms" value={stats.rooms ?? '—'} />
        <Fact label="Room area" value={formatArea(stats.roomAreaM2)} />
        <Fact label="Wall run" value={formatLength(stats.wallLengthM)} />
      </dl>

      {facts.levels.length > 0 && (
        <div>
          <SectionTitle>Levels</SectionTitle>
          <ul className="flex flex-col gap-1.5">
            {facts.levels.map((level) => (
              <li
                key={level.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-xs border border-[var(--tone-line)] bg-white/70 px-2.5 py-2"
              >
                <span className="text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
                  {level.name}
                </span>
                <span className="text-[0.75rem] text-[var(--tone-muted-dark)]">
                  wall {formatLength(level.wallHeight)} · floor-to-floor{' '}
                  {formatLength(level.floorToFloor)} · slab{' '}
                  {formatLength(level.slabThickness)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {facts.description && (
        <div>
          <SectionTitle>How the system read your drawing</SectionTitle>
          <p className="text-[0.8125rem] leading-relaxed text-[var(--tone-ink)]">
            {facts.description}
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * How the drawing's real-world size was established, and how far to trust it.
 * The first three are read off the drawing; the last two are guesses, and the
 * panel says so rather than presenting a derived number as a measurement.
 */
const SCALE_COPY = {
  dimension_string: ['Measured', 'from a dimension printed on the drawing', true],
  scale_bar: ['Measured', 'from the drawing’s scale bar', true],
  scale_ratio: ['Measured', 'from the drawing’s stated scale ratio', true],
  room_label_area: ['Derived', 'from a printed room area', true],
  door_heuristic: [
    'Estimated',
    'from an assumed 0.9 m door — every dimension may be off by 10–20%',
    false,
  ],
  unknown: [
    'Not established',
    'nothing on the drawing gave a real-world size, so all dimensions are guesses',
    false,
  ],
}

function ScaleNote({ source, evidence }) {
  const [headline, detail, reliable] = SCALE_COPY[source] ?? SCALE_COPY.unknown

  return (
    <div
      className={cn(
        'rounded-xs border px-3 py-2.5',
        reliable
          ? 'border-emerald-500/30 bg-emerald-50/60'
          : 'border-amber-500/40 bg-amber-50/70',
      )}
    >
      <p className="text-[0.8125rem] font-semibold text-[var(--tone-ink)]">
        Scale: {headline}
      </p>
      <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--tone-muted-dark)]">
        {detail}
        {evidence ? ` — “${evidence}”` : ''}
      </p>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h3
      className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--tone-muted-dark)]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </h3>
  )
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--tone-muted-dark)]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[0.9375rem] font-semibold text-[var(--tone-ink)]">
        {value}
      </dd>
    </div>
  )
}

function labelForType(value) {
  if (!value) return '—'
  return String(value)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
