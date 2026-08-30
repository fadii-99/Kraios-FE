import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import OutputHeader from '@/components/dashboard/projects/workflow/step-4/OutputHeader'
import OutputDeliverablesTabs from '@/components/dashboard/projects/workflow/step-4/OutputDeliverablesTabs'
import Output3DRendersSection from '@/components/dashboard/projects/workflow/step-4/Output3DRendersSection'
import Output2DPlansSection from '@/components/dashboard/projects/workflow/step-4/Output2DPlansSection'
import OutputBoQSection from '@/components/dashboard/projects/workflow/step-4/OutputBoQSection'
import OutputDocumentsSection from '@/components/dashboard/projects/workflow/step-4/OutputDocumentsSection'
import OutputBoQModal from '@/components/dashboard/projects/workflow/step-4/OutputBoQModal'
import FloorPlanFullscreenModal from '@/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal'

import {
  useBoqAssistant,
  useDesignAssistant,
  useFloorPlanSource,
  useProjects,
} from '@/lib/dashboard/projects/projectsContext'
import { approvedResult } from '@/lib/dashboard/workflow/step-2/designAssistantSelectors'
import { approvedBoqResult } from '@/lib/dashboard/workflow/step-3/boqAssistantSelectors'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 4 — Kraios Project Deliverables Output Stage.
 *
 * Master deliverables workspace with horizontal tabs, quick download cards,
 * 3D Renders gallery, 2D Plans, BoQ costing table, and supporting project documents.
 */
export default function OutputStage({ projectId }) {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || 'Project-Deliverables'

  // Stage 1: 2D Floor Plan Source
  const [source] = useFloorPlanSource(projectId)

  // Stage 2: Approved 3D Design
  const [assistant] = useDesignAssistant(projectId)
  const approvedRender = approvedResult(assistant)

  // Stage 3: Approved BoQ
  const [boqState] = useBoqAssistant(projectId)
  const finalizedBoq = approvedBoqResult(boqState)
  const uploadedDocs = boqState?.uploadedDocuments || []

  // Active Tab state (default: 'all')
  const [activeTab, setActiveTab] = useState('all')

  // Lightbox Modal state
  const [previewSource, setPreviewSource] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // BoQ Full Modal state
  const [boqModalOpen, setBoqModalOpen] = useState(false)

  const handleOpenPreview = (itemSource) => {
    setPreviewSource(itemSource)
    setPreviewOpen(true)
  }

  const finalBoqRows = finalizedBoq?.rows ?? []

  // Deliverable Counts for Tabs
  const counts = {
    all: 45,
    renders: 18,
    plans: 2,
    boq: 1,
    documents: uploadedDocs.length || 24,
  }

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
    { scope, dependencies: [reduced, projectId, activeTab] },
  )

  return (
    <div
      ref={scope}
      className="flex w-full flex-1 flex-col pt-6 sm:pt-8 pb-20 sm:pb-28 px-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[88rem] space-y-10 sm:space-y-12 lg:space-y-14">
        {/* ── 1. Page Hero Banner & Quick Downloads Center ── */}
        <div data-output-section>
          <OutputHeader
            projectName={projectName}
            plan2DSource={source}
            render3DSource={approvedRender}
            boqRows={finalBoqRows}
            uploadedDocs={uploadedDocs}
            renderCount={counts.renders}
            planCount={counts.plans}
          />
        </div>

        {/* ── 2. Horizontal Deliverables Tabs Navigation Bar ── */}
        <div data-output-section>
          <OutputDeliverablesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>

        {/* ── 3. Deliverables Sections Content ── */}
        {(activeTab === 'all' || activeTab === 'renders') && (
          <div data-output-section>
            <Output3DRendersSection
              render3DSource={approvedRender}
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
                  plan2DSource={source}
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
                  boqResult={finalizedBoq}
                  onOpenFullModal={() => setBoqModalOpen(true)}
                />
              </div>
            )}
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'documents') && (
          <div data-output-section>
            <OutputDocumentsSection
              documents={uploadedDocs}
            />
          </div>
        )}
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
