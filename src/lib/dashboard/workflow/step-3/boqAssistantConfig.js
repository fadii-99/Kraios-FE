/**
 * Step 3 — Kraios BoQ Assistant configuration and copy.
 *
 * Single source of truth for BoQ Assistant metadata, copy, Project Context,
 * document types, quick prompts, and structured output specifications.
 */

/* ---------------------------------------------------------------------------
   Document Types — available in the BOQ Assistant header
   --------------------------------------------------------------------------- */

export const DOCUMENT_TYPES = [
  {
    id: 'general',
    label: 'General Document',
    description: 'General project reference or supporting information.',
  },
  {
    id: 'mep',
    label: 'MEP Drawing',
    description: 'Mechanical, electrical and plumbing specifications.',
  },
  {
    id: 'hvac',
    label: 'HVAC Drawing',
    description: 'Heating, ventilation and air conditioning layouts.',
  },
  {
    id: 'door-window',
    label: 'Door and Window Schedule',
    description: 'Itemized door, window, and glazing schedules.',
  },
]

export const DEFAULT_DOCUMENT_TYPE_ID = DOCUMENT_TYPES[0].id

export function documentTypeById(id) {
  return DOCUMENT_TYPES.find((doc) => doc.id === id) ?? DOCUMENT_TYPES[0]
}


/* ---------------------------------------------------------------------------
   Stage & Workspace Copy
   --------------------------------------------------------------------------- */

export const BOQ_COPY = {
  eyebrow: 'Bill of Quantities',
  headingLines: ['Generate Your', 'Bill of Quantities'],
  paragraph:
    'Open BoQ Assistant to generate itemized material schedules, quantity takeoffs, and accurate cost estimates.',

  approvedEyebrow: 'BoQ Ready',
  approvedHeadingLines: ['Your Bill of Quantities', 'Is Approved'],
  approvedParagraph:
    'This Bill of Quantities was reviewed and approved in BoQ Assistant and is ready for the Output stage.',

  assistantTitle: 'Kraios BoQ Assistant',
  assistantSubtitle: 'Generate, review and finalize your Bill of Quantities.',
  assistantBlurb:
    'Generate a structured Bill of Quantities from your approved 3D design, original floor plan and supporting project documents.',
  assistantBlurbSecondary:
    'Review quantities, material categories and project costing inside the dedicated BOQ Assistant workspace.',
  assistantCta: 'Open BoQ Assistant',
  viewApprovedDesignCta: 'View Approved 3D Design',
  viewFloorPlanCta: 'View 2D Floor Plan',

  badgeLabel: 'Automated Quantity Takeoff & BoQ Engine',
  badgeLabelApproved: '3D Model Linked · BoQ Ready',

  capabilityHint: 'Material Takeoff · CSI MasterFormat · Cost Estimation · Real-time Pricing',

  statusReadyNote:
    'Your approved 3D design is available as the primary BOQ reference.',
  statusPendingNote:
    'Approve a 3D design in Step 2 before starting the BOQ workflow.',

  // What You'll Build Breakdown (Structured BoQ Outputs)
  buildOutputs: [
    {
      id: 'quantities',
      title: 'Quantities',
      description: 'Itemized material and work quantities.',
    },
    {
      id: 'categories',
      title: 'Categories',
      description: 'Structured construction and material groups.',
    },
    {
      id: 'costing',
      title: 'Costing',
      description: 'Unit-rate and project cost information when available.',
    },
    {
      id: 'finalBoq',
      title: 'Final BoQ',
      description: 'A reviewed project BoQ ready for the Output stage.',
    },
  ],
}

/* ---------------------------------------------------------------------------
   BoQ Assistant Workspace Copy
   --------------------------------------------------------------------------- */

export const BOQ_ASSISTANT_COPY = {
  assistantTitle: 'Kraios BoQ Assistant',
  assistantSubtitle: 'Generate, review and finalize your Bill of Quantities.',
  emptyHeading: 'Generate Your Bill of Quantities',
  emptyBody:
    "Hello! I'm your AI BOQ Specialist. Please upload your project documents (PDFs) and I'll help you generate a detailed Bill of Quantities. Once uploaded, just ask me to 'analyze the files' or 'generate BOQ'.",
  composerPlaceholder:
    'Ask about BOQ, quantities, materials or project documents…',
  generating: 'Compiling Bill of Quantities…',
}




/* ---------------------------------------------------------------------------
   The dummy BoQ tables used to live here. They are now in `boqDemoData.js` —
   ONE fixture module, read by Step 3's mock generation and by Step 4 — rather
   than a copy per stage. No re-export is kept here: a barrel with no consumer
   is just another place for the fixture to be found in.
   --------------------------------------------------------------------------- */


