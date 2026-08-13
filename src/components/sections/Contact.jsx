import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Container from '@/components/ui/Container'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Section from '@/components/ui/Section'
import BlueprintBackdrop from '@/components/ui/BlueprintBackdrop'
import { contact } from '@/lib/content'
import { useBackdropParallax } from '@/hooks/useBackdropParallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * The closing call to action, not a project enquiry.
 *
 * Kraios is self-serve, so this section drives account creation first and a
 * scheduled walkthrough second. It deliberately carries no form: the only form
 * the visitor should meet is the one inside the flow they chose, on /signup.
 * Both actions are real links, so they deep-link and open in a new tab.
 */
export default function Contact() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap
        .timeline({ scrollTrigger: { trigger: scope.current, start: 'top 76%', once: true } })
        .fromTo(
          '[data-line-inner]',
          { yPercent: 112 },
          { yPercent: 0, duration: 1.15, stagger: 0.1, ease: 'expo.out' },
        )
        .fromTo(
          '[data-reveal]',
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' },
          '-=0.75',
        )
    },
    { scope, dependencies: [reduced] },
  )

  useBackdropParallax(scope)

  return (
    <Section id="contact" tone="light" ref={scope} className="py-[var(--spacing-section)]">
      <BlueprintBackdrop className="text-[var(--tone-ink)]" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex items-baseline justify-center gap-5" data-reveal>
            <span className="label-ui text-[var(--tone-accent)]">{contact.index}</span>
            <span className="label-ui text-[var(--tone-muted)]">{contact.eyebrow}</span>
          </div>

          <AnimatedHeading lines={contact.headingLines} className="mt-8" />

          <p
            className="mx-auto mt-8 max-w-[56ch] text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]"
            data-reveal
          >
            {contact.body}
          </p>

          {/* Primary fills, secondary is a hairline box — the same two-tier
              pairing the hero uses, inverted for a light band. */}
          <div
            data-reveal
            className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center"
          >
            <PrimaryButton as={Link} to={contact.primaryCta.to} align="center">
              {contact.primaryCta.label}
            </PrimaryButton>

            <Link
              to={contact.secondaryCta.to}
              className="label-ui inline-flex min-h-13 cursor-pointer items-center justify-center border border-[var(--tone-line-strong)] px-8 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
            >
              {contact.secondaryCta.label}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
