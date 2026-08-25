/**
 * The seam for AI floor-plan generation (Step 1, Generate mode).
 *
 * There is NO generation backend in this project yet, and this module does not
 * pretend otherwise: it never fabricates a result, never fakes a delay and
 * never returns a placeholder image dressed up as a real plan. It throws a
 * typed, explainable error so the UI can say plainly that the service is not
 * connected.
 *
 * Everything downstream of a successful call is already built — the composer
 * hands the result to `createGeneratedSource`, the preview renders it, and
 * Regenerate / Clear operate on it. Connecting the real service is therefore a
 * change to this file alone:
 *
 *   1. implement `requestFloorPlanGeneration` against the real endpoint,
 *      resolving `{ previewUrl }` (add `ownsPreviewUrl: true` if the URL is a
 *      blob this app created),
 *   2. flip `FLOOR_PLAN_GENERATION_ENABLED` to true.
 *
 * No component changes.
 */

/** Whether a generation service is wired up. False until an endpoint exists. */
export const FLOOR_PLAN_GENERATION_ENABLED = false

export const GENERATION_UNAVAILABLE_MESSAGE =
  'Floor plan generation is not connected yet. Your description stays here for this session and will be sent as soon as the Kraios generation service is available.'

export const GENERATION_FAILED_MESSAGE =
  'Floor plan generation could not be completed. Try again in a moment.'

/** Thrown while no generation service is connected. */
export class FloorPlanGenerationUnavailableError extends Error {
  constructor(message = GENERATION_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = 'FloorPlanGenerationUnavailableError'
  }
}

/**
 * Requests one floor plan for `prompt`.
 *
 * @param {string} prompt
 * @returns {Promise<{ previewUrl: string, ownsPreviewUrl?: boolean }>}
 */
export async function requestFloorPlanGeneration(prompt) {
  if (!FLOOR_PLAN_GENERATION_ENABLED) {
    throw new FloorPlanGenerationUnavailableError()
  }

  // Real request goes here once the endpoint exists. It must resolve to the
  // shape above; `prompt` is the only input the composer collects.
  void prompt
  throw new FloorPlanGenerationUnavailableError()
}
