import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Container from '@/components/ui/Container'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import Section from '@/components/ui/Section'
import { team } from '@/lib/content'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

// Staggered vertical offsets — the composition replaces a card grid.
const OFFSETS = ['lg:mt-0', 'lg:mt-28', 'lg:mt-12', 'lg:mt-40']

export default function Team() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-line-inner]',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.15,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: '[data-heading]', start: 'top 88%', once: true },
        },
      )

      gsap.fromTo(
        '[data-reveal]',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: scope.current, start: 'top 75%', once: true },
        },
      )

      // Signature move: portraits wipe up and settle from a scaled crop.
      gsap.utils.toArray('[data-portrait]').forEach((portrait, i) => {
        const img = portrait.querySelector('img')

        gsap
          .timeline({
            scrollTrigger: { trigger: portrait, start: 'top 86%', once: true },
          })
          .fromTo(
            portrait,
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.out', delay: i * 0.08 },
          )
          .fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.5, ease: 'expo.out' }, '<')
      })

      // Slow differential drift between columns for depth. Desktop only: it is
      // a multi-column composition device, and below lg the members stack into
      // one column where opposing drift just unevens the rhythm — while still
      // paying for four scrubbed transforms on every scroll frame.
      const mm = gsap.matchMedia()

      mm.add('(min-width: 1024px)', () => {
        scope.current.querySelectorAll('[data-member]').forEach((member, i) => {
          gsap.to(member, {
            yPercent: i % 2 === 0 ? -5 : 5,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          })
        })
      })

      return () => mm.revert()
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <Section id="team" tone="deep" ref={scope} className="py-[var(--spacing-section)]">
      <Container>
        <div
          className="flex items-baseline gap-5 border-t border-[var(--tone-line)] pt-5"
          data-reveal
        >
          <span className="label-ui text-[var(--tone-accent)]">{team.index}</span>
          <span className="label-ui text-[var(--tone-muted)]">{team.eyebrow}</span>
        </div>

        <AnimatedHeading lines={team.headingLines} className="mt-10" />

        {/* intro sits under the heading on the left in every section */}
        <p
          className="measure mt-8 text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]"
          data-reveal
        >
          {team.intro}
        </p>

        <ul className="mt-20 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:mt-28 lg:grid-cols-4">
          {team.members.map((member, i) => (
            <li
              key={member.name}
              data-member
              className={cn('group', OFFSETS[i % OFFSETS.length])}
            >
              <div
                data-portrait
                className="relative overflow-hidden bg-elevated"
                style={{ aspectRatio: '3 / 4' }}
              >
                <img
                  src={member.image}
                  srcSet={member.srcSet}
                  sizes={team.imageSizes}
                  alt={`${member.name}, ${member.role}`}
                  width="900"
                  height="1200"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover grayscale transition-all duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06] group-hover:grayscale-0"
                />

                {/* overlay lifts on hover — a state change, not decoration */}
                <div
                  aria-hidden="true"
                  className="scrim-media absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[3px] w-0 bg-[var(--tone-accent)] transition-[width] duration-[600ms] ease-[var(--ease-out-expo)] group-hover:w-full"
                />
              </div>

              <div className="mt-6" data-reveal>
                <h3 className="text-[1.125rem] font-semibold tracking-tight text-[var(--tone-ink)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5">
                  {member.name}
                </h3>
                <p className="label-ui mt-2.5 text-[var(--tone-accent)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5">
                  {member.role}
                </p>
                {/* The collective fourth slot carries no bio, so the row is
                    omitted rather than rendered as an empty gap. */}
                {member.meta && (
                  <p className="mt-2.5 text-[0.875rem] leading-relaxed text-[var(--tone-muted)]">
                    {member.meta}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
