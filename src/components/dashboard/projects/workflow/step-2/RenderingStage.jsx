import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ArrowRight, CircleDashed, CircleNotch } from '@phosphor-icons/react'

import ApprovedDesignSheet from '@/components/dashboard/projects/workflow/step-2/ApprovedDesignSheet'
import DesignAssistantGateway from '@/components/dashboard/projects/workflow/step-2/DesignAssistantGateway'
import { RENDERING_COPY } from '@/lib/dashboard/workflow/step-2/designAssistantConfig'
import {
  approvedResult,
  renderingStatusNote,
} from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import PageLoader from '@/components/ui/PageLoader'
import {
  useDesignAssistant,
  useFloorPlanSource,
  useStep1Data,
  useStep2Data,
} from '@/lib/dashboard/projects/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { designAssistantPath } from '@/lib/dashboard/workflow/projectWorkflow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Step 2 — the normal stage, deliberately the calm half of this feature.
 *
 * It is a GATEWAY plus a state, and nothing else. It does not contain the
 * assistant: the conversation, the renders and the approval all happen at
 * `…/rendering/assistant`. Its whole job is to say what Step 2 does, show what
 * it will generate from, show whether a design has been signed off, and open
 * the workspace where the work is done.
 *
 * ONE CENTRED COMPOSITION, not a grid. This stage used to be 7/12 + 5/12 — an
 * entry panel on the left, a reference card and a status card stacked on the
 * right — which is exactly how a focused step turns into a dashboard of
 * widgets. The reference plan and the approval state are now cells of the
 * sheet's own title block, so there is one subject on the page instead of
 * three competing ones.
 *
 * TWO states, driven by the one shared Step 2 state and nothing else:
 *
 *   no approved render → the gateway, and the BoQ gate stated under it
 *   approved render    → the approved design becomes the subject, the CTA
 *                        steps back to the outline variant, and BoQ opens
 *
 * `max-w-[52rem]` is the composition's own measure: at 1280 the workspace has
 * already given up the sidebar and the surface gutters, leaving ~950px, so this
 * keeps a real margin either side instead of running edge to edge — and at 1920
 * it stops the sheet from stretching into a banner.
 */
export default function RenderingStage({ projectId }) {
  // The gateway's two facts are backend state: which 2D plan this project works
  // from, and whether a 3D design has been approved. Each step owns its own
  // request, and both are cached, so returning from the assistant costs
  // nothing.
  const step1 = useStep1Data(projectId)
  const step2 = useStep2Data(projectId)

  const source = useFloorPlanSource(projectId)
  const [assistant] = useDesignAssistant(projectId)

  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const approved = approvedResult(assistant)
  const assistantPath = designAssistantPath(projectId)

  /**
   * The line under the sheet, read from real state rather than fixed. A stage
   * telling the user to "approve a design" while a generation is running, or
   * while renders are already waiting unapproved, is describing a situation
   * they are not in.
   */
  const note = renderingStatusNote(assistant)

  // Held while either half is still arriving: showing "no design approved" to a
  // project that has one is worse than showing a loader for a moment.
  const loading = step1.isLoading || step2.isLoading

  // One restrained settle, re-run when the stage changes state so returning
  // from the assistant with an approval reads as the page resolving.
  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-stage-reveal]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        {
          opacity: 1,
          y: 0,
          duration: DASHBOARD_MOTION.duration,
          ease: DASHBOARD_MOTION.ease,
          stagger: DASHBOARD_MOTION.stagger,
        },
      )
    },
    { scope, dependencies: [reduced, approved?.id ?? 'none', loading] },
  )

  return (
    <div
      ref={scope}
      className="flex w-full flex-1 flex-col justify-center py-2 sm:py-3.5"
    >
      {/* A BLOCK, not a flex column. `FloorPlanWorkArea` carries `flex-1`, and
          in a flex parent the sheet would stretch and unstick its title block
          from the drawing above it. The small bottom pad is optical centring —
          a composition sitting on the true centre line reads low. */}
      <div className="mx-auto w-full max-w-[64rem] lg:max-w-[68rem] pt-2 sm:pt-3 pb-4 sm:pb-8">
        {loading ? (
          <PageLoader variant="inline" label="Loading 3D Rendering" className="min-h-56" />
        ) : (
          <div data-stage-reveal>
            <DesignAssistantGateway
              source={source}
              to={assistantPath}
              note={note}
              approved={Boolean(approved)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The one line under the sheet.
 *
 * Four states, one row — the BoQ gate, a live generation, renders waiting
 * unapproved, and the route onward once a design is signed off. A sentence with
 * a mark, never a status card: the approval state itself is already stamped in
 * the title block, and saying it twice at panel weight is what made this page
 * feel cluttered.
 */
const NOTE_MARKS = {
  busy: { icon: CircleNotch, tone: 'text-[var(--color-brand-deep)]', spin: true },
  pending: { icon: CircleDashed, tone: 'text-[var(--tone-muted)]' },
  idle: { icon: CircleDashed, tone: 'text-[var(--tone-muted)]' },
  onward: { icon: ArrowRight, tone: 'text-[var(--color-brand-deep)]' },
}

function StageNote({ kind = 'idle', children, ...rest }) {
  const mark = NOTE_MARKS[kind] || NOTE_MARKS.idle
  const Icon = mark.icon

  return (
    <p
      className="mt-3.5 flex items-center justify-center gap-2 text-center text-[0.75rem] leading-snug text-[var(--tone-muted-dark)] sm:text-[0.8125rem]"
      aria-live={kind === 'busy' ? 'polite' : undefined}
      {...rest}
    >
      <Icon
        size={14}
        weight="bold"
        aria-hidden="true"
        className={cn(
          'shrink-0',
          mark.tone,
          mark.spin && 'animate-spin motion-reduce:animate-none',
        )}
      />
      <span>{children}</span>
    </p>
  )
}
