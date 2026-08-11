import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Process from '@/components/sections/Process'
import WhyUs from '@/components/sections/WhyUs'
import Team from '@/components/sections/Team'
import Faq from '@/components/sections/Faq'
import Contact from '@/components/sections/Contact'
import { scrollToSection } from '@/lib/scroll'

export default function Home() {
  const location = useLocation()

  // Fonts and lazy images change layout height after first paint; without a
  // refresh, every ScrollTrigger start/end is measured against stale values.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()

    if (document.fonts?.ready) document.fonts.ready.then(refresh)
    window.addEventListener('load', refresh)

    return () => window.removeEventListener('load', refresh)
  }, [])

  /**
   * Arriving from an auth page via a nav link: the Navbar routes here with the
   * target section in location.state. Two frames of delay lets the sections
   * mount and lay out before we measure the scroll offset.
   */
  useEffect(() => {
    const target = location.state?.scrollTo
    if (!target) return

    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        scrollToSection(target)
        // clear the state so a refresh doesn't re-scroll
        window.history.replaceState({}, '')
      })
    })

    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [location.state])

  return (
    <>
      <a
        href="#main"
        className="label-mono sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-5 focus:py-3 focus:text-ink-dark"
      >
        Skip to content
      </a>

      <main id="main">
        <Hero />
        <About />
        <Process />
        <WhyUs />
        <Team />
        <Faq />
        <Contact />
      </main>
    </>
  )
}
