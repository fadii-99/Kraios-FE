/**
 * Registers the `@/` resolution hook, then gets out of the way.
 *
 *     node --import ./src/lib/floorplan3d/checks/register.mjs \
 *          --test src/lib/floorplan3d/checks/engine.test.mjs
 *
 * See `alias-hook.mjs` for why this exists rather than a test framework.
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// What Vite would have injected. Kept minimal on purpose: a check that needs a
// particular value should set it itself rather than relying on a default here.
globalThis.__VITE_ENV__ = {
  MODE: 'test',
  DEV: false,
  PROD: false,
  VITE_API_BASE_URL: '/api/v1',
  VITE_FLOORPLAN3D_ENABLED: 'true',
}

register('./alias-hook.mjs', pathToFileURL(import.meta.filename))
