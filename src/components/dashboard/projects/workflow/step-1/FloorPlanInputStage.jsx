import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import FloorPlanBrief from '@/components/dashboard/projects/workflow/step-1/FloorPlanBrief'
import FloorPlanModeToggle from '@/components/dashboard/projects/workflow/step-1/FloorPlanModeToggle'
import GenerateFloorPlanPanel from '@/components/dashboard/projects/workflow/step-1/GenerateFloorPlanPanel'
import UploadFloorPlanPanel from '@/components/dashboard/projects/workflow/step-1/UploadFloorPlanPanel'
import PageLoader from '@/components/ui/PageLoader'
import DashboardBlueprintField from '@/components/ui/DashboardBlueprintField'
import {
  FLOOR_PLAN_MODES,
  GENERATE_BRIEF,
  MODE_LOCK_MESSAGES,
  UPLOAD_BRIEF,
  lockedModeForSource,
  modeForSource,
} from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { useFloorPlanSource } from '@/lib/dashboard/projects/projectsContext'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showInfoToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 1 — the 2D floor-plan input workspace.
 *
 * Supports independent addressable routes (/upload vs /generate) and full-page
 * processing loader on upload.
 */
export default function FloorPlanInputStage({ projectId, defaultMode }) {
  const [source, setSource] = useFloorPlanSource(projectId)
  const [isProcessing, setIsProcessing] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const processingTimerRef = useRef(null)

  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const handleUploadSuccess = (newSource) => {
    setSource(newSource)
    setIsProcessing(true)

    if (processingTimerRef.current) clearTimeout(processingTimerRef.current)
    processingTimerRef.current = setTimeout(() => {
      navigate(projectStagePath(projectId, 'rendering'))
    }, 1400)
  }

  useEffect(() => {
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current)
    }
  }, [])

  const isGenerateRoute = location.pathname.includes('/generate')
  const routeMode = isGenerateRoute ? FLOOR_PLAN_MODES.generate : FLOOR_PLAN_MODES.upload
  const mode = defaultMode || (source ? modeForSource(source) : routeMode)
  const lockedMode = lockedModeForSource(source)
  const isUpload = mode === FLOOR_PLAN_MODES.upload

  const handleModeChange = (next) => {
    if (next === mode) return

    if (lockedMode === next) {
      const msg = MODE_LOCK_MESSAGES[lockedMode]
      if (msg) showInfoToast(msg, { id: 'locked-mode-notice' })
      return
    }

    navigate(projectStagePath(projectId, next))
  }

  // Smooth transition when switching mode or source
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

  if (isProcessing) {
    return (
      <div className="relative flex h-full min-h-[500px] w-full flex-1 flex-col items-center justify-center overflow-hidden bg-white my-auto">
        <DashboardBlueprintField />
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <PageLoader
            variant="inline"
            label="GOING TO 3D RENDERING STEP..."
            className="my-auto"
          />
        </div>
      </div>
    )
  }

  const brief = isUpload ? UPLOAD_BRIEF : GENERATE_BRIEF

  return (
    <div ref={scope} className="relative my-auto flex w-full flex-1 flex-col justify-center py-1 sm:py-2">
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
            <UploadFloorPlanPanel
              source={source}
              onSourceChange={setSource}
              onUploadSuccess={handleUploadSuccess}
            />
          ) : (
            <GenerateFloorPlanPanel
              projectId={projectId}
              source={source}
              onSourceChange={setSource}
            />
          )}
        </div>
      </div>
    </div>
  )
}
