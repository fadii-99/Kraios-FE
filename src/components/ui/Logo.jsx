import { site } from '@/lib/content'
import { cn } from '@/lib/cn'

/**
 * The brand mark. Used by the Navbar and the Footer, so the two can never drift
 * apart.
 *
 * Mark only — no wordmark. With no text beside it the mark carries the brand on
 * its own, so it is set larger than a lockup glyph would be, and larger again in
 * the footer where there is room.
 *
 * Served from `website_logo-128.png`, a downscaled copy of the supplied
 * `website_logo.png` (1192×1192 / 342kB — see the note in `content.js`). The PNG
 * carries real transparency, so it sits correctly on the navy footer, on the
 * light auth bar and over the hero video.
 */

// Static classes, not interpolated: Tailwind only emits what it can see.
const SIZES = {
  nav: { cls: 'h-10 w-10', px: 40 },
  footer: { cls: 'h-14 w-14', px: 56 },
}

export default function Logo({ className, onClick, size = 'nav' }) {
  const Tag = onClick ? 'button' : 'span'
  const { cls, px } = SIZES[size] ?? SIZES.nav

  return (
    <Tag
      onClick={onClick}
      // The mark is the only content, so the accessible name has to come from
      // here — there is no longer a wordmark to read.
      aria-label={onClick ? `${site.name} — back to top` : undefined}
      className={cn(
        'group inline-flex items-center text-[var(--tone-ink)]',
        onClick &&
          'touch:min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4',
        className,
      )}
    >
      <img
        src={site.logo}
        alt={onClick ? '' : site.name}
        width={px}
        height={px}
        decoding="async"
        className={cn('shrink-0 object-contain', cls)}
      />
    </Tag>
  )
}
