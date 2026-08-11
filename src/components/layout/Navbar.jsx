import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { List } from '@phosphor-icons/react'

import Container from '@/components/ui/Container'
import Logo from '@/components/ui/Logo'
import MobileMenu from '@/components/layout/MobileMenu'
import { authLinks, navLinks } from '@/lib/content'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useScrolled } from '@/hooks/useScrolled'
import { useSectionNavigate } from '@/hooks/useSectionNavigate'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled(60)
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const navigate = useNavigate()
  const { onHome, goToSection } = useSectionNavigate()

  // Transparent only while the bar is actually over the hero video.
  const overHero = onHome && !scrolled

  // Scroll-spy only has sections to watch on the landing page.
  const ids = useMemo(() => (onHome ? navLinks.map((l) => l.id) : []), [onHome])
  const activeId = useActiveSection(ids)

  const go = useCallback(
    (id) => {
      setMenuOpen(false)
      goToSection(id)
    },
    [goToSection],
  )

  const goTo = useCallback(
    (path) => {
      setMenuOpen(false)
      navigate(path)
    },
    [navigate],
  )

  // Stable identity: MobileMenu keys its Escape listener and scroll lock on
  // this, and the Navbar re-renders on every scroll-spy change. An inline
  // arrow would tear that effect down and rebuild it on each of those renders.
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Navbar drops in after the hero headline begins its reveal.
  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        scope.current,
        { yPercent: -100, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', delay: 0.65 },
      )

      gsap.fromTo(
        '[data-nav-item]',
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 1.1 },
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <>
      <header
        ref={scope}
        data-navbar
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-out-expo)]',
          // The bar is transparent ONLY while it sits over the hero video. The
          // moment it leaves the hero — and on every other route, where there is
          // no hero to sit over — it takes the same light surface with dark ink.
          // One scrolled appearance for the whole site.
          overHero
            ? 'tone-dark border-b border-transparent bg-transparent!'
            : cn(
                'tone-light bg-light/95 backdrop-blur-md',
                scrolled ? 'border-b border-[var(--tone-line)]' : 'border-b border-transparent',
              ),
        )}
      >
        {/* Hero-only veil: keeps the white nav legible over bright video frames
            without reading as a solid strip. Fades out as the bar turns light. */}
        {onHome && (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-navy/30 to-transparent transition-opacity duration-500',
              scrolled ? 'opacity-0' : 'opacity-100',
            )}
          />
        )}

        <Container className="relative flex h-[4.75rem] items-center justify-between gap-8">
          <div data-nav-item>
            <Logo onClick={() => go('home')} />
          </div>

          {/* Taken out of the flex flow and pinned to the bar's centre line.
              With `justify-between` the links only sat *between* the logo and
              the auth buttons, and those two groups are different widths — so
              the row landed ~85px left of true centre at 1440. `inset-y-0`
              makes the nav full-height so its own `items-center` handles the
              vertical axis, which a static flex child no longer does once it is
              absolutely positioned. */}
          <nav
            aria-label="Primary"
            className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center gap-5 lg:flex xl:gap-7"
          >
            {navLinks.map((link) => {
              const active = activeId === link.id
              return (
                <button
                  key={link.id}
                  data-nav-item
                  type="button"
                  onClick={() => go(link.id)}
                  aria-current={active ? 'true' : undefined}
                  className="group relative cursor-pointer py-2"
                >
                  {/* tone-aware: dark grey on the light auth bar, muted blue-grey
                      on the dark landing bar */}
                  <span
                    className={cn(
                      'label-mono transition-colors duration-300',
                      active
                        ? 'text-[var(--tone-ink)]'
                        : 'text-[var(--tone-muted)] group-hover:text-[var(--tone-ink)]',
                    )}
                  >
                    {link.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute -bottom-0.5 left-0 h-px bg-[var(--tone-accent)] transition-[width] duration-500 ease-[var(--ease-out-expo)]',
                      active ? 'w-full' : 'w-0 group-hover:w-full',
                    )}
                  />
                </button>
              )
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex" data-nav-item>
            <button
              type="button"
              onClick={() => goTo(authLinks.login.to)}
              className="label-mono min-h-11 cursor-pointer px-4 py-3 text-[var(--tone-ink)] transition-colors duration-300 hover:text-[var(--tone-accent)]"
            >
              {authLinks.login.label}
            </button>

            {/* uses the shared button tokens, so it stays blue and accessible
                on both the dark landing bar and the light auth bar */}
            <button
              type="button"
              onClick={() => goTo(authLinks.signup.to)}
              className="label-mono min-h-11 cursor-pointer bg-[var(--btn-bg)] px-6 py-3 text-[var(--btn-ink)] transition-colors duration-300 hover:bg-[var(--btn-bg-hover)]"
            >
              {authLinks.signup.label}
            </button>
          </div>

          <button
            type="button"
            data-nav-item
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--tone-ink)] lg:hidden"
          >
            <List size={24} weight="light" aria-hidden="true" />
          </button>
        </Container>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        onNavigate={go}
        onRoute={goTo}
        activeId={activeId}
      />
    </>
  )
}
