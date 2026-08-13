import { useEffect, useState } from 'react'

/** Used only until the real bar can be measured. */
const NAV_FALLBACK = 68

/**
 * How far below the fixed navbar the "reading line" sits.
 *
 * It has to clear every way a section can arrive at the top of the screen:
 * `scrollToSection` parks a clicked section at `navHeight - 1`, and a native
 * anchor jump (skip link, #hash URL) parks it at `scroll-padding-top`, which
 * is 4.5rem. 16px puts the line below both with room for sub-pixel rounding
 * and smooth-scroll overshoot, so whichever route the user took, the section
 * they landed on is the one that lights up.
 */
const LINE_OFFSET = 16

/**
 * Scroll-spy for the landing-page navigation.
 *
 * The root margin collapses the viewport to a **1px horizontal line** just under
 * the fixed navbar. The sections tile the page with no gaps, so exactly one of
 * them can cross that line at a time — which is what makes this flicker-free
 * and, crucially, independent of section height.
 *
 * That last part is why the previous "largest intersectionRatio wins" version
 * had to go: ratio is measured against the element's own height, so a 4000px
 * section like How It Works could never out-score a 700px one like About, and
 * with a 25%-tall band it could not even reach the lowest threshold. Tall
 * sections simply never won.
 *
 * Cost: one IntersectionObserver, no scroll listener, no per-frame maths. The
 * callback fires only when a section boundary actually crosses the line.
 *
 * Pass an empty `ids` array off the landing page — there is nothing to observe.
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (!ids.length) return

    let observer = null
    let onResize = null
    let retry = 0
    let frame = 0
    let attempts = 0

    const start = () => {
      const els = ids.map((id) => document.getElementById(id)).filter(Boolean)

      // `Home` is a lazy route: on a cold navigation to `/` the sections have
      // not mounted yet when this first runs. Keep looking for a few seconds
      // instead of silently going dead for the rest of the session.
      if (!els.length) {
        if (attempts++ < 40) retry = window.setTimeout(start, 120)
        return
      }

      const order = els.map((el) => el.id)
      const visible = new Set()

      const resolve = () => {
        const next = visible.size
          ? // DOM order breaks the tie on the one frame where two sections
            // share the boundary pixel, so the value never oscillates.
            order.find((id) => visible.has(id))
          : // Nothing on the line: either above the first section (page top)
            // or past the last one, scrolled down into the footer.
            els[0].getBoundingClientRect().top > 0
            ? order[0]
            : order[order.length - 1]

        setActive((prev) => (prev === next ? prev : next))
      }

      const build = () => {
        observer?.disconnect()
        visible.clear()

        const bar = document.querySelector('[data-navbar]')
        const navHeight = bar?.offsetHeight || NAV_FALLBACK
        const line = Math.min(navHeight + LINE_OFFSET, Math.max(window.innerHeight - 2, 1))

        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) visible.add(entry.target.id)
              else visible.delete(entry.target.id)
            }
            resolve()
          },
          {
            rootMargin: `${-line}px 0px ${-(window.innerHeight - line - 1)}px 0px`,
            threshold: 0,
          },
        )

        for (const el of els) observer.observe(el)
      }

      build()

      // The margin is derived from the viewport height, so a resize is the one
      // thing that invalidates it. Rare, and coalesced into a frame.
      onResize = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(build)
      }
      window.addEventListener('resize', onResize)
    }

    start()

    return () => {
      window.clearTimeout(retry)
      cancelAnimationFrame(frame)
      observer?.disconnect()
      if (onResize) window.removeEventListener('resize', onResize)
    }
  }, [ids])

  // Derived rather than reset inside the effect: off the landing page there is
  // nothing to observe, and clearing via setState would only cost a cascading
  // render to reach the same answer.
  return ids.length ? active : ''
}
