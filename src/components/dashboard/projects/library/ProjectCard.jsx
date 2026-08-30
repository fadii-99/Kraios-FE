import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarBlank,
  Trash,
} from '@phosphor-icons/react'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import Logo from '@/components/ui/Logo'
import { projectResumePath } from '@/lib/dashboard/projects/projectShape'
import { formatProjectDate } from '@/lib/date'
import { cn } from '@/lib/cn'

/*
 * High-clarity architectural stage status module (Commented out for now)
function StageStatusTile({
  icon: Icon,
  label,
  description,
  iconTheme = 'blue',
  generated,
  className,
}) {
  const themeStyles = {
    blue: {
      idle: 'border-blue-500/30 bg-blue-500/10 text-blue-600 shadow-xs',
      active: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-600 shadow-xs',
    },
    amber: {
      idle: 'border-amber-500/30 bg-amber-500/10 text-amber-600 shadow-xs',
      active: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-600 shadow-xs',
    },
  }

  const currentTheme = themeStyles[iconTheme] || themeStyles.blue
  const iconBoxStyle = generated ? currentTheme.active : currentTheme.idle

  return (
    <div
      className={cn(
        'group/tile relative flex flex-col justify-between rounded-md p-4 transition-all duration-300',
        generated
          ? 'border border-emerald-500/35 bg-gradient-to-b from-emerald-500/[0.06] to-emerald-500/[0.02] shadow-[0_2px_12px_rgba(10,108,72,0.05)]'
          : 'border border-[var(--tone-line)] bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50/95',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-colors duration-200 border',
            iconBoxStyle,
          )}
        >
          <Icon size={20} weight={generated ? 'fill' : 'duotone'} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className="text-[0.9375rem] font-bold uppercase tracking-tight text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {label}
          </h4>
          <p className="mt-0.5 text-[0.75rem] leading-tight text-[var(--tone-muted-dark)]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-3.5 border-t border-[var(--tone-line)]/60 pt-2.5">
        {generated ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-emerald-700 shadow-xs">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <CheckCircle size={13} weight="fill" className="shrink-0 text-emerald-600" aria-hidden="true" />
            Generated
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-slate-500 shadow-2xs">
            <XCircle size={13} weight="bold" className="shrink-0 text-slate-400" aria-hidden="true" />
            Not generated
          </div>
        )}
      </div>
    </div>
  )
}
*/

/**
 * A project card in the library grid — /dashboard/projects.
 *
 * Premium Architectural Card Layout:
 * - Dynamic setting-out accent line (emerald on complete, blue on active, subtle on initial)
 * - Upper identity: Technical Kraios Logo plate, project ID chip + Creation Date, bold project title, independent Delete action
 * - Lower footer: Full-width Open Workspace interactive action with animated arrow badge
 */
