import { cn } from '@/lib/cn'

const TONES = {
  dark: 'tone-dark',
  deep: 'tone-deep',
  light: 'tone-light',
}

/**
 * A page band. Declares its tone; children read --tone-* vars, so the same
 * component renders correctly on a navy or a light band without knowing which.
 */
export default function Section({
  id,
  tone = 'dark',
  className,
  children,
  ref,
  ...rest
}) {
  return (
    <section
      id={id}
      ref={ref}
      // overflow-x-clip, NOT overflow-hidden: `hidden` makes this a scroll
      // container and silently breaks `position: sticky` in every descendant.
      // `clip` contains the parallax bleed without creating a scrollport.
      className={cn(TONES[tone], 'relative overflow-x-clip', className)}
      {...rest}
    >
      {children}
    </section>
  )
}
