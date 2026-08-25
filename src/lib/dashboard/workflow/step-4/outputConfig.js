/**
 * Step 4 — Kraios Project Output configuration and copy.
 *
 * Single source of truth for Step 4 Output metadata, deliverables copy,
 * and fallback demonstration data.
 */

export const OUTPUT_COPY = {
  eyebrow: 'PROJECT OUTPUT',
  title: 'YOUR PROJECT DELIVERABLES',
  blurb:
    'Review your approved plans, finalized BoQ and supporting project documents. Preview individual deliverables or download the complete project package.',

  // Plans & Renders Section
  plansSectionTitle: 'PLANS & RENDERS',
  plansSectionBlurb: 'Primary visual drawings and architectural 3D models for this project.',
  plan2dTitle: 'ORIGINAL 2D FLOOR PLAN',
  plan2dBadge: 'SOURCE PLAN',
  plan3dTitle: 'APPROVED 3D DESIGN',
  plan3dBadge: 'APPROVED',

  // Final BoQ Section
  boqSectionTitle: 'FINAL BOQ',
  boqSectionBlurb: 'Finalized Bill of Quantities approved during the BoQ stage.',
  boqApprovedBadge: 'BOQ APPROVED',
  boqDownloadCta: 'Download BoQ',
  boqStatChip: '1 Final BoQ',
  boqStatChipNone: 'No Final BoQ',
  noBoqHeading: 'NO FINALIZED BOQ',
  noBoqBlurb:
    'The BoQ stage was skipped or the Bill of Quantities has not been approved yet. Approve a BoQ in the BoQ stage to include it here and in the project package.',

  // Uploaded Documents Section
  docsSectionTitle: 'UPLOADED DOCUMENTS',
  docsSectionBlurb: 'Supporting project files added during the workflow.',
  noDocsHeading: 'NO DOCUMENTS UPLOADED',
  noDocsBlurb: 'No supporting documents were added to this project.',

  // Download Package CTA
  downloadZipCta: 'DOWNLOAD PROJECT ZIP',
}

/**
 * Local assets for standalone frontend demonstration when upstream stages
 * have not yet saved real files.
 */
export const DEMO_ASSETS = {
  floorPlan2DUrl: '/assets/plan-2d-primary.svg',
  floorPlan2DName: 'Floor-Plan-Design.svg',
  render3DUrl: '/assets/plan-3d-light.svg',
  render3DName: 'Approved-3D-Model.svg',
}

/*
 * The BoQ demonstration rows used to be declared here as `DEMO_BOQ_ROWS`, a
 * byte-identical copy of Step 3's `INITIAL_BOQ_ROWS`. There is one copy now,
 * in `workflow/step-3/boqDemoData.js`, and Output no longer substitutes it for
 * a real deliverable: `OutputStage` shows the APPROVED BoQ or none at all. Any
 * UI work that wants sample rows imports that fixture module directly.
 */