export default function ProjectCard({ project, onDelete, className }) {
  const { id, name, createdAt, has3DRender = false, hasBoQ = false } = project

  const rendered = Boolean(has3DRender)
  const priced = Boolean(hasBoQ)
  const isFullyReady = rendered && priced
  const dateFormatted = formatProjectDate(createdAt)

  /**
   * Project ids are backend UUIDs now. The chip shows the leading segment,
   * which is enough to tell two cards apart and to quote in a support message,
   * where a full 36-character id would wrap the whole identity row.
   */
  const idLabel = `#${String(id).split('-')[0]}`

  /**
   * Where "Open Workspace" goes: the stage the BACKEND says this project is on
   * (`workflow_state.current_step`), not the first stage and not whatever the
   * browser last remembered. Reopening a project resumes it.
   */
  const resumeTo = projectResumePath(project)

  return (
    <article
      className={cn(
        'group relative flex h-full w-full flex-col justify-between rounded-md bg-white',
        'border border-[var(--tone-line)] shadow-[0_2px_14px_rgba(7,20,38,0.04)]',
        'transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        'hover:-translate-y-1 hover:border-[var(--color-brand-deep)]/45 hover:shadow-[0_14px_36px_rgba(7,20,38,0.08)] motion-reduce:hover:translate-y-0',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--color-brand-deep)]',
        className,
      )}
    >
      {/* Top Setting-Out Accent Line */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-px left-0 h-[3px] rounded-tl-md',
          'transition-[width,background-color] duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          isFullyReady
            ? 'w-16 bg-emerald-500 shadow-[0_0_8px_rgba(10,108,72,0.35)] group-hover:w-32'
            : rendered
              ? 'w-14 bg-[var(--color-brand-deep)] shadow-[0_0_8px_rgba(11,94,215,0.25)] group-hover:w-28'
              : 'w-12 bg-[var(--color-brand-deep)]/40 group-hover:w-24 group-hover:bg-[var(--color-brand-deep)]',
        )}
      />

      {/* ── Upper Identity Zone ── */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
        <div className="flex items-start gap-4 sm:gap-5">
          <TechnicalIconFrame
            size={72}
            interactive
            accent={isFullyReady ? 'var(--color-success)' : 'var(--color-brand-deep)'}
          >
            <Logo size="nav" imageClassName="h-10 w-10 sm:h-11 sm:w-11 object-contain" />
          </TechnicalIconFrame>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-ui inline-flex items-center rounded-xs border border-slate-200 bg-slate-100/90 px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.14em] text-[var(--tone-muted-dark)]">
                {idLabel}
              </span>

              {dateFormatted && (
                <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-[var(--tone-muted-dark)]">
                  <CalendarBlank size={12} weight="bold" className="text-slate-400" />
                  <span>{dateFormatted}</span>
                </span>
              )}
            </div>

            <h3
              className={cn(
                'mt-2 line-clamp-2 text-[1.375rem] font-bold uppercase leading-tight tracking-[-0.02em]',
                'break-words text-[var(--tone-ink)] sm:text-[1.5rem] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-0.5',
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
            'relative z-10 -mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm',
            'touch:h-11 touch:w-11',
            'text-[var(--tone-muted)]/70 transition-all duration-200 motion-reduce:transition-none',
            'hover:border hover:border-red-500/25 hover:bg-red-500/10 hover:text-[var(--color-danger)]',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
          )}
        >
          <Trash size={18} weight="regular" aria-hidden="true" />
        </button>
      </div>

      {/* ── Middle Status Zone (Commented out for now as requested) ── */}
      {/*
      <div className="mx-6 mt-6 grid grid-cols-1 gap-3.5 sm:mx-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StageStatusTile
          icon={Cube}
          iconTheme="blue"
          label="3D Rendering"
          description="3D architectural model & views"
          generated={rendered}
        />
        <StageStatusTile
          icon={ClipboardText}
          iconTheme="amber"
          label="BoQ Costing"
          description="Bill of quantities & materials"
          generated={priced}
        />
      </div>
      */}

      {/* ── Lower Action: Full-Width Open Project Link ── */}
      <div className="mt-8 border-t border-[var(--tone-line)]">
        <Link
          to={resumeTo}
          aria-label={`Open project ${name}`}
          className={cn(
            'label-ui mx-6 flex min-h-12 items-center justify-between gap-3 py-3.5 sm:mx-8',
            'text-[var(--tone-ink)] transition-colors duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
            'group-hover:text-[var(--color-brand-deep)] focus-visible:outline-none',
          )}
        >
          <span aria-hidden="true" className="absolute inset-0" />

          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-[0.75rem]">Open Workspace</span>
            <span className="text-[0.6875rem] text-[var(--tone-muted)] font-normal tracking-normal lowercase">
              · 4 stages flow
            </span>
          </div>

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-slate-200/80 bg-slate-100/90 text-[var(--color-brand-deep)] transition-all duration-300 ease-[var(--ease-out-expo)] group-hover:border-[var(--color-brand-deep)]/40 group-hover:bg-[var(--color-brand-deep)] group-hover:text-white group-hover:translate-x-1">
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </article>
  )
}

