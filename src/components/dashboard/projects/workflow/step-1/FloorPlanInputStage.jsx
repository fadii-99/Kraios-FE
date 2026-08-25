import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import FloorPlanBrief from '@/components/dashboard/projects/workflow/step-1/FloorPlanBrief'
import FloorPlanModeToggle from '@/components/dashboard/projects/workflow/step-1/FloorPlanModeToggle'
import GenerateFloorPlanPanel from '@/components/dashboard/projects/workflow/step-1/GenerateFloorPlanPanel'
import UploadFloorPlanPanel from '@/components/dashboard/projects/workflow/step-1/UploadFloorPlanPanel'
import {
  FLOOR_PLAN_MODES,
  GENERATE_BRIEF,
  MODE_LOCK_MESSAGES,
  UPLOAD_BRIEF,
  lockedModeForSource,
  modeForSource,
} from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { useFloorPlanSource } from '@/lib/dashboard/projects/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { showInfoToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 1 — the 2D floor-plan input workspace.
 *
 * One workspace, two columns: the brief on the left, the live work surface on
 * the right, divided by a single hairline rather than split into two competing
 * cards. 5/12 · 7/12 (≈42% · 58%) from `lg`, stacked below it — at 1024 the
 * workspace has already given up the sidebar's width, and a narrower left rail
 * would start breaking the display heading badly.
 *
 * Everything about which mode is live, and which is unavailable, derives from
 * ONE value — the project's floor-plan source. There is no second boolean to
 * fall out of step with it:
 *
 *   source === null            → both modes open
 *   source.type === 'upload'   → Generate locked until the file is removed
 *   source.type === 'generated'→ Upload locked until the plan is cleared
 *
 * Clicking a locked mode never discards what the user has. It explains itself
 * and leaves the source alone; removal is always deliberate.
 */
export default function FloorPlanInputStage({ projectId }) {
  const [source, setSource] = useFloorPlanSource(projectId)

  /**
   * The mode is DERIVED, never mirrored into state: a source always shows in
   * its own mode — including one restored from the store after stepping away to
   * 3D Rendering and back — and `chosenMode` only decides which side the user
   * lands on while nothing is active. Syncing these with an effect would mean a
   * cascading render and two values that can disagree for one frame.
   */
  const [chosenMode, setChosenMode] = useState(FLOOR_PLAN_MODES.upload)

  // The brief survives a trip through Upload mode and comes back with
  // Regenerate, so it is held here rather than inside the composer.
  const [prompt, setPrompt] = useState('')

  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const mode = source ? modeForSource(source) : chosenMode
  const lockedMode = lockedModeForSource(source)
  const isUpload = mode === FLOOR_PLAN_MODES.upload

  const handleModeChange = (next) => {
    if (next === mode) return

    if (lockedMode === next) {
      const msg = MODE_LOCK_MESSAGES[lockedMode]
      if (msg) showInfoToast(msg, { id: 'locked-mode-notice' })
      return
    }

    setChosenMode(next)
  }

  // Smooth buttery transition when switching mode or source
  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-stage-panel]',
        { opacity: 0.25, y: 4 },
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          ease: 'power2.out',
        },
      )

      gsap.fromTo(
        '[data-preview-reveal]',
        { opacity: 0.3, scale: 0.995 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.36,
          ease: 'power2.out',
        },
      )
    },
    { scope, dependencies: [reduced, mode, source?.type ?? 'none', source?.addedAt ?? 0] },
  )

  const brief = isUpload ? UPLOAD_BRIEF : GENERATE_BRIEF

  return (
    <div ref={scope} className="my-auto flex w-full flex-1 flex-col justify-center py-1 sm:py-2">
      <FloorPlanModeToggle
        mode={mode}
        lockedMode={lockedMode}
        onModeChange={handleModeChange}
        className="-mt-3 sm:-mt-4 lg:-mt-5 mb-8 sm:mb-9 lg:mb-10 shrink-0"
      />

      <div
        data-stage-panel
        className="grid w-full flex-1 items-center gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-10"
      >
        <FloorPlanBrief
          eyebrow={brief.eyebrow}
          headingLines={brief.headingLines}
          paragraph={brief.paragraph}
          points={brief.points}
          onSwitchToGenerate={() => handleModeChange(FLOOR_PLAN_MODES.generate)}
          onSwitchToUpload={() => handleModeChange(FLOOR_PLAN_MODES.upload)}
          showGeneratePrompt={isUpload}
          className="w-full lg:col-span-5 xl:col-span-5"
        />

        <div className="flex w-full min-w-0 flex-1 flex-col justify-center lg:col-span-7 xl:col-span-7">
          {isUpload ? (
            <UploadFloorPlanPanel source={source} onSourceChange={setSource} />
          ) : (
            <GenerateFloorPlanPanel
              source={source}
              prompt={prompt}
              onPromptChange={setPrompt}
              onSourceChange={setSource}
            />
          )}
        </div>
      </div>
    </div>
  )
}
