import { useEffect, useState } from 'react'

/**
 * Scroll-spy. Returns the id of the section currently occupying the viewport.
 * Uses IntersectionObserver rather than scroll math so it stays cheap.
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    if (!elements.length) return

    const visible = new Map()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        })

        if (!visible.size) return

        // Whichever tracked section is showing the most wins.
        const [topId] = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
        setActive((prev) => (prev === topId ? prev : topId))
      },
      {
        // Ignore the band under the fixed navbar, bias toward the upper viewport.
        rootMargin: '-30% 0px -45% 0px',
        threshold: [0.15, 0.35, 0.6],
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return active
}
