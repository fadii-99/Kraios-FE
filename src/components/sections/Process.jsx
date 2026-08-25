import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Container from '@/components/ui/Container'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import Section from '@/components/ui/Section'
import { PROCESS_SIZES, process } from '@/lib/content'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

/**
 * The whole in-platform workflow as one section: upload → 3D model →
 * materials/quantities/pricing → exported BoQ.
 *
 * Desktop: the visual column is CSS-sticky (not GSAP-pinned — sticky survives
 * refreshes and never fights native scroll) while the step column scrolls past.
 * ScrollTrigger only reports which step is active; GSAP crossfades the media.
 *
 * Tablet / mobile: no sticky, no pin. Each step stacks with its own image and a
 * simple reveal, which is what actually works on touch.
 */
export default function Process() {
  const scope = useRef(null)
  const mediaRefs = useRef([])
  const numberRef = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [active, setActive] = useState(0)

  // --- entrance + which-step-is-active tracking ---
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
          scrollTrigger: { trigger: scope.current, start: 'top 72%', once: true },
        },
      )

      // Progress rail fills with the scrollbar.
      gsap.fromTo(
        '[data-progress]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          transformOrigin: 'top center',
          scrollTrigger: {
            trigger: '[data-steps]',
            start: 'top 65%',
            end: 'bottom 75%',
            scrub: 0.6,
          },
        },
      )

      // Each step owns a trigger band; entering it makes that step active.
      gsap.utils.toArray('[data-step]').forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 62%',
          end: 'bottom 55%',
          onToggle: ({ isActive }) => isActive && setActive(i),
        })

        gsap.fromTo(
          step,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'expo.out',
            scrollTrigger: { trigger: step, start: 'top 85%', once: true },
          },
        )

        // Mobile-only inline images get their own wipe.
        const inline = step.querySelector('[data-step-media]')
        if (inline) {
          gsap.fromTo(
            inline,
            { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.08 },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              scale: 1,
              duration: 1.2,
              ease: 'expo.out',
              scrollTrigger: { trigger: inline, start: 'top 88%', once: true },
            },
          )
        }
      })
    },
    { scope, dependencies: [reduced] },
  )

  // --- crossfade the sticky visual whenever the active step changes ---
  useEffect(() => {
    if (reduced) return

    const layers = mediaRefs.current.filter(Boolean)
    const tweens = []

    layers.forEach((layer, i) => {
      const isActive = i === active
      tweens.push(
        gsap.to(layer, {
          clipPath: isActive ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)',
          opacity: isActive ? 1 : 0,
          scale: isActive ? 1 : 1.06,
          duration: 1.1,
          ease: 'expo.out',
          overwrite: 'auto',
        }),
      )
    })

    if (numberRef.current) {
      tweens.push(
        gsap.fromTo(
          numberRef.current,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' },
        ),
      )
    }

    return () => tweens.forEach((t) => t.kill())
  }, [active, reduced])

  return (
    <Section id="process" tone="dark" className="py-[var(--spacing-section)]">
      <div ref={scope}>
        <Container>
          <div
            className="flex items-baseline gap-5 border-t border-[var(--tone-line)] pt-5"
            data-reveal
          >
            <span className="label-ui text-[var(--tone-accent)]">{process.index}</span>
            <span className="label-ui text-[var(--tone-muted)]">{process.eyebrow}</span>
          </div>

          <AnimatedHeading lines={process.headingLines} className="mt-10" />

          {/* intro sits under the heading on the left in every section */}
          <p
            className="measure mt-8 text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]"
            data-reveal
          >
            {process.intro}
          </p>

          {/* ---------- story ---------- */}
          <div className="mt-20 lg:mt-28 lg:grid lg:grid-cols-12 lg:gap-x-16">
            {/* sticky visual (desktop only) */}
            <div className="hidden lg:col-span-6 lg:block">
              <div className="sticky top-28">
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-md bg-elevated">
                  {process.steps.map((step, i) => (
                    <div
                      key={step.number}
                      ref={(el) => {
                        mediaRefs.current[i] = el
                      }}
                      className="absolute inset-0"
                      style={{
                        clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)',
                        opacity: i === 0 ? 1 : 0,
                      }}
                      aria-hidden={i !== active}
                    >
                      {/* All four load up front: they swap on scroll, so a lazy
                          fetch would leave the active layer blank mid-story.
                          Same `sizes` as the inline tablet/mobile copy below,
                          so both resolve to one candidate and one request. */}
                      <img
                        src={step.image.src}
                        srcSet={step.image.srcSet}
                        sizes={PROCESS_SIZES}
                        alt={step.image.alt}
                        loading="eager"
                        decoding="async"
                        fetchPriority={i === 0 ? 'high' : 'low'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}

                  {/* oversized active step number, over the visual */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6"
                  >
                    <span
                      ref={numberRef}
                      className="text-[clamp(3.5rem,7vw,6rem)] font-bold leading-none tabular-nums tracking-tighter text-white drop-shadow-[0_2px_24px_rgba(7,20,38,0.85)]"
                    >
                      {process.steps[active].number}
                    </span>
                    <span className="label-ui rounded-xs bg-navy/70 px-3 py-2 text-white/85 backdrop-blur-sm">
                      {process.steps[active].meta}
                    </span>
                  </div>
                </div>

                {/* step ticks */}
                <ol className="mt-6 flex gap-2" aria-label="Process progress">
                  {process.steps.map((step, i) => (
                    <li key={step.number} className="h-0.5 flex-1 bg-[var(--tone-line)]">
                      <span
                        className={cn(
                          'block h-full origin-left bg-[var(--tone-accent)] transition-transform duration-700 ease-[var(--ease-out-expo)]',
                          i <= active ? 'scale-x-100' : 'scale-x-0',
                        )}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* steps */}
            <div data-steps className="relative lg:col-span-6">
              {/* mobile rail */}
              <div
                aria-hidden="true"
                className="absolute bottom-4 left-[7px] top-4 w-px bg-[var(--tone-line)] lg:hidden"
              >
                <div data-progress className="h-full w-full origin-top bg-[var(--tone-accent)]" />
              </div>

              <ol className="space-y-16 lg:space-y-0">
                {process.steps.map((step, i) => (
                  <li
                    key={step.number}
                    data-step
                    className={cn(
                      'group relative pl-9 lg:flex lg:min-h-[78vh] lg:flex-col lg:justify-center lg:pl-0',
                      i === active && 'is-active',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-0 top-2 h-3.5 w-3.5 rounded-xs border transition-colors duration-500 lg:hidden',
                        i === active
                          ? 'border-[var(--tone-accent)] bg-[var(--tone-accent)]'
                          : 'border-[var(--tone-line-strong)] bg-[var(--tone-bg)]',
                      )}
                    />

                    <div className="flex items-baseline gap-5">
                      <span
                        className={cn(
                          'text-[2.5rem] font-bold leading-none tabular-nums tracking-tighter transition-all duration-700 lg:text-[3.5rem]',
                          i === active
                            ? 'text-[var(--tone-accent)] opacity-100'
                            : 'text-[var(--tone-muted)] opacity-40',
                        )}
                      >
                        {step.number}
                      </span>
                      <span className="h-px flex-1 bg-[var(--tone-line)]" aria-hidden="true" />
                      {/* text-right so the longer chip strings stay a flush
                          right-hand annotation when they wrap on mobile. */}
                      <span className="label-ui text-right text-[var(--tone-muted)]">
                        {step.meta}
                      </span>
                    </div>

                    {/* One step below the section heading. `display-sm`, not
                        `display-lg` + a text-[] override — the override never
                        applied, so these rendered at the full 89px section size
                        and were clipped mid-word inside the 6-column rail. */}
                    <h3 className="display-sm mt-7">{step.title}</h3>

                    <p className="measure mt-6 text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]">
                      {step.body}
                    </p>

                    {/* inline visual for tablet / mobile */}
                    <div
                      data-step-media
                      className="relative mt-8 aspect-4/3 w-full overflow-hidden rounded-md bg-elevated lg:hidden"
                    >
                      <img
                        src={step.image.src}
                        srcSet={step.image.srcSet}
                        sizes={PROCESS_SIZES}
                        alt={step.image.alt}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </div>
    </Section>
  )
}
