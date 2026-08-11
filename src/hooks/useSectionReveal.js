import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * The shared motion vocabulary every section draws from. Sections combine these
 * with their own signature move, so the page feels like one system rather than
 * one animation repeated seven times.
 *
 *   [data-heading] / [data-line-inner] → masked per-line rise
 *   [data-reveal]                      → fade + small rise, staggered
 *   [data-figure]                      → clip-path wipe
 *   [data-parallax]                    → slow drift (media only)
 *
 * Every tween is scoped to `ref`, so useGSAP reverts them on unmount.
 */
export function useSectionReveal(ref, options = {}) {
  const { parallax = true, revealStart = 'top 80%', clipFrom = 'bottom' } = options
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      // --- masked heading lines ---
      gsap.utils.toArray('[data-heading]').forEach((heading) => {
        const lines = heading.querySelectorAll('[data-line-inner]')
        if (!lines.length) return

        gsap.fromTo(
          lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.15,
            ease: 'expo.out',
            stagger: 0.1,
            scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
          },
        )
      })

      // --- generic reveals ---
      const reveals = gsap.utils.toArray('[data-reveal]')
      if (reveals.length) {
        gsap.fromTo(
          reveals,
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: ref.current, start: revealStart, once: true },
          },
        )
      }

      // --- figures: clip wipe + optional drift ---
      const CLIP = {
        bottom: 'inset(0% 0% 100% 0%)',
        left: 'inset(0% 100% 0% 0%)',
        right: 'inset(0% 0% 0% 100%)',
      }

      gsap.utils.toArray('[data-figure]').forEach((figure) => {
        gsap.fromTo(
          figure,
          { clipPath: CLIP[clipFrom] ?? CLIP.bottom },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.35,
            ease: 'expo.out',
            scrollTrigger: { trigger: figure, start: 'top 88%', once: true },
          },
        )

        if (!parallax) return

        const media = figure.querySelector('[data-parallax]')
        if (!media) return

        gsap.fromTo(
          media,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: {
              trigger: figure,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          },
        )
      })
    },
    { scope: ref, dependencies: [reduced] },
  )
}
