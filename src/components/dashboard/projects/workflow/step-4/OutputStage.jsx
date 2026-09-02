import { useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import OutputHeader from '@/components/dashboard/projects/workflow/step-4/OutputHeader'
import OutputDeliverablesTabs from '@/components/dashboard/projects/workflow/step-4/OutputDeliverablesTabs'
import Output3DRendersSection from '@/components/dashboard/projects/workflow/step-4/Output3DRendersSection'
import Output2DPlansSection from '@/components/dashboard/projects/workflow/step-4/Output2DPlansSection'
import OutputBoQSection from '@/components/dashboard/projects/workflow/step-4/OutputBoQSection'
import OutputDocumentsSection from '@/components/dashboard/projects/workflow/step-4/OutputDocumentsSection'
import OutputBoQModal from '@/components/dashboard/projects/workflow/step-4/OutputBoQModal'
import OutputFinishBar from '@/components/dashboard/projects/workflow/step-4/OutputFinishBar'
import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'
import PageLoader from '@/components/ui/PageLoader'

import { useProject, useProjectOutput } from '@/lib/dashboard/projects/projectsContext'
import {
  completedVersions as completedPlanVersions,
  versionToResult as planVersionToResult,
} from '@/lib/dashboard/workflow/step-1/floorPlanAdapters'
import { sourceFromApprovedVersion } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import {
  completedVersions as completedRenderVersions,
  versionToResult as renderVersionToResult,
} from '@/lib/dashboard/workflow/step-2/designAdapters'
import {
  documentsToRecords,
  versionToResult as boqVersionToResult,
} from '@/lib/dashboard/workflow/step-3/boqAdapters'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 4 — Kraios Project Deliverables Output Stage.
 *
 * ONE request builds this page: `GET /projects/{id}/output/` returns the
 * project, a summary, and the floor plans, 3D renders, BOQ versions and
 * documents together. Nothing here reassembles the stage from four separate
 * step caches, and nothing here re-derives what was approved: the backend marks
 * the approved item with `selected: true`, and that is what the "Approved"
 * cards read.
 *
 * Every count on the page is COUNTED. It used to declare 45 deliverables — 18
 * renders, 2 plans, 1 BoQ, 24 documents — as constants regardless of what the
 * project contained; a project with one render now says one.
 */
export default function OutputStage({ projectId }) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const project = useProject(projectId)
  const output = useProjectOutput(projectId)
  const projectName = project?.name || output.data?.project?.name || 'Project-Deliverables'

  // Active Tab state (default: 'all')
  const [activeTab, setActiveTab] = useState('all')

  // Lightbox Modal state
  const [previewSource, setPreviewSource] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // BoQ Full Modal state
  const [boqModalOpen, setBoqModalOpen] = useState(false)

  /**
   * The whole page's data, derived once from the output bundle.
   *
   * `selected` is the backend's approval mark. A draft is not a deliverable, so
   * an unapproved BoQ is not shown under an approved badge and not exported —
   * "no finalized BoQ" is a normal state, because BoQ is optional.
   */
  const deliverables = useMemo(() => {
    const payload = output.data

    const planVersions = payload?.floor_plans ?? []
    const renderVersions = payload?.three_d_renders ?? []
    const boqVersions = payload?.boq_versions ?? []
    const documents = payload?.documents ?? []

    const selectedPlan = planVersions.find((version) => version.selected)
    const selectedRender = renderVersions.find((version) => version.selected)
    const selectedBoq = boqVersions.find((version) => version.selected)

    const summary = payload?.summary ?? {}

    return {
      source: selectedPlan
        ? sourceFromApprovedVersion(planVersionToResult(selectedPlan, projectId))
        : null,
      planVersions: completedPlanVersions(planVersions, projectId).map((version) => ({
        ...version,
        name: version.assetName || 'Floor plan',
      })),
      approvedRender: selectedRender ? renderVersionToResult(selectedRender, projectId) : null,
      renderVersions: completedRenderVersions(renderVersions, projectId).map((version) => ({
        ...version,
        name: version.assetName || '3D render',
      })),
      finalizedBoq: selectedBoq ? boqVersionToResult(selectedBoq) : null,
      documents: documentsToRecords(documents, projectId),
      counts: {
        plans: summary.floor_plans ?? planVersions.length,
        renders: summary.three_d_renders ?? renderVersions.length,
        boq: summary.boq_versions ?? boqVersions.length,
        documents: summary.documents ?? documents.length,
        all:
          summary.total_deliverables ??
          planVersions.length + renderVersions.length + boqVersions.length + documents.length,
      },
    }
  }, [output.data, projectId])

  const handleOpenPreview = (itemSource) => {
    setPreviewSource(itemSource)
    setPreviewOpen(true)
  }

  const finalBoqRows = deliverables.finalizedBoq?.rows ?? []

  // GSAP Entrance Animation
  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-output-section]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        {
          opacity: 1,
          y: 0,
          duration: DASHBOARD_MOTION.durationFast,
          ease: DASHBOARD_MOTION.ease,
          stagger: 0.08,
        },
      )
    },
    { scope, dependencies: [reduced, projectId, activeTab, output.isReady] },
  )

  // Held while the bundle is in flight: an Output page rendered from nothing
  // would announce a project with no deliverables at all.
  if (output.isLoading) {
    return (
      <div className="flex w-full flex-1 items-center justify-center py-16">
        <PageLoader variant="inline" label="Loading Deliverables" />
      </div>
    )
  }

  return (
    <div
      ref={scope}
      className="flex w-full flex-1 flex-col pt-6 sm:pt-8 pb-20 sm:pb-28 px-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[88rem] space-y-10 sm:space-y-12 lg:space-y-14">
        {/* ── 1. Page Hero Banner & Quick Downloads Center ── */}
        <div data-output-section>
          <OutputHeader
            projectId={projectId}
            projectName={projectName}
            render3DSource={deliverables.approvedRender}
            boqCount={deliverables.counts.boq}
            docCount={deliverables.counts.documents}
            renderCount={deliverables.counts.renders}
            planCount={deliverables.counts.plans}
          />
        </div>

        {/* ── 2. Horizontal Deliverables Tabs Navigation Bar ── */}
        <div data-output-section>
          <OutputDeliverablesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={deliverables.counts}
          />
        </div>

        {/* ── 3. Deliverables Sections Content ── */}
        {(activeTab === 'all' || activeTab === 'renders') && (
          <div data-output-section>
            <Output3DRendersSection
              projectId={projectId}
              projectName={projectName}
              render3DSource={deliverables.approvedRender}
              versions={deliverables.renderVersions}
              onViewSource={handleOpenPreview}
            />
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'plans' || activeTab === 'boq') && (
          <div data-output-section className={activeTab === 'all' ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10' : ''}>
            {/* 2D Floor Plans */}
            {(activeTab === 'all' || activeTab === 'plans') && (
              <div className={activeTab === 'all' ? 'lg:col-span-6' : ''}>
                <Output2DPlansSection
                  plan2DSource={deliverables.source}
                  versions={deliverables.planVersions}
                  onViewSource={handleOpenPreview}
                />
              </div>
            )}

            {/* BoQ (Bill of Quantities) */}
            {(activeTab === 'all' || activeTab === 'boq') && (
              <div className={activeTab === 'all' ? 'lg:col-span-6' : ''}>
                <OutputBoQSection
                  projectId={projectId}
                  projectName={projectName}
                  boqResult={deliverables.finalizedBoq}
                  onOpenFullModal={() => setBoqModalOpen(true)}
                />
              </div>
            )}
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'documents') && (
          <div data-output-section>
            <OutputDocumentsSection
              projectId={projectId}
              projectName={projectName}
              documents={deliverables.documents}
            />
          </div>
        )}

        {/* ── 4. Close of the page: finish the project ── */}
        <div data-output-section>
          <OutputFinishBar projectId={projectId} />
        </div>
      </div>

      {/* ── Fullscreen Lightbox Preview Modal ── */}
      <FloorPlanFullscreenModal
        source={previewSource}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      {/* ── BoQ Inspection Fullscreen Modal ── */}
      <OutputBoQModal
        open={boqModalOpen}
        onClose={() => setBoqModalOpen(false)}
        projectName={projectName}
        rows={finalBoqRows}
      />
    </div>
  )
}
