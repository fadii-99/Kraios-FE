import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Drifts the `BlueprintBackdrop` layers at different rates so the light bands
 * gain depth. About, Why Choose Us, FAQ and Contact all shared a byte-identical
 * copy of this block; it lives here once now.
 *
 * Desktop-only, via `gsap.matchMedia`. These layers sit between 5% and 22%
 * opacity — on a phone they are barely perceptible, but the tweens are `scrub`,
 * so they would still drive four scroll-linked transforms every frame. Below
 * `minWidth` matchMedia reverts them and the layers rest at their natural
 * position. Nothing changes at or above 1024px.
 */
export function useBackdropParallax(scope, { minWidth = 1024 } = {}) {
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced || !scope.current) return

      const mm = gsap.matchMedia()

      mm.add(`(min-width: ${minWidth}px)`, () => {
        for (const layer of scope.current.querySelectorAll('[data-bp-layer]')) {
          const depth = Number(layer.dataset.bpLayer)

          gsap.fromTo(
            layer,
            { yPercent: -depth * 1.2 },
            {
              yPercent: depth * 1.2,
              ease: 'none',
              scrollTrigger: {
                trigger: scope.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.1,
              },
            },
          )
        }
      })

      return () => mm.revert()
    },
    { scope, dependencies: [reduced, minWidth] },
  )
}
