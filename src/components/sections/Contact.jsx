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
import ContactForm from '@/components/sections/ContactForm'
import { contact } from '@/lib/content'
import { useBackdropParallax } from '@/hooks/useBackdropParallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * The closing band: two self-serve actions, and a way to ask a question.
 *
 * ORDER IS THE ARGUMENT. Kraios is self-serve, so signing up and booking a
 * walkthrough come first and are real links — they deep-link, they open in a
 * new tab, and neither costs the visitor a wait. The form is the third path,
 * for the questions those two do not answer, and it sits beside them rather
 * than above them so it never reads as the way in.
 *
 * The form is its own component because this one is a layout with a GSAP
 * timeline over it and that one is seven fields of state; keeping them apart
 * is what stops a re-render per keystroke reaching the animated nodes.
 * Everything it submits lands in the support queue an administrator triages.
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
              className="label-ui inline-flex min-h-13 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] px-8 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
            >
              {contact.secondaryCta.label}
            </Link>
          </div>
        </div>

        {/* A ruled break, not a second heading band: the form answers the same
            "get started" question the two buttons do, so it stays inside this
            section rather than becoming a section of its own with its own index
            in the nav. */}
        <div className="mx-auto mt-20 max-w-5xl border-t border-[var(--tone-line)] pt-16 lg:mt-24 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-16">
            <div data-reveal>
              <span className="label-ui text-[var(--tone-accent)]">
                {contact.form.eyebrow}
              </span>

              <h3 className="display-sm mt-5 text-[var(--tone-ink)]">
                {contact.form.heading}
              </h3>

              <p className="mt-6 max-w-[44ch] text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]">
                {contact.form.body}
              </p>
            </div>

            <div data-reveal>
              <ContactForm />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
