import { OUTPUT_COPY, DEMO_ASSETS } from '@/lib/dashboard/workflow/step-4/outputConfig'
import OutputPlanCard from '@/components/dashboard/projects/workflow/step-4/OutputPlanCard'
import { downloadAssetUrl } from '@/lib/dashboard/workflow/step-4/outputDownloads'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

/**
 * Plans and 3D Renders Section — Dual presentation of the baseline 2D floor plan
 * and the approved 3D design deliverable.
 */
export default function PlansAndRendersSection({
  plan2DSource,
  render3DSource,
  onViewSource,
}) {
  // Handlers for 2D Plan
  const handleView2D = () => {
    onViewSource({
      previewUrl: plan2DSource?.previewUrl || plan2DSource?.imageUrl || DEMO_ASSETS.floorPlan2DUrl,
      imageUrl: plan2DSource?.imageUrl || plan2DSource?.previewUrl || DEMO_ASSETS.floorPlan2DUrl,
      name: plan2DSource?.name || DEMO_ASSETS.floorPlan2DName,
      extension: plan2DSource?.extension || 'SVG',
    })
  }

  /*
   * Success is reported only when the asset was actually fetched and saved.
   * `downloadAssetUrl` answers that question; it used to be asked nothing and
   * the toast celebrated regardless, including for an asset that never arrived.
   */
  const handleDownload2D = async () => {
    const url = plan2DSource?.previewUrl || plan2DSource?.imageUrl || DEMO_ASSETS.floorPlan2DUrl
    const name = plan2DSource?.name || DEMO_ASSETS.floorPlan2DName

    if (await downloadAssetUrl(url, name)) {
      showSuccessToast(`2D floor plan (${name}) downloaded.`)
    } else {
      showErrorToast('Unable to download the 2D floor plan.', { id: 'output-download-2d' })
    }
  }

  // Handlers for 3D Render
  const handleView3D = () => {
    onViewSource({
      previewUrl: render3DSource?.imageUrl || DEMO_ASSETS.render3DUrl,
      imageUrl: render3DSource?.imageUrl || DEMO_ASSETS.render3DUrl,
      name: render3DSource?.title || DEMO_ASSETS.render3DName,
      extension: render3DSource?.extension || 'SVG',
    })
  }

  const handleDownload3D = async () => {
    const url = render3DSource?.imageUrl || DEMO_ASSETS.render3DUrl
    const name = render3DSource?.title ? `${render3DSource.title}.svg` : DEMO_ASSETS.render3DName

    if (await downloadAssetUrl(url, name)) {
      showSuccessToast(`Approved 3D design (${name}) downloaded.`)
    } else {
      showErrorToast('Unable to download the 3D design.', { id: 'output-download-3d' })
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <h2
          className="font-display text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--tone-muted)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {OUTPUT_COPY.plansSectionTitle}
        </h2>
      </div>

      {/* ── 2-Column Responsive Grid ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        {/* Left: Original 2D Floor Plan */}
        <OutputPlanCard
          title={OUTPUT_COPY.plan2dTitle}
          badgeText={OUTPUT_COPY.plan2dBadge}
          isApproved={false}
          source={plan2DSource}
          fallbackImageUrl={DEMO_ASSETS.floorPlan2DUrl}
          fallbackName={DEMO_ASSETS.floorPlan2DName}
          fallbackExtension="SVG"
          onView={handleView2D}
          onDownload={handleDownload2D}
        />

        {/* Right: Approved 3D Design */}
        <OutputPlanCard
          title={OUTPUT_COPY.plan3dTitle}
          badgeText={OUTPUT_COPY.plan3dBadge}
          isApproved={true}
          source={render3DSource}
          fallbackImageUrl={DEMO_ASSETS.render3DUrl}
          fallbackName={DEMO_ASSETS.render3DName}
          fallbackExtension="SVG"
          onView={handleView3D}
          onDownload={handleDownload3D}
        />
      </div>
    </div>
  )
}
