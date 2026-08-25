/**
 * Step 3 — BoQ generation request handler.
 *
 * Simulates intelligent BoQ compilation based on 2D floor plan, approved 3D design,
 * user instructions, and uploaded supporting documents.
 */

import { INITIAL_BOQ_ROWS, REFINED_BOQ_ROWS } from '@/lib/dashboard/workflow/step-3/boqDemoData'

const DEFAULT_REQUIREMENTS_MARKDOWN = `I've reviewed the finalized 3D render (approved) — it shows a ~12.0 m × 12.0 m single-storey residential unit with a living room (with TV area), master bedroom, kitchen, dining area, study/home office, and a bathroom with bathtub, WC and vanity. I'll now begin the BOQ workflow.

### Step 1 Complete — Requirements Analysis ✅

**Project Overview:** Single-storey residential unit, approx 12.0m × 12.0m (~144 sqm), comprising 7 functional zones.

**Functional Requirements:**

| Zone | Approx. Size |
| :--- | :--- |
| **Master bedroom** | 6.3m × 4.4m (~27.7 sqm) |
| **Kitchen** | 6.2m wide, with cabinetry |
| **Dining area** | Adjacent to living |
| **Study/home office** | ~3.6m wide |
| **Bathroom** | 3.0m × 4.0m (~12 sqm) — bathtub, WC, vanity |
| **Hallway/corridor** | ~9.0m length |

**Technical Specifications:**
- Wood-look flooring in living areas, bedrooms, study
- Tile flooring in kitchen and bathroom (wet areas)
- Internal partition walls dividing 7 zones
- Painting to all internal walls and ceilings
- Kitchen cabinetry fit-out
- Bathroom fixtures: bathtub, WC, vanity
- Electrical fit-out

**Assumptions / Missing Information:**
- **Ceiling height** → will assume 2.8m standard
- **Door/window counts** → estimated from the 3D render (approx. 5 internal doors, 1 entrance door, 4 windows visible)
- **Paint spec** → assume emulsion, 2 coats over primer
- **Electrical layout** → standard residential allowance per room
- **Location / Pricing region** → default to Dubai unless specified

Please approve Step 1 so I can extract the materials. If you'd like to correct any assumptions (ceiling height, door/window counts, finishes, location), let me know now and I'll incorporate them.`

/**
 * FRONTEND MOCK. No quantity-analysis or costing service is connected: this
 * picks one of the declared fixtures by keyword and returns it after a short
 * wait, so the assistant's loading, result and approval states are exercisable.
 *
 * It deliberately does NOT take a document type — nothing here analyses an
 * uploaded document, and accepting the parameter implied an influence the mock
 * does not have. The real service will take it back when it can act on it.
 */
export async function requestBoqGeneration({ prompt, signal }) {
  // Deliberate wait: the mock stands in for a backend call, and Step 3's
  // pending/cancel states have to remain observable while it does.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 1400)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('BoQ generation aborted', 'AbortError'))
    })
  })

  const p = (prompt || '').toLowerCase()

  let rows = INITIAL_BOQ_ROWS
  let text = DEFAULT_REQUIREMENTS_MARKDOWN

  if (p.includes('wall') || p.includes('finish') || p.includes('paint')) {
    rows = [
      { item: '01', description: 'Internal wall plaster (12mm cement mortar 1:4)', qty: '245', unit: 'm²', rate: '—', amount: '—' },
      { item: '02', description: 'Wall primer and 2-coat acrylic emulsion finish', qty: '245', unit: 'm²', rate: '—', amount: '—' },
      { item: '03', description: 'Skirting matching floor tile (100mm height)', qty: '68', unit: 'm', rate: '—', amount: '—' },
      { item: '04', description: 'Drywall partition (gypsum board with insulation)', qty: '42', unit: 'm²', rate: '—', amount: '—' },
    ]
    text = `Here is the itemized quantity takeoff for all interior wall finishes and drywall partitions derived from your 3D model geometry.\n\n### Wall Finish Schedule Summary\n- **Total Plaster Area:** 245 m²\n- **Drywall Partitions:** 42 m² (acoustic insulation included)\n- **Skirting Linear Length:** 68 m`
  } else if (p.includes('floor') || p.includes('tile')) {
    rows = [
      { item: '01', description: 'Porcelain vitrified floor tiles (600x600mm)', qty: '118', unit: 'm²', rate: '—', amount: '—' },
      { item: '02', description: 'Anti-skid ceramic tiles for wet areas', qty: '24', unit: 'm²', rate: '—', amount: '—' },
      { item: '03', description: 'Cement screed underlayment (50mm)', qty: '142', unit: 'm²', rate: '—', amount: '—' },
    ]
    text = `I've extracted the flooring schedule and calculated surface areas from the 3D model.\n\n### Flooring Schedule\n- **Living/Bedroom Area:** 118 m² Porcelain Tiles\n- **Wet Areas (Bathroom/Kitchen):** 24 m² Anti-skid Ceramic Tiles\n- **Underlayment:** 142 m² Cement Screed`
  } else if (p.includes('cost') || p.includes('rate') || p.includes('price') || p.includes('schedule')) {
    rows = [
      { item: '01', description: 'Internal wall finish (premium emulsion)', qty: '245', unit: 'm²', rate: '—', amount: '—' },
      { item: '02', description: 'Floor tiles (matte finish 600x600)', qty: '118', unit: 'm²', rate: '—', amount: '—' },
      { item: '03', description: 'Concrete works (structure M25)', qty: '32', unit: 'm³', rate: '—', amount: '—' },
      { item: '04', description: 'Solid core hardwood doors', qty: '8', unit: 'No.', rate: '—', amount: '—' },
      { item: '05', description: 'Double glazed thermal windows', qty: '11', unit: 'No.', rate: '—', amount: '—' },
      { item: '06', description: 'Ceiling gypsum board lining', qty: '96', unit: 'm²', rate: '—', amount: '—' },
    ]
    text = `Here is the preliminary cost schedule template with itemized quantities ready for rate analysis.`
  } else if (p.includes('breakdown') || p.includes('material') || p.includes('quantity')) {
    rows = REFINED_BOQ_ROWS
    text = `Here is the full material quantity breakdown grouped by trade category.`
  }

  return {
    title: 'Bill of Quantities',
    summary: `${rows.length} Items · Preliminary BoQ`,
    rows,
    text,
  }
}

