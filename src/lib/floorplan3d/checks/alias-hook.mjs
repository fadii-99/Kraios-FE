/**
 * Module hooks that teach Node the two Vite-isms this source relies on.
 *
 * `vite.config.js` maps `@` to `./src`, and Vite injects `import.meta.env`.
 * Node knows about neither. Rather than adding a bundler or a test framework to
 * run a handful of pure functions, this reproduces exactly those two behaviours
 * using the stable `module.register` hook API:
 *
 *   resolve() — `@/x` -> `<src>/x`, with Vite's extension search
 *   load()    — `import.meta.env` -> `globalThis.__VITE_ENV__`, the same
 *               substitution Vite performs, so a module that reads a build-time
 *               env var can be imported at all
 *
 * Loaded by `register.mjs`, which is passed to `node --import`.
 */
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// This file lives at src/lib/floorplan3d/checks/, so `src` is three levels up.
const SRC = path.resolve(import.meta.dirname, '..', '..', '..')

// Vite resolves an extensionless import; Node does not. The application's own
// imports are written the Vite way, so the hook has to do the same lookup
// rather than the source being changed to suit a test runner.
const EXTENSIONS = ['', '.js', '.jsx', '.mjs', '/index.js']

function firstExisting(base) {
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`
    if (existsSync(candidate)) return candidate
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = firstExisting(path.join(SRC, specifier.slice(2)))
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
  }
  return nextResolve(specifier, context)
}


/**
 * Replace `import.meta.env` with a plain object.
 *
 * Vite rewrites this at build time; Node leaves it as `undefined` and any
 * module that touches it throws on import. `src/lib/api/client.js` reads
 * `import.meta.env.VITE_API_BASE_URL` at module scope, so without this the
 * shared HTTP client cannot be imported here at all — and it is exactly the
 * module worth testing, since it is the one every feature shares.
 *
 * Only `.js`/`.jsx` under `src` are rewritten, and only that one expression.
 */
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context)
  if (
    !url.startsWith('file://') ||
    !url.includes('/src/') ||
    !/\.(js|jsx|mjs)$/.test(url) ||
    result.source == null
  ) {
    return result
  }

  // Node hands the source back as a string OR as a Buffer/TypedArray depending
  // on the loader chain, so both have to be handled — checking only for a
  // string silently skips every module, which is exactly what it did.
  const text =
    typeof result.source === 'string'
      ? result.source
      : new TextDecoder().decode(result.source)

  if (!text.includes('import.meta.env')) return result
  return {
    ...result,
    source: text.replaceAll('import.meta.env', 'globalThis.__VITE_ENV__'),
  }
}
