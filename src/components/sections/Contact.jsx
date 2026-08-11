import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Container from '@/components/ui/Container'
import ContactForm from '@/components/sections/ContactForm'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import Section from '@/components/ui/Section'
import BlueprintBackdrop from '@/components/ui/BlueprintBackdrop'
import { contact } from '@/lib/content'
import { useBackdropParallax } from '@/hooks/useBackdropParallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * The simplest section on the page: a centred heading and the form beneath it,
 * nothing else. Phone, email and address still live in the footer, so removing
 * the detail rows here loses nothing.
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

      // fields arrive one after another
      gsap.fromTo(
        '[data-form] form > *',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.09,
          ease: 'expo.out',
          scrollTrigger: { trigger: '[data-form]', start: 'top 85%', once: true },
        },
      )
    },
    { scope, dependencies: [reduced] },
  )

  useBackdropParallax(scope)

  return (
    <Section id="contact" tone="light" ref={scope} className="py-[var(--spacing-section)]">
      <BlueprintBackdrop className="text-[var(--tone-ink)]" />

      <Container className="relative">
        {/* ---- centred header ---- */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex items-baseline justify-center gap-5" data-reveal>
            <span className="label-mono text-[var(--tone-accent)]">{contact.index}</span>
            <span className="label-mono text-[var(--tone-muted)]">{contact.eyebrow}</span>
          </div>

          <AnimatedHeading lines={contact.headingLines} className="mt-8" />

          <p
            className="mx-auto mt-8 max-w-[56ch] text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]"
            data-reveal
          >
            {contact.body}
          </p>
        </div>

        {/* ---- form ---- */}
        <div data-form className="mx-auto mt-16 max-w-2xl lg:mt-20">
          <ContactForm />

          <p className="label-mono mt-7 text-center text-[var(--tone-muted)]">
            {contact.responseNote}
          </p>
        </div>
      </Container>
    </Section>
  )
}
