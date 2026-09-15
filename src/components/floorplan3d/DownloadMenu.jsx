import { useState } from 'react'
import {
  ArrowClockwise,
  CaretDown,
  CheckCircle,
  DownloadSimple,
  WarningCircle,
} from '@phosphor-icons/react'

import { ARTIFACT_LABELS } from '@/lib/api/floorplan3d'
import { formatBytes } from '@/lib/floorplan3d/adapters'
import { cn } from '@/lib/cn'

/**
 * What can be downloaded, and whether it is up to date.
 *
 * STALENESS IS SHOWN PER ARTIFACT. The semantic JSON is regenerated with every
 * revision, but the `.blend`, the `.glb` and the thumbnails come from a Blender
 * run — so after an edit they describe an OLDER building. Offering them without
 * saying so is how a user downloads yesterday's model and does not find out for
 * a week.
 *
 * DOWNLOADS ARE PLAIN LINKS, not fetch-and-save. The artifact route is
 * authenticated by the same cookie the rest of the app uses and it is
 * same-origin through the proxy, so the browser can stream a 40 MB `.blend`
 * straight to disk. Fetching it into a blob first would hold the whole file in
 * memory for no benefit.
 *
 * A REBUILD IS REPORTED WHERE IT WAS ASKED FOR. It runs for a minute or two on
 * a server, and it used to report itself only as a toast on the way out and a
 * 10px line in the footer — so "did anything happen?" had no answer anywhere
 * near the button that had been pressed. The trigger now carries the running
 * state, and the menu explains, in each of its three states, whether there is
 * anything to do: rebuilding, out of date, or matching. The page raises the
 * toast that closes the loop.
 *
 * SAME-ORIGIN IS LOAD-BEARING, NOT AN ASIDE. `downloadUrl` is built by
 * `artifactUrl` in `adapters.js` as a relative `/api/v1/...` path. It must not
 * be the API's own `download_url`, which is absolute and names the BACKEND's
 * host: clicking that is a cross-origin navigation, the session cookie is not
 * sent, and DRF answers 401 by rendering its browsable-API error as HTML - so
 * the user clicks Download and gets an error PAGE rather than a file.
 */
export default function DownloadMenu({
  artifacts,
  stale,
  onRegenerate,
  regenerating,
  rebuildMessage,
  disabled,
}) {
  const [open, setOpen] = useState(false)
  const available = artifacts ?? []

  const rebuild = () => {
    onRegenerate()
    // The menu STAYS OPEN, because it is now the thing reporting the run. It
    // used to close on the click, which left the user looking at a header that
    // showed no sign anything had been started.
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          'label-ui inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-[var(--tone-line-strong)] px-3.5 text-[var(--tone-ink)] transition-colors',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]',
        )}
      >
        {regenerating ? (
          <ArrowClockwise size={15} className="animate-spin" />
        ) : (
          <DownloadSimple size={15} />
        )}
        {regenerating ? 'Rebuilding…' : 'Download'}
        {stale && !regenerating && (
          <span
            aria-label="Some downloads are out of date"
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]"
          />
        )}
        <CaretDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 rounded-md border border-[var(--tone-line)] bg-white p-2 shadow-lg">
          {/* One block, three states, and it is always present: "is there
              anything I need to do about these files?" is the question the menu
              exists to answer, and an answer that appears only when the news is
              bad leaves the good case looking unexplained. */}
          {regenerating ? (
            <div className="mb-2 rounded-sm border border-[var(--color-brand-deep)] bg-[color-mix(in_oklab,var(--color-brand)_6%,transparent)] p-2.5">
              <p className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
                <ArrowClockwise
                  size={13}
                  className="mt-0.5 shrink-0 animate-spin text-[var(--color-brand-deep)]"
                />
                <span>
                  <span className="font-medium">Rebuilding the files…</span> This
                  runs on the server and takes a minute or two. Keep working — you
                  will be told when it finishes.
                </span>
              </p>
              {rebuildMessage && (
                <p className="mt-1 pl-[1.15rem] text-[0.625rem] text-[var(--tone-ink-soft)]">
                  {rebuildMessage}
                </p>
              )}
            </div>
          ) : stale ? (
            <div className="mb-2 rounded-sm border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-2.5">
              <p className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-[var(--tone-ink)]">
                <WarningCircle size={13} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
                <span>
                  <span className="font-medium">
                    You edited the model after these files were built.
                  </span>{' '}
                  Downloading now gives you the older building. Rebuild them
                  first — the model on screen does not change.
                </span>
              </p>
              <button
                type="button"
                onClick={rebuild}
                className="label-ui mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--tone-line-strong)] bg-white px-2.5 py-1.5 text-[var(--tone-ink)] transition-colors hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
              >
                <ArrowClockwise size={12} />
                Rebuild the files
              </button>
            </div>
          ) : (
            available.length > 0 && (
              <p className="mb-2 flex items-start gap-1.5 rounded-sm px-2.5 py-2 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
                <CheckCircle
                  size={13}
                  className="mt-0.5 shrink-0 text-[var(--color-success)]"
                />
                These files match the revision you are viewing. Nothing to do.
              </p>
            )
          )}

          {available.length === 0 ? (
            <p className="p-2 text-[0.6875rem] leading-relaxed text-[var(--tone-ink-soft)]">
              No files yet. The Blender artifacts are generated after the model is
              validated; the semantic JSON appears first.
            </p>
          ) : (
            available.map((artifact) => (
              <a
                key={artifact.id}
                href={artifact.downloadUrl}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-[var(--color-light)]"
              >
                <DownloadSimple size={13} className="shrink-0 text-[var(--tone-ink-soft)]" />
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--tone-ink)]">
                  {ARTIFACT_LABELS[artifact.type] ?? artifact.type}
                </span>
                {!artifact.isCurrent && (
                  <span className="shrink-0 text-[0.625rem] text-[var(--color-warning)]">
                    older revision
                  </span>
                )}
                <span className="shrink-0 text-[0.625rem] text-[var(--tone-ink-soft)]">
                  {formatBytes(artifact.byteSize)}
                </span>
              </a>
            ))
          )}

          {/* The optional rebuild, kept quiet and kept LAST. The status block
              above has already said nothing is wrong; this is for the rare case
              where a file is suspected of being corrupt. It is deliberately not
              a verb the eye lands on first — read as an instruction, it told
              users their good files needed fixing. */}
          {!stale && !regenerating && available.length > 0 && (
            <div className="mt-1 border-t border-[var(--tone-line)] px-2 pt-2">
              <button
                type="button"
                onClick={rebuild}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-0 py-1.5 text-left text-[0.6875rem] text-[var(--tone-ink-soft)] transition-colors hover:text-[var(--tone-accent)]"
              >
                <ArrowClockwise size={12} />
                Rebuild them anyway
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
