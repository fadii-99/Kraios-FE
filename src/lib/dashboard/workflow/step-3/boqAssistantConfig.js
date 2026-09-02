/**
 * Step 3 — Kraios BoQ Assistant configuration and copy.
 *
 * Single source of truth for BoQ Assistant metadata, copy, Project Context,
 * document types, quick prompts, and structured output specifications.
 */

/* ---------------------------------------------------------------------------
   Document Types — available in the BOQ Assistant header
   --------------------------------------------------------------------------- */

/**
 * The supporting-document classifications, one per value the backend's
 * `document_type` enum accepts.
 *
 * `apiValue` is why this list is exactly seven long. It used to offer MEP
 * Drawing, HVAC Drawing and Door and Window Schedule, which read well but have
 * no counterpart in the document API: sending one would have been stored as
 * something else, so the classification the user chose would quietly not be the
 * one saved. Labels are ours; the values are the contract's, and the two are
 * declared together so they cannot drift apart.
 */
export const DOCUMENT_TYPES = [
  {
    id: 'general',
    apiValue: 'GENERAL',
    label: 'General Document',
    description: 'General project reference or supporting information.',
  },
  {
    id: 'project-brief',
    apiValue: 'PROJECT_BRIEF',
    label: 'Project Brief',
    description: 'Scope, requirements and client brief documents.',
  },
  {
    id: 'structural-drawing',
    apiValue: 'STRUCTURAL_DRAWING',
    label: 'Structural Drawing',
    description: 'Structural, MEP, HVAC and technical drawings.',
  },
  {
    id: 'estimation',
    apiValue: 'ESTIMATION',
    label: 'Estimation',
    description: 'Existing estimates, rates and cost schedules.',
  },
  {
    id: 'material-specification',
    apiValue: 'MATERIAL_SPECIFICATION',
    label: 'Material Specification',
    description: 'Material schedules, finishes and specifications.',
  },
  {
    id: 'three-d-model',
    apiValue: 'THREE_D_MODEL',
    label: '3D Model',
    description: 'Supplied 3D model files and exports.',
  },
  {
    id: 'other',
    apiValue: 'OTHER',
    label: 'Other',
    description: 'Anything that does not fit the categories above.',
  },
]

export const DEFAULT_DOCUMENT_TYPE_ID = DOCUMENT_TYPES[0].id

export function documentTypeById(id) {
  return DOCUMENT_TYPES.find((doc) => doc.id === id) ?? DOCUMENT_TYPES[0]
}

/** The reverse lookup, for a document coming back from the API. */
export function documentTypeByApiValue(value) {
  return DOCUMENT_TYPES.find((doc) => doc.apiValue === value) ?? DOCUMENT_TYPES[0]
}


/* ---------------------------------------------------------------------------
   Project file slots — what the Project Files panel offers to fill
   --------------------------------------------------------------------------- */

/**
 * The four supporting documents a fit-out BoQ is normally built from.
 *
 * These are SLOTS in the panel, not a second document-type enum. The backend's
 * `document_type` accepts exactly the seven values in `DOCUMENT_TYPES`, and
 * three of these four slots have no member of their own there — so each slot
 * declares the contract value it is stored as, right beside its label, and the
 * two cannot drift apart. `STRUCTURAL_DRAWING` is the honest home for the three
 * drawing slots: its own description already covers structural, MEP, HVAC and
 * technical drawings.
 *
 * Because three slots share one enum value, the enum alone cannot say WHICH
 * slot a file was dropped on — and a file that reappeared in a different slot
 * after a refresh read as a bug, not as a contract limit. So the slot is
 * recorded in the document's own `title`, which is a free-text field the
 * backend stores and returns: `titleTag` is written in front of the file name
 * on upload and read back off it on load (`slotIdFromTitle`).
 *
 * Nothing user-facing shows the tag: the panel and Step 4 both display `name`,
 * which is the asset's `original_name`. This is a labelling convention, not a
 * second classification — `document_type` remains the contract's, and a real
 * per-slot type is still a backend enum change.
 */
export const PROJECT_DOCUMENT_SLOTS = [
  {
    id: 'general-document',
    label: 'General Document',
    typeId: 'general',
    titleTag: 'General Document',
  },
  { id: 'mep-drawing', label: 'MEP Drawing', typeId: 'structural-drawing', titleTag: 'MEP Drawing' },
  {
    id: 'hvac-drawing',
    label: 'HVAC Drawing',
    typeId: 'structural-drawing',
    titleTag: 'HVAC Drawing',
  },
  {
    id: 'door-window-schedule',
    label: 'Door & Window Schedule',
    typeId: 'structural-drawing',
    titleTag: 'Door & Window Schedule',
  },
]

/** The separator between the slot tag and the file name in a document title. */
const SLOT_TITLE_SEPARATOR = ' · '

/** The `title` an upload through one slot is saved under. */
export function slotDocumentTitle(slot, fileName) {
  if (!slot?.titleTag) return fileName
  return `${slot.titleTag}${SLOT_TITLE_SEPARATOR}${fileName}`
}

/** The slot a stored document was uploaded through, or null. */
export function slotIdFromTitle(title) {
  if (!title) return null

  const slot = PROJECT_DOCUMENT_SLOTS.find((candidate) =>
    title.startsWith(`${candidate.titleTag}${SLOT_TITLE_SEPARATOR}`),
  )

  return slot?.id ?? null
}

/**
 * Documents laid out across the four slots.
 *
 * Three passes, most specific first:
 *
 *   1. the slot the document was actually uploaded through, read off its title,
 *   2. failing that, the first free slot matching its `document_type` — which
 *      is what a document uploaded before this convention, or through another
 *      client, still gets,
 *   3. failing that, the first free slot at all, so no uploaded file is
 *      invisible.
 *
 * Anything past four is returned in `extra` rather than dropped — a panel that
 * silently stops showing a file the user uploaded is worse than one with a
 * fifth row.
 */
export function assignDocumentsToSlots(documents = []) {
  const remaining = [...documents]
  const take = (predicate) => {
    const index = remaining.findIndex(predicate)
    return index === -1 ? null : remaining.splice(index, 1)[0]
  }

  const slots = PROJECT_DOCUMENT_SLOTS.map((slot) => ({
    ...slot,
    document: take((document) => slotIdFromTitle(document.title) === slot.id),
  }))

  slots.forEach((slot) => {
    if (!slot.document) slot.document = take((document) => document.typeId === slot.typeId)
  })

  slots.forEach((slot) => {
    if (!slot.document) slot.document = take(Boolean)
  })

  return { slots, extra: remaining }
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
  /**
   * The workspace header's own name for this stage.
   *
   * `assistantTitle` names the PRODUCT and is what a gateway card says when it
   * offers to open the workspace. Once the user is inside it, the header's job
   * is to say which stage of the project they are standing in — so it carries
   * the stage's name, matching the stepper above the workflow.
   */
  workspaceTitle: 'BOQ Generation',
  assistantTitle: 'Kraios BoQ Assistant',
  assistantSubtitle: 'Generate, review and finalize your Bill of Quantities.',
  emptyHeading: 'Generate Your Bill of Quantities',
  // The copy names the control that actually exists: documents are added from
  // PROJECT FILES in the header now, not from the composer.
  emptyBody:
    "Hello! I'm your AI BOQ Specialist. Add your project documents under PROJECT FILES in the header, then ask me to 'analyze the files' or 'generate BOQ' and I'll build a detailed Bill of Quantities.",
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


