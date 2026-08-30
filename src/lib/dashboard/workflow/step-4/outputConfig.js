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

/*
 * `DEMO_ASSETS` used to live here — a local 2D SVG and a local 3D SVG that
 * every Step 4 section fell back to when the real asset was missing, so an
 * empty project displayed two drawings it did not own. Step 4 reads the
 * project's own `GET /output/` bundle now and shows nothing where there is
 * nothing, so the fallbacks are gone rather than merely unused.
 */

/*
 * The BoQ demonstration rows used to be declared here as `DEMO_BOQ_ROWS`, a
 * byte-identical copy of Step 3's `INITIAL_BOQ_ROWS`. There is one copy now,
 * in `workflow/step-3/boqDemoData.js`, and Output no longer substitutes it for
 * a real deliverable: `OutputStage` shows the APPROVED BoQ or none at all. Any
 * UI work that wants sample rows imports that fixture module directly.
 */
