import { useCallback, useEffect, useRef, useState } from 'react'

import {
  cancelUpload,
  completeUpload,
  getUpload,
  sha256Hex,
  startUpload,
  uploadChunk,
} from '@/lib/api/floorplan3d'

/**
 * A resumable chunked upload, from the browser side.
 *
 * WHY CHUNKED AT ALL. The deployed frontend proxy rejects request bodies around
 * 4.5 MB (`api/proxy.js` on Vercel), and an architectural PDF is routinely
 * larger. So an upload is a session: declare the file and its SHA-256, send
 * ~3 MB parts, ask the server to assemble. Any part may be re-sent.
 *
 * THE HASH IS THE POINT. It is computed before the first byte is sent and
 * verified by the server after assembly, so a chunk that arrived corrupted — or
 * a browser that mis-sliced the file — fails the upload rather than becoming a
 * plan that mysteriously will not convert.
 *
 * RESUME IS SERVER-DRIVEN. On a retry the client asks which chunks arrived
 * (`getUpload`) and sends only the rest. It does not remember what it sent: the
 * server's list is the truth, and a client-side belief about it is a belief that
 * survives a page reload it should not have survived.
 *
 * CANCELLATION IS COOPERATIVE. `cancel()` sets a flag the loop checks between
 * chunks and tells the server to discard the staged parts. An in-flight chunk is
 * allowed to finish, because aborting mid-request would leave a partial file on
 * disk for the sweeper rather than one the completion call would have rejected
 * anyway.
 */

// Mirrors `FLOORPLAN3D_MAX_UPLOAD_BYTES`. Checked here only to fail fast on
// something obviously too big rather than after a 60 MB transfer; the server
// decides.
const MAX_BYTES = 60 * 1024 * 1024

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.dxf']

export const UPLOAD_ACCEPT = ACCEPTED_EXTENSIONS.join(',')

export const UPLOAD_PHASES = {
  IDLE: 'idle',
  HASHING: 'hashing',
  UPLOADING: 'uploading',
  ASSEMBLING: 'assembling',
  DONE: 'done',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

/**
 * Thin client-side validation: extension and size only.
 *
 * Deliberately thin. The server decides by reading the file's own signature,
 * and duplicating that judgement here would mean two rules that disagree — the
 * browser accepting a renamed `.png` the server then refuses, or the reverse.
 */
export function describeRejection(file) {
  if (!file) return 'Choose a file.'
  const name = (file.name || '').toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'Upload a PNG, JPEG, WEBP, PDF or DXF floor plan.'
  }
  if (file.size > MAX_BYTES) {
    return `That file is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`
  }
  if (file.size === 0) return 'That file is empty.'
  return null
}

export function useChunkedUpload() {
  const [phase, setPhase] = useState(UPLOAD_PHASES.IDLE)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [filename, setFilename] = useState('')

  const cancelled = useRef(false)
  const sessionRef = useRef(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const reset = useCallback(() => {
    cancelled.current = false
    sessionRef.current = null
    setPhase(UPLOAD_PHASES.IDLE)
    setProgress(0)
    setError('')
    setFilename('')
  }, [])

  const cancel = useCallback(async () => {
    cancelled.current = true
    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      try {
        await cancelUpload(session.id)
      } catch {
        // The session will be swept server-side either way; failing to cancel
        // it is not worth telling the user about.
      }
    }
    if (alive.current) {
      setPhase(UPLOAD_PHASES.CANCELLED)
      setProgress(0)
    }
  }, [])

  /**
   * Upload one file and (by default) start its conversion.
   *
   * Resolves with `{ source, conversion }` on success, or null when it was
   * cancelled or failed — the caller reads `error` for the message rather than
   * catching, because every failure path here has already been normalised.
   */
  const upload = useCallback(
    async (file, { startConversion = true, name } = {}) => {
      const rejection = describeRejection(file)
      if (rejection) {
        setError(rejection)
        setPhase(UPLOAD_PHASES.FAILED)
        return null
      }

      cancelled.current = false
      setError('')
      setFilename(file.name)
      setProgress(0)
      setPhase(UPLOAD_PHASES.HASHING)

      try {
        // Before anything is sent: the server verifies the assembly against
        // this, so it has to be computed from the same bytes that will be sent.
        const sha256 = await sha256Hex(file)
        if (cancelled.current || !alive.current) return null

        const session = await startUpload({
          filename: file.name,
          totalBytes: file.size,
          sha256,
          mimeType: file.type,
        })
        sessionRef.current = session
        if (cancelled.current || !alive.current) {
          await cancel()
          return null
        }

        setPhase(UPLOAD_PHASES.UPLOADING)

        // The server's own list of what arrived, not the client's memory of
        // what it sent. On a fresh session it is empty; on a resume it is not.
        const received = new Set(session.received_chunks ?? [])
        const total = session.total_chunks
        const chunkSize = session.chunk_size

        for (let index = 0; index < total; index += 1) {
          if (cancelled.current || !alive.current) {
            await cancel()
            return null
          }
          if (received.has(index)) {
            setProgress(Math.round(((index + 1) / total) * 90))
            continue
          }

          const start = index * chunkSize
          const slice = file.slice(start, Math.min(start + chunkSize, file.size))
          const state = await uploadChunk(session.id, index, slice)
          for (const arrived of state.received_chunks ?? []) received.add(arrived)

          // Capped at 90: assembly and hash verification are the last 10, and a
          // bar that sits at 100 while the server is still working is a bar
          // that lies.
          setProgress(Math.round(((index + 1) / total) * 90))
        }

        if (cancelled.current || !alive.current) {
          await cancel()
          return null
        }

        setPhase(UPLOAD_PHASES.ASSEMBLING)
        setProgress(95)
        const result = await completeUpload(session.id, { startConversion, name })

        sessionRef.current = null
        if (!alive.current) return null
        setProgress(100)
        setPhase(UPLOAD_PHASES.DONE)
        return result
      } catch (caught) {
        if (!alive.current) return null
        setError(caught?.message || 'The upload failed. Try again.')
        setPhase(UPLOAD_PHASES.FAILED)
        return null
      }
    },
    [cancel],
  )

  /**
   * Resume an interrupted session.
   *
   * Exposed separately because a resume is a different user action from an
   * upload: the file has to be re-chosen (a browser cannot read a file it was
   * given on a previous page load), and the point is that the bytes already on
   * the server are not sent again.
   */
  const resume = useCallback(
    async (uploadId, file, { startConversion = true } = {}) => {
      try {
        const session = await getUpload(uploadId)
        sessionRef.current = session
        setFilename(session.original_filename)

        const sha256 = await sha256Hex(file)
        if (sha256 !== session.declared_sha256 && session.declared_sha256) {
          setError('That is a different file from the one this upload started with.')
          setPhase(UPLOAD_PHASES.FAILED)
          return null
        }
        return await upload(file, { startConversion })
      } catch (caught) {
        setError(caught?.message || 'That upload could not be resumed.')
        setPhase(UPLOAD_PHASES.FAILED)
        return null
      }
    },
    [upload],
  )

  const busy =
    phase === UPLOAD_PHASES.HASHING ||
    phase === UPLOAD_PHASES.UPLOADING ||
    phase === UPLOAD_PHASES.ASSEMBLING

  return { upload, resume, cancel, reset, phase, progress, error, filename, busy }
}
