import { useState } from 'react'
import { File, FilePdf, ImageSquare } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

const KIND_ICON = {
  image: ImageSquare,
  pdf: FilePdf,
}

/**
 * The picture on a conversion row: the plan the user uploaded.
 *
 * WHAT IT SHOWS, IN ORDER, and why that order:
 *
 *   1. The UPLOADED IMAGE. It is what the user recognises the row by — they
 *      chose the file — and it exists from the moment the upload finishes,
 *      long before a model does. Drawn `contain` on white, because a floor
 *      plan cropped to fill a 4:3 box loses the edges that identify it.
 *   2. The Blender render (`thumbnailUrl`), for a PDF or DXF upload, which a
 *      browser cannot draw in an `<img>`.
 *   3. A file-type mark.
 *
 * A source that fails to load — a file missing from storage answers 404 —
 * falls through to the next candidate instead of leaving the browser's broken
 * image icon on the card. The parent keys this component by the candidate
 * urls, so a thumbnail that appears later starts again from the top.
 */
export default function ConversionThumbnail({ conversion, className }) {
  const source = conversion.source
  const candidates = []
  if (source?.kind === 'image' && source.fileUrl) {
    candidates.push({ url: source.fileUrl, fit: 'object-contain bg-white' })
  }
  if (conversion.thumbnailUrl) {
    candidates.push({ url: conversion.thumbnailUrl, fit: 'object-cover' })
  }

  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const current = candidates[index]
  const Icon = KIND_ICON[source?.kind] ?? File

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[var(--tone-line)] bg-[var(--color-light)]',
        className,
      )}
    >
      {current ? (
        <img
          key={current.url}
          src={current.url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false)
            setIndex((value) => value + 1)
          }}
          className={cn(
            'h-full w-full transition-opacity duration-300 motion-reduce:transition-none',
            current.fit,
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <Icon size={20} aria-hidden="true" className="text-[var(--tone-ink-soft)]" />
      )}
    </div>
  )
}
