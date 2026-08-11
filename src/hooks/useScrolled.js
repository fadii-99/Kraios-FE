import { useEffect, useState } from 'react'

/**
 * True once the page has scrolled past `threshold`. Drives the navbar's
 * transparent -> solid transition. Uses a passive listener and only sets
 * state when the boolean actually flips, so it never thrashes React.
 */
export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let frame = 0

    const read = () => {
      frame = 0
      setScrolled((prev) => {
        const next = window.scrollY > threshold
        return prev === next ? prev : next
      })
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [threshold])

  return scrolled
}
