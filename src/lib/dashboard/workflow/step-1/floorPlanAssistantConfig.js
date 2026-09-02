/**
 * 2D Floor Plan Assistant configuration and copy constants.
 */

export const FLOOR_PLAN_ASSISTANT_COPY = {
  /**
   * The workspace header's own name for this stage.
   *
   * `assistantTitle` names the PRODUCT and is what a gateway card says when it
   * offers to open the workspace. Once the user is inside it, the header's job
   * is to say which stage of the project they are standing in — so it carries
   * the stage's name, matching the stepper above the workflow.
   */
  workspaceTitle: '2D Rendering',
  assistantTitle: 'KRAIOS 2D FLOOR PLAN ASSISTANT',
  assistantSubtitle: 'AI 2D Floor Plan Studio · Describe, refine & generate architectural plans',
  emptyHeading: 'DESCRIBE THE FLOOR PLAN YOU NEED',
  emptyBody:
    'Tell KRAIOS about the rooms, layout, dimensions, or design requirements you want to include in your 2D architectural floor plan.',
  suggestedLabel: 'Quick Prompts',
  generating: 'Analyzing spatial requirements and generating 2D floor plan…',
  statusApproved: '2D floor plan approved and synced as Step 1 project source.',
  statusPending: 'Generate or edit a 2D floor plan, then approve it to proceed.',
  approveCta: 'Approve Now',
  approvedCta: 'Approved',
}

export const FLOOR_PLAN_QUICK_PROMPTS = [
  'Create a 3-bedroom family house layout',
  'Generate a compact two-bedroom apartment plan',
  'Create an office layout with reception, meeting room, and work area',
  'Design a modern studio apartment with open kitchen',
]

/** The stand-in 2D floor plan asset. */
/**
 * What a failed 2D run says, in the transcript and in a toast alike.
 *
 * It lives here now. It used to live in a `floorPlanGeneration.js` seam that
 * also held a frontend mock returning a fixed local SVG as if it were a
 * generated plan; Step 1 calls `POST /step-1/generate/` for real, so the mock
 * and the flags that gated it are gone and only the copy remains.
 */
export const GENERATION_FAILED_MESSAGE =
  'That floor plan could not be generated. Try again in a moment.'
