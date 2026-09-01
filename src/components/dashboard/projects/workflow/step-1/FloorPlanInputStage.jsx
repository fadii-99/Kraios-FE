import { useCallback, useEffect, useRef, useState } from 'react'
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
import { uploadFloorPlan } from '@/lib/api/projects'
import {
  CACHE_KEYS,
  useFloorPlanSource,
  useProjects,
  useStep1Data,
} from '@/lib/dashboard/projects/projectsContext'
import { projectStagePath } from '@/lib/dashboard/workflow/projectWorkflow'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 1 — the 2D floor-plan input workspace.
 *
 * Supports independent addressable routes (/upload vs /generate) and full-page
 * processing loader on upload.
 */
export default function FloorPlanInputStage({ projectId, defaultMode }) {
  // Step 1's own data request: the conversation and version history that say
  // which plan this project is currently working from.
  const step1 = useStep1Data(projectId)
  const reloadStep1 = step1.reload
  const { refreshProject, invalidateStep } = useProjects()
  const source = useFloorPlanSource(projectId)

  const [isProcessing, setIsProcessing] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    return () => {
      activeRef.current = false
    }
  }, [])

  /**
   * The real upload.
   *
   * `POST /step-1/upload/` creates a completed version, approves it and moves
   * the project to Step 2 — so the navigation waits on the refetched project
   * confirming `step_1_complete` rather than on a timer. The loader covers
   * actual work, and a failure leaves the user on Step 1 with an explanation
   * instead of on a stage the backend does not think they have reached.
   */
  const handleFileSelected = useCallback(
    async (file) => {
      if (isProcessing) return

      setIsProcessing(true)

      try {
        await uploadFloorPlan(projectId, file)

        // The version list changed, so Step 1's cache is stale; the project
        // changed, so its workflow state is too.
        invalidateStep(CACHE_KEYS.step1(projectId))
        const project = await refreshProject(projectId)
        if (!activeRef.current) return

        showSuccessToast('Floor plan uploaded.', { id: 'upload-success' })

        if (project?.workflowState?.step_1_complete) {
          navigate(projectStagePath(projectId, 'rendering'))
          return
        }

        // Uploaded, but the backend has not marked Step 1 complete. Staying put
        // is the honest answer — the stage reloads and shows what it has.
        setIsProcessing(false)
        reloadStep1().catch(() => {})
      } catch (thrown) {
        if (!activeRef.current) return
        setIsProcessing(false)
        showErrorToast(thrown?.message || 'That floor plan could not be uploaded.', {
          id: 'upload-failed',
        })
      }
    },
    [invalidateStep, isProcessing, navigate, projectId, refreshProject, reloadStep1],
  )

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

  // Held while Step 1's own data is still arriving, so the stage cannot show
  // "no plan yet" to a project that in fact has one.
  if (step1.isLoading) {
    return (
      <div className="relative flex h-full min-h-[500px] w-full flex-1 flex-col items-center justify-center overflow-hidden bg-white my-auto">
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <PageLoader variant="inline" label="Loading Floor Plan" className="my-auto" />
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="relative flex h-full min-h-[500px] w-full flex-1 flex-col items-center justify-center overflow-hidden bg-white my-auto">
        <DashboardBlueprintField />
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <PageLoader
            variant="inline"
            label="UPLOADING FLOOR PLAN..."
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
              onFileSelected={handleFileSelected}
              disabled={isProcessing}
            />
          ) : (
            <GenerateFloorPlanPanel projectId={projectId} source={source} />
          )}
        </div>
      </div>
    </div>
  )
}
