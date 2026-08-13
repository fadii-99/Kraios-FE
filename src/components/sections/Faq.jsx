import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Plus } from '@phosphor-icons/react'

import Container from '@/components/ui/Container'
import AnimatedHeading from '@/components/ui/AnimatedHeading'
import Section from '@/components/ui/Section'
import BlueprintBackdrop from '@/components/ui/BlueprintBackdrop'
import { faq } from '@/lib/content'
import { useBackdropParallax } from '@/hooks/useBackdropParallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

/**
 * One question. Only the panel height animates — the rest is CSS transitions,
 * which is all this section needs. State is announced properly for screen
 * readers and the whole row is a real <button> inside its heading.
 */
function FaqItem({ item, index, isOpen, onToggle, reduced }) {
  const panelRef = useRef(null)
  const id = `faq-${index}`

  useGSAP(
    () => {
      const panel = panelRef.current
      if (!panel) return

      if (reduced) {
        gsap.set(panel, { height: isOpen ? 'auto' : 0 })
        return
      }

      gsap.to(panel, {
        height: isOpen ? 'auto' : 0,
        duration: isOpen ? 0.5 : 0.36, // exit faster than enter
        ease: isOpen ? 'power3.out' : 'power2.in',
        overwrite: 'auto',
      })
    },
    { dependencies: [isOpen, reduced] },
  )

  return (
    <li className="border-b border-[var(--tone-line)]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          className="group flex w-full cursor-pointer items-center justify-between gap-8 py-6 text-left"
        >
          <span
            className={cn(
              'max-w-[30ch] text-[1.0625rem] font-semibold tracking-tight transition-colors duration-300 sm:text-[1.1875rem]',
              isOpen
                ? 'text-[var(--tone-accent)]'
                : 'text-[var(--tone-ink)] group-hover:text-[var(--tone-accent)]',
            )}
          >
            {item.q}
          </span>

          <span
            aria-hidden="true"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center transition-[transform,color] duration-400 ease-[var(--ease-out-expo)]',
              isOpen
                ? 'rotate-45 text-[var(--tone-accent)]'
                : 'text-[var(--tone-muted)] group-hover:text-[var(--tone-accent)]',
            )}
          >
            <Plus size={18} weight="bold" />
          </span>
        </button>
      </h3>

      <div
        ref={panelRef}
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className="h-0 overflow-hidden"
      >
        <p className="max-w-[62ch] pb-7 pr-10 text-[0.9375rem] leading-relaxed text-[var(--tone-muted)] sm:text-[1rem]">
          {item.a}
        </p>
      </div>
    </li>
  )
}

export default function Faq() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  // -1 closes everything; only one item is ever open.
  const [open, setOpen] = useState(0)

  useGSAP(
    () => {
      if (reduced) return

      // Deliberately restrained: label, heading, copy. The list itself just
      // fades — a per-row slide would over-animate a reading section.
      gsap
        .timeline({ scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true } })
        .fromTo(
          '[data-faq-label]',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        )
        .fromTo(
          '[data-line-inner]',
          { yPercent: 112 },
          { yPercent: 0, duration: 1.05, stagger: 0.09, ease: 'expo.out' },
          '-=0.3',
        )
        .fromTo(
          '[data-faq-intro]',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
          '-=0.65',
        )
        .fromTo(
          '[data-faq-list]',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
          '-=0.5',
        )
    },
    { scope, dependencies: [reduced] },
  )

  useBackdropParallax(scope)

  return (
    // Contact follows with its own top padding — a full section pad here would
    // double up into dead space.
    <Section
      id="faq"
      tone="light"
      ref={scope}
      className="pb-20 pt-[var(--spacing-section)] lg:pb-24"
    >
      <BlueprintBackdrop className="text-[var(--tone-ink)]" />

      <Container className="relative">
        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p data-faq-label className="label-ui text-[var(--tone-accent)]">
              {faq.eyebrow}
            </p>

            {/* The one heading that intentionally stays three lines */}
            <AnimatedHeading lines={faq.headingLines} className="display-lg--stack mt-7" />

            <p
              data-faq-intro
              className="measure mt-8 text-[1.0625rem] leading-relaxed text-[var(--tone-muted)]"
            >
              {faq.intro}
            </p>
          </div>

          <ul
            data-faq-list
            className="border-t border-[var(--tone-line)] lg:col-span-6 lg:col-start-7"
          >
            {faq.items.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                index={i}
                isOpen={open === i}
                onToggle={() => setOpen(open === i ? -1 : i)}
                reduced={reduced}
              />
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  )
}
