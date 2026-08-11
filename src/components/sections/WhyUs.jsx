import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DownloadSimple, Eye, SlidersHorizontal, StackSimple } from '@phosphor-icons/react'

import Container from '@/components/ui/Container'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import Section from '@/components/ui/Section'
import BlueprintBackdrop from '@/components/ui/BlueprintBackdrop'
import { whyUs } from '@/lib/content'
import { useBackdropParallax } from '@/hooks/useBackdropParallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const ICONS = {
  eye: Eye,
  sliders: SlidersHorizontal,
  layers: StackSimple,
  download: DownloadSimple,
}

/**
 * Editorial split: heading + plan artwork on the left, four benefits stacked on
 * the right. The backdrop is architectural line work rather than decoration —
 * blueprint grid, dimension strings and registration marks, all very low
 * opacity and parallaxed at different rates for depth.
 */
export default function WhyUs() {
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
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: scope.current, start: 'top 74%', once: true },
        },
      )

      // 3D visualization wipes open, then drifts gently as the section passes
      gsap.fromTo(
        '[data-why-plan]',
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.3,
          ease: 'expo.out',
          scrollTrigger: { trigger: '[data-why-plan]', start: 'top 90%', once: true },
        },
      )

      // The framed visual is `hidden lg:block`, so below lg this scrub tween
      // drove a transform on a display:none element on every scroll frame.
      const mm = gsap.matchMedia(scope.current)

      mm.add('(min-width: 1024px)', () => {
        gsap.fromTo(
          '[data-why-plan] img',
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.9,
            },
          },
        )
      })

      // benefits: each box lifts in, then its icon settles and copy rises
      gsap.utils.toArray('[data-benefit]').forEach((row) => {
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } })
          .fromTo(
            row,
            { opacity: 0, y: 26 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
          )
          .fromTo(
            row.querySelector('[data-benefit-icon]'),
            { opacity: 0, scale: 0.85 },
            { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' },
            '-=0.6',
          )
          .fromTo(
            row.querySelectorAll('[data-benefit-copy]'),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'expo.out' },
            '-=0.5',
          )
      })

      return () => mm.revert()
    },
    { scope, dependencies: [reduced] },
  )

  useBackdropParallax(scope)

  return (
    <Section id="why" tone="light" ref={scope} className="py-[var(--spacing-section)]">
      <BlueprintBackdrop className="text-[var(--tone-ink)]" />

      <Container className="relative">
        {/* Two columns from the very top: the benefits run alongside the
            heading rather than starting below the intro.
            The left rail is 6 columns wide, not 5 — at the shared heading size
            "WHY CHOOSE US" needs ~532px and would be clipped in a 5-col rail. */}
        <div className="grid gap-x-12 gap-y-16 lg:grid-cols-12">
          {/* ---------------- left: header + 3D visualization ---------------- */}
          <div className="lg:col-span-6">
            <div className="flex items-baseline gap-5" data-reveal>
              <span className="label-mono text-[var(--tone-accent)]">{whyUs.index}</span>
              <span className="label-mono text-[var(--tone-muted)]">{whyUs.eyebrow}</span>
            </div>

            <AnimatedHeading lines={whyUs.headingLines} className="mt-8" />

            <p
              className="measure mt-8 text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]"
              data-reveal
            >
              {whyUs.intro}
            </p>

            {/* 3D visualization, framed like a mounted drawing. Kept inside the
                column now that the benefits sit alongside it. */}
            <div className="relative mt-14 hidden w-full lg:block">
              {/* offset outer rule = a mat around the image, not a chunky border */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 border border-[var(--tone-line)]"
              />

              <div
                data-why-plan
                className="relative aspect-4/3 w-full overflow-hidden border border-[var(--tone-line-strong)] bg-elevated"
              >
                <img
                  src={whyUs.image.src}
                  srcSet={whyUs.image.srcSet}
                  sizes={whyUs.image.sizes}
                  alt={whyUs.image.alt}
                  width="1400"
                  height="1050"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full scale-105 object-cover"
                />

                {/* corner ticks — architectural framing, barely there */}
                <span aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 border-l border-t border-white/60" />
                <span aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 border-r border-t border-white/60" />
                <span aria-hidden="true" className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-white/60" />
                <span aria-hidden="true" className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-white/60" />
              </div>
            </div>

            <p className="label-mono mt-8 hidden text-[var(--tone-muted)] lg:block" data-reveal>
              {whyUs.imageCaption}
            </p>
          </div>

          {/* ---------------- right: boxed benefits ---------------- */}
          {/* starts at column 7 — no empty column between the two halves */}
          <ol className="space-y-4 lg:col-span-6 lg:col-start-7 lg:mt-24">
            {whyUs.reasons.map((reason) => {
              const Icon = ICONS[reason.icon]

              return (
                <li
                  key={reason.title}
                  data-benefit
                  className="border border-[var(--tone-line)] p-6 lg:p-7"
                >
                  <div className="flex items-start gap-5">
                    <span
                      data-benefit-icon
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand/8 text-[var(--tone-accent)]"
                    >
                      <Icon size={24} weight="light" />
                    </span>

                    <div className="min-w-0">
                      <h3
                        data-benefit-copy
                        className="text-[1.0625rem] font-semibold uppercase tracking-[0.04em] text-[var(--tone-ink)] lg:text-[1.125rem]"
                      >
                        {reason.title}
                      </h3>

                      <p
                        data-benefit-copy
                        className="mt-3.5 text-[0.9375rem] leading-relaxed text-[var(--tone-muted)]"
                      >
                        {reason.body}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </Container>
    </Section>
  )
}
