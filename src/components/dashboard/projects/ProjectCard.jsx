import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Blueprint,
  CheckCircle,
  ClipboardText,
  Cube,
  Trash,
  XCircle,
} from '@phosphor-icons/react'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import { cn } from '@/lib/cn'

/**
 * One stage's state: stage icon, term, state.
 *
 * Deliberately the same icon / label / value block the Profile title block uses
 * for a billing fact, so the two screens read as one product. It is NOT the
 * label-left / state-right row this replaced — that arrangement was a table
 * cell, and two of them stacked read as a table.
 *
 * State is carried three ways at once, never by colour alone: the words
 * ("Generated" / "Not generated"), the icon (CheckCircle / XCircle) and the
 * token (`--color-success` / `--color-danger`). Both tokens are ink on white at
 * AA, so red reads as a deliberate open item rather than an alert box — and the
 * stage icon and term stay neutral so only the state itself carries colour.
 *
 * The rows stack rather than sitting side by side: a card in this grid runs
 * 260–400px wide, and "Not generated" plus its icon needs ~120px, so two
 * columns would wrap the state mid-phrase at the narrow end of that range.
 */
function StageStatus({ icon: Icon, label, generated, className }) {
  const StateIcon = generated ? CheckCircle : XCircle
  const tone = generated ? 'var(--color-success)' : 'var(--color-danger)'

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Icon
        size={21}
        weight="regular"
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-[var(--tone-muted)]"
      />

      <div className="min-w-0 flex-1">
        <p className="label-ui text-[var(--tone-muted)]">{label}</p>

        <p
          className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
          style={{ color: tone }}
        >
          <StateIcon size={14} weight="fill" aria-hidden="true" className="shrink-0" />
          {generated ? 'Generated' : 'Not generated'}
        </p>
      </div>
    </div>
  )
}

/**
 * A project in the library grid — /dashboard/projects.
 *
 * 2-Column Wide Card Layout:
 * - Upper identity: Technical blueprint plate, project ID eyebrow, bold project title, independent Delete action
 * - Middle status: 2-Column horizontal grid with larger 3D Rendering and BoQ icon tiles & right-aligned text
 * - Lower footer: Full-width Open Project link with animated arrow
 */
export default function ProjectCard({ project, onDelete, className }) {
  const { id, name, has3DRender = false, hasBoQ = false } = project

  const rendered = Boolean(has3DRender)
  const priced = Boolean(hasBoQ)

  return (
    <article
      className={cn(
        'group relative flex h-full w-full flex-col bg-white',
        'border border-[var(--tone-line)] shadow-[0_2px_12px_rgba(7,20,38,0.03)]',
        'transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        'hover:-translate-y-0.5 hover:border-[var(--color-brand-deep)]/45 hover:shadow-[0_8px_24px_rgba(7,20,38,0.06)] motion-reduce:hover:translate-y-0',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--color-brand-deep)]',
        className,
      )}
    >
      {/* Top Setting-Out Accent Line */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-px left-0 h-[3px] w-12 bg-[var(--color-brand-deep)]',
          'transition-[width] duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'group-hover:w-28',
        )}
      />

      {/* ── Upper Identity Zone ── */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <TechnicalIconFrame icon={Blueprint} size={64} iconSize={30} interactive />

          <div className="min-w-0">
            <p className="label-ui truncate tabular-nums text-[var(--tone-muted)]">{id}</p>

            <h3
              className={cn(
                'mt-1 line-clamp-1 text-[1.25rem] font-bold uppercase leading-tight tracking-[-0.02em]',
                'break-words text-[var(--tone-ink)] sm:text-[1.375rem] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1',
              )}
              style={{ fontFamily: 'var(--font-display)' }}
              title={name}
            >
              {name}
            </h3>
          </div>
        </div>

        {/* Destructive Delete Action */}
        <button
          type="button"
          onClick={() => onDelete?.(project)}
          aria-label={`Delete ${name}`}
          className={cn(
            'relative z-10 -mr-1 -mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center',
            'touch:h-11 touch:w-11',
            'text-[var(--tone-muted)]/70 transition-colors duration-200 motion-reduce:transition-none',
            'hover:bg-[var(--color-danger)]/[0.07] hover:text-[var(--color-danger)]',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
          )}
        >
          <Trash size={18} weight="regular" aria-hidden="true" />
        </button>
      </div>

      {/* ── Middle Status Zone: 2-Column Horizontal Layout with Larger Icons ── */}
      <div className="mx-6 mt-5 grid grid-cols-1 gap-4 border-t border-[var(--tone-line)] py-4 sm:mx-8 sm:grid-cols-2 sm:gap-6 sm:py-5">
        <StageStatus icon={Cube} label="3D Rendering" generated={rendered} />
        <StageStatus
          icon={ClipboardText}
          label="BoQ"
          generated={priced}
          className="sm:border-l sm:border-[var(--tone-line)] sm:pl-6"
        />
      </div>

      {/* ── Lower Action: Full-Width Open Project Link ── */}
      <Link
        to={`/dashboard/projects/${id}`}
        aria-label={`Open project ${name}`}
        className={cn(
          'label-ui mx-6 flex min-h-12 items-center justify-between gap-3 border-t border-[var(--tone-line)] pb-4 pt-3.5 sm:mx-8',
          'text-[var(--tone-ink)] transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'group-hover:text-[var(--color-brand-deep)] focus-visible:outline-none',
        )}
      >
        <span aria-hidden="true" className="absolute inset-0" />

        <span className="font-semibold uppercase tracking-wider">Open project</span>
        <ArrowRight
          size={16}
          weight="bold"
          aria-hidden="true"
          className="shrink-0 text-[var(--color-brand-deep)] transition-transform duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none group-hover:translate-x-1"
        />
      </Link>
    </article>
  )
}
