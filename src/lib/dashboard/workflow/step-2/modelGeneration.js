/**
 * The seam for 3D model generation (Step 2, Design Assistant).
 *
 * Written to the same contract as `floorPlanGeneration.js`, deliberately: there
 * is NO generation backend in this project yet, and this module does not
 * pretend otherwise. It never fabricates a render, never fakes a delay and
 * never hands back a placeholder image dressed up as a real model. It throws a
 * typed, explainable error so the assistant can say plainly that the service is
 * not connected — and the whole conversation, approval and Step 2 state machine
 * above it stays real.
 *
 * Everything downstream of a successful call is already built: the reducer
 * appends the result, the conversation renders it, Expand / Edit / DWG /
 * Approve operate on it, and Step 2 switches to its approved composition.
 * Connecting the real service is therefore a change to THIS FILE ALONE:
 *
 *   1. implement `requestModelGeneration` against the real endpoint, resolving
 *      the `ModelResult` shape documented below,
 *   2. flip `MODEL_GENERATION_ENABLED` to true,
 *   3. flip `MODEL_GENERATION_SUPPORTS_CANCEL` to true only if the endpoint can
 *      really be aborted — the composer's Cancel control is gated on it, and a
 *      cancel button that does not cancel is worse than none.
 *
 * No component changes.
 */

/** Whether a 3D generation service is wired up. False until an endpoint exists. */
export const MODEL_GENERATION_ENABLED = false

/**
 * FRONTEND MOCK — on, deliberately, and only until the service above exists.
 *
 * There is still no backend. What this does is hand back a fixed local asset
 * that already ships with the app, so the conversation, the result controls,
 * the view-angle and render-style settings and the approval rules can be walked
 * end to end while the real endpoint is being built. It calls nothing, waits on
 * nothing and invents no processing metadata: same image every time, whatever
 * the settings, which is exactly what a mock should look like.
 *
 * Turning the real service on is still the three-step change documented above;
 * this flag becomes false at the same moment `MODEL_GENERATION_ENABLED` becomes
 * true, and the branch below falls away with it.
 */
export const MODEL_GENERATION_MOCK_ENABLED = true

/**
 * The stand-in render: the light 3D floor plan already used on the public site.
 * A real local asset rather than a grey box, so the result presentation is
 * judged at the size and proportion a real model will arrive at.
 */
export const MOCK_MODEL_IMAGE_URL = '/assets/plan-3d-light.svg'

/**
 * Whether an in-flight generation can genuinely be aborted.
 *
 * The plumbing below already threads an `AbortSignal`, so this only has to
 * become true once the endpoint honours it. While it is false the assistant
 * shows no Cancel action at all rather than a control that pretends.
 */
export const MODEL_GENERATION_SUPPORTS_CANCEL = MODEL_GENERATION_ENABLED && false

export const GENERATION_UNAVAILABLE_MESSAGE =
  'The Kraios 3D generation service is not connected yet. Your instruction is kept in this conversation for the session and will be sent as soon as the service is available.'

export const GENERATION_FAILED_MESSAGE =
  'That 3D model could not be generated. Try again in a moment.'

export const GENERATION_CANCELLED_MESSAGE = 'Generation cancelled.'

/** Thrown while no generation service is connected. */
export class ModelGenerationUnavailableError extends Error {
  constructor(message = GENERATION_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = 'ModelGenerationUnavailableError'
  }
}

/** Thrown when the caller aborted an in-flight generation. */
export class ModelGenerationCancelledError extends Error {
  constructor(message = GENERATION_CANCELLED_MESSAGE) {
    super(message)
    this.name = 'ModelGenerationCancelledError'
  }
}

/**
 * Requests one 3D model render.
 *
 * Every field the assistant collects is passed through on every call — the
 * selected render style and view angle are part of the request, not decoration
 * in the header, and `baseResult` carries the "edit this image" context so a
 * refinement is anchored to the render the user pointed at.
 *
 * @param {object}      request
 * @param {string}      request.prompt        the user's instruction
 * @param {string}      request.renderStyleId one of RENDER_STYLES
 * @param {string}      request.viewAngleId   one of VIEW_ANGLES
 * @param {object|null} request.source        the Step 1 floor-plan source
 * @param {object|null} request.baseResult    the result being refined, if any
 * @param {AbortSignal} [request.signal]
 * @returns {Promise<ModelResult>}
 *
 * @typedef {object} ModelResult
 * @property {string}      imageUrl  the generated render
 * @property {string|null} [dwgUrl]  a real DWG asset, or omitted. The DWG action
 *                                   is rendered only when this is present, so a
 *                                   missing export simply has no button.
 * @property {boolean}     [ownsImageUrl] true when `imageUrl` is a blob URL this
 *                                   app created and must revoke.
 */
export async function requestModelGeneration(request) {
  if (MODEL_GENERATION_ENABLED) {
    // Real request goes here once the endpoint exists. It must resolve to the
    // `ModelResult` shape above.
    void request
    throw new ModelGenerationUnavailableError()
  }

  if (MODEL_GENERATION_MOCK_ENABLED) {
    // No request, and no artificial delay standing in for one. The settings on
    // `request` are recorded by the reducer as result metadata; nothing here
    // acts on them, because nothing here can.
    void request

    return {
      imageUrl: MOCK_MODEL_IMAGE_URL,
      dwgUrl: null,
      ownsImageUrl: false,
    }
  }

  throw new ModelGenerationUnavailableError()
}
