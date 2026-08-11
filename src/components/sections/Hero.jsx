import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, Play } from '@phosphor-icons/react'

import Container from '@/components/ui/Container'
import { hero } from '@/lib/content'
import { scrollToSection } from '@/lib/scroll'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Video-first hero. Copy sits left over a side scrim rather than centred over a
 * blanket overlay — that keeps the footage visible, which is the whole point of
 * having it. Overlays stay light; legibility comes from the left gradient.
 */
export default function Hero() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [srcIndex, setSrcIndex] = useState(0)
  const [videoReady, setVideoReady] = useState(false)

  const sources = [hero.video, hero.videoFallback]

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })

      tl.fromTo(
        '[data-hero-video]',
        { scale: 1.14 },
        { scale: 1, duration: 2.8, ease: 'power2.out' },
        0,
      )
        .fromTo('[data-hero-eyebrow]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9 }, 0.3)
        .fromTo(
          '[data-line-inner]',
          { yPercent: 115 },
          { yPercent: 0, duration: 1.3, stagger: 0.1 },
          0.4,
        )
        .fromTo('[data-hero-body]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9 }, 1.05)
        .fromTo(
          '[data-hero-cta]',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 },
          1.2,
        )

      gsap.to('[data-hero-media]', {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
      })

      gsap.to('[data-hero-copy]', {
        opacity: 0,
        y: -60,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: '45% top', end: 'bottom top', scrub: 0.5 },
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      id="home"
      ref={scope}
      className="tone-dark relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* ---------------- media ----------------
          z-0, NOT -z-10. The section carries an opaque `tone-dark` background,
          and a negative z-index child paints *behind* that background — which
          hid the video and the poster completely. Content sits at z-10 above. */}
      <div data-hero-media className="absolute inset-0 z-0">
        <div data-hero-video className="absolute inset-0 will-change-transform">
          {/* The poster is the LCP element until the video fades in, so it
              stays eager and high priority — but a phone should not fetch the
              1920w render to fill a 390px frame. */}
          <img
            src={hero.poster}
            srcSet={hero.posterSrcSet}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <video
            key={sources[srcIndex]}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
            src={sources[srcIndex]}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
            onError={() => {
              setVideoReady(false)
              setSrcIndex((i) => (i < sources.length - 1 ? i + 1 : i))
            }}
          />
        </div>

        <div aria-hidden="true" className="scrim-hero absolute inset-0" />
        <div aria-hidden="true" className="scrim-left absolute inset-0" />
      </div>

      {/* ---------------- copy ---------------- */}
      {/* Slightly more top than bottom padding sits the copy just below centre —
          enough to feel deliberate without dropping it to the fold. */}
      <Container data-hero-copy className="relative z-10 pb-24 pt-40 lg:pb-28 lg:pt-48">
        <div className="max-w-[52rem]">
          <p
            data-hero-eyebrow
            className="label-mono mb-8 flex items-center gap-3.5 text-accent"
          >
            <span className="h-px w-10 bg-accent" aria-hidden="true" />
            {hero.eyebrow}
          </p>

          {/* Both lines are solid white — a tinted second line reads as a blue
              wash over the type rather than as hierarchy. */}
          <h1 className="display-xl text-white [text-shadow:0_2px_28px_rgba(7,20,38,0.62)]">
            {hero.headlineLines.map((line) => (
              <span key={line} className="line-mask">
                <span className="block" data-line-inner>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            data-hero-body
            className="mt-10 max-w-[34rem] text-[1.0625rem] leading-relaxed text-white/85 sm:text-[1.125rem]"
          >
            {hero.body}
          </p>

          <div className="mt-11 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            {/* White fill over video reads cleaner than a colour block — the
                blue stays as the accent on the eyebrow and details. */}
            <button
              data-hero-cta
              type="button"
              onClick={() => scrollToSection(hero.primaryCta.target)}
              className="label-mono group inline-flex min-h-13 cursor-pointer items-center justify-center gap-3 bg-white px-8 py-4 text-ink-dark transition-colors duration-300 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {hero.primaryCta.label}
              <ArrowRight
                size={15}
                weight="bold"
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>

            <button
              data-hero-cta
              type="button"
              onClick={() => scrollToSection(hero.secondaryCta.target)}
              className="group inline-flex min-h-13 cursor-pointer items-center justify-center gap-3.5 px-2 py-3 text-white transition-colors duration-300 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:justify-start"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/45 transition-colors duration-300 group-hover:border-accent">
                <Play size={13} weight="fill" aria-hidden="true" />
              </span>
              <span className="label-mono">{hero.secondaryCta.label}</span>
            </button>
          </div>
        </div>
      </Container>

    </section>
  )
}
