import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import OutputHeader from '@/components/dashboard/projects/workflow/step-4/OutputHeader'
import PlansAndRendersSection from '@/components/dashboard/projects/workflow/step-4/PlansAndRendersSection'
import FinalBoQSection from '@/components/dashboard/projects/workflow/step-4/FinalBoQSection'
import UploadedDocumentsSection from '@/components/dashboard/projects/workflow/step-4/UploadedDocumentsSection'
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
 * The definitive project handoff workspace presenting the baseline 2D floor plan,
 * approved 3D design, finalized BoQ table, and supporting project documents.
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

  /**
   * Stage 3 — the FINALIZED BoQ, and only that.
   *
   * "Finalized" means one thing here: a BoQ the user explicitly approved in
   * Step 3. This used to fall back to `latestBoqResult`, which quietly promoted
   * an unreviewed draft into the deliverables package the moment one existed —
   * an approval nobody gave, on the one artefact in the product that carries
   * money. A draft is not a deliverable, so when there is no approved BoQ there
   * is no final BoQ, and the section says so.
   *
   * BoQ is an OPTIONAL stage (`Skip to Output` is a supported path), so this is
   * a normal state rather than an error, and everything else on the page —
   * plans, renders, documents, the ZIP — works without it.
   */
  const [boqState] = useBoqAssistant(projectId)
  const finalizedBoq = approvedBoqResult(boqState)
  const uploadedDocs = boqState?.uploadedDocuments || []

  // Shared Lightbox Modal state (Reuses FloorPlanFullscreenModal)
  const [previewSource, setPreviewSource] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleOpenPreview = (itemSource) => {
    setPreviewSource(itemSource)
    setPreviewOpen(true)
  }

  /**
   * Rows for the table and the ZIP. Empty when nothing is finalized, which is
   * what keeps an unapproved draft out of the downloaded package: the bundler
   * only writes `boq/…csv` when it is handed rows.
   */
  const finalBoqRows = finalizedBoq?.rows ?? []

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
          stagger: 0.09,
        },
      )
    },
    { scope, dependencies: [reduced, projectId] },
  )

  return (
    <div
      ref={scope}
      className="flex w-full flex-1 flex-col pt-3 sm:pt-4 pb-10 sm:pb-12"
    >
      <div className="mx-auto w-full max-w-[64rem] lg:max-w-[70rem] space-y-7 sm:space-y-8">

        {/* ── 1. Page Header & Primary ZIP Download CTA ── */}
        <div data-output-section>
          <OutputHeader
            projectName={projectName}
            plan2DSource={source}
            render3DSource={approvedRender}
            boqRows={finalBoqRows}
            uploadedDocs={uploadedDocs}
          />
        </div>


        {/* ── 2. Plans & Renders (2D Floor Plan + Approved 3D Design) ── */}
        <div data-output-section>
          <PlansAndRendersSection
            plan2DSource={source}
            render3DSource={approvedRender}
            onViewSource={handleOpenPreview}
          />
        </div>

        {/* ── 3. Final BoQ Table & CSV Export ── */}
        <div data-output-section>
          {/* `boqResult` is the approved BoQ or null — the section reads
              nothing else, so there is no second approval flag to disagree. */}
          <FinalBoQSection
            projectName={projectName}
            boqResult={finalizedBoq}
          />
        </div>

        {/* ── 4. Uploaded Supporting Documents List ── */}
        <div data-output-section>
          <UploadedDocumentsSection
            documents={uploadedDocs}
            onViewSource={handleOpenPreview}
          />
        </div>
      </div>

      {/* ── Reusable Fullscreen Lightbox Preview Modal ── */}
      <FloorPlanFullscreenModal
        source={previewSource}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
