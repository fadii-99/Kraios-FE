import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Container from '@/components/ui/Container'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import Section from '@/components/ui/Section'
import BlueprintBackdrop from '@/components/ui/BlueprintBackdrop'
import { about } from '@/lib/content'
import { useBackdropParallax } from '@/hooks/useBackdropParallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Deliberately spare: label, heading and one paragraph on the left, the studio
 * credentials aligned to the right edge. Everything else the page needs to say
 * is said by the sections that follow.
 */
export default function About() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap
        .timeline({ scrollTrigger: { trigger: scope.current, start: 'top 78%', once: true } })
        .fromTo(
          '[data-about-label]',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
        )
        .fromTo(
          '[data-line-inner]',
          { yPercent: 112 },
          { yPercent: 0, duration: 1.15, stagger: 0.1, ease: 'expo.out' },
          '-=0.35',
        )
        .fromTo(
          '[data-about-copy]',
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.85, stagger: 0.08, ease: 'power3.out' },
          '-=0.7',
        )
    },
    { scope, dependencies: [reduced] },
  )

  useBackdropParallax(scope)

  return (
    <Section id="about" tone="light" ref={scope} className="py-[var(--spacing-section)]">
      <BlueprintBackdrop className="text-[var(--tone-ink)]" />

      <Container className="relative">
        {/* index + label, matching every other section's header */}
        <div data-about-label className="flex items-baseline gap-5">
          <span className="label-mono text-[var(--tone-accent)]">{about.index}</span>
          <span className="label-mono text-[var(--tone-muted)]">{about.eyebrow}</span>
        </div>

        <AnimatedHeading lines={about.headingLines} className="mt-8" />

        <div className="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-12">
          <p
            data-about-copy
            className="text-[1.0625rem] leading-relaxed text-[var(--tone-muted)] lg:col-span-6"
          >
            {about.paragraph}
          </p>

          {/* Credentials: flush right, lifted so the block's centre lines up
              with the paragraph's rather than its top edge. */}
          <dl
            data-about-copy
            className="grid grid-cols-2 gap-x-10 self-start lg:col-span-5 lg:col-start-8 lg:-mt-20"
          >
            {about.meta.map((item, i) => (
              <div
                key={item.label}
                className={`border-b border-[var(--tone-line)] pb-5 ${i < 2 ? 'pt-0' : 'pt-6'}`}
              >
                <dt className="label-mono text-[var(--tone-muted)]">{item.label}</dt>
                <dd className="mt-2.5 font-mono text-[1.625rem] font-bold tracking-tight text-[var(--tone-ink)]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  )
}
