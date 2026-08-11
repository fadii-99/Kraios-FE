import { cn } from '@/lib/cn'

/**
 * Oversized uppercase heading, split into masked lines for a per-line reveal.
 *
 * The inner span is the animation target (`[data-line-inner]`); the outer span
 * clips it. Resting state is visible — animations move *from* an offset, so if
 * JS never runs the text still reads.
 */
export default function AnimatedHeading({
  lines,
  as: Tag = 'h2',
  size = 'display-lg',
  className,
  lineClassName,
}) {
  return (
    <Tag className={cn(size, className)} data-heading>
      {lines.map((line) => (
        <span key={line} className="line-mask">
          <span className={cn('block', lineClassName)} data-line-inner>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}
