/**
 * BoQ demonstration fixtures — the ONE copy.
 *
 * No quantity-analysis or costing service is connected, so these rows stand in
 * for generated output wherever the BoQ UI has to be exercised. They lived in
 * two places before: `boqAssistantConfig.INITIAL_BOQ_ROWS` for Step 3's mock
 * generation, and an identical `DEMO_BOQ_ROWS` in Step 4's `outputConfig` for
 * the Output table. Two copies of the same fixture drift, and a fixture that
 * drifts stops being useful for comparing the two screens.
 *
 * This module holds DATA only. Step 3 and Step 4 keep their own presentation
 * and their own components — Step 4 does not reach into Step 3's UI, it reads
 * the same rows.
 *
 * These are fixtures, NOT project state. Nothing here is a deliverable: Step 4
 * treats only an explicitly approved BoQ result as final, so a fixture can no
 * longer appear as an approved Bill of Quantities.
 */

/** The baseline take-off — the first result the Step 3 mock returns. */
export const INITIAL_BOQ_ROWS = [
  { item: '01', description: 'Internal wall finish (plaster & paint)', qty: '245', unit: 'm²', rate: '—', amount: '—' },
  { item: '02', description: 'Floor tiles (porcelain vitrified)', qty: '118', unit: 'm²', rate: '—', amount: '—' },
  { item: '03', description: 'Concrete works (reinforced slabs & beams)', qty: '32', unit: 'm³', rate: '—', amount: '—' },
  { item: '04', description: 'Interior flush doors & frames', qty: '8', unit: 'No.', rate: '—', amount: '—' },
  { item: '05', description: 'Aluminium glazed windows', qty: '11', unit: 'No.', rate: '—', amount: '—' },
]

/** A refined take-off, returned when the instruction asks for a breakdown. */
export const REFINED_BOQ_ROWS = [
  { item: '01', description: 'Internal wall finish (premium emulsion)', qty: '245', unit: 'm²', rate: '—', amount: '—' },
  { item: '02', description: 'Floor tiles (matte finish 600x600)', qty: '118', unit: 'm²', rate: '—', amount: '—' },
  { item: '03', description: 'Concrete works (structure M25)', qty: '32', unit: 'm³', rate: '—', amount: '—' },
  { item: '04', description: 'Solid core hardwood doors', qty: '8', unit: 'No.', rate: '—', amount: '—' },
  { item: '05', description: 'Double glazed thermal windows', qty: '11', unit: 'No.', rate: '—', amount: '—' },
  { item: '06', description: 'Ceiling gypsum board lining', qty: '96', unit: 'm²', rate: '—', amount: '—' },
]
