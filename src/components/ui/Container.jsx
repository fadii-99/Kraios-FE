import { cn } from '@/lib/cn'

/** Consistent page gutter + max measure. The only horizontal rhythm on the page. */
export default function Container({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag
      className={cn('mx-auto w-full max-w-[88rem] px-[var(--spacing-gutter)]', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
