import { cn } from '@/lib/cn'

/**
 * Media wrapper with a reserved aspect ratio (prevents CLS) and a clip-path
 * reveal target. `scale-105` on the inner image gives the parallax drift room
 * to move without exposing an edge.
 */
export default function Figure({
  src,
  alt,
  ratio = '4 / 3',
  className,
  imgClassName,
  priority = false,
  children,
}) {
  return (
    <figure
      className={cn('relative overflow-hidden bg-elevated', className)}
      style={{ aspectRatio: ratio }}
      data-figure
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn('h-full w-full scale-105 object-cover', imgClassName)}
        data-parallax
      />
      {children}
    </figure>
  )
}
