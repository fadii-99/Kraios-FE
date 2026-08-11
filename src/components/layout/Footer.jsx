import { Link } from 'react-router-dom'

import Container from '@/components/ui/Container'
import Logo from '@/components/ui/Logo'
import { footer, site } from '@/lib/content'
import { useSectionNavigate } from '@/hooks/useSectionNavigate'

// The footer rows are 22px of text — fine for a mouse, under the 44px target
// for a thumb. `touch:` grows them only on devices that are actually tapped, so
// the desktop footer keeps its exact `space-y-3.5` rhythm.
const FOOTER_LINK =
  'flex touch:min-h-11 cursor-pointer items-center text-[0.9375rem] transition-colors duration-300'

export default function Footer() {
  const year = new Date().getFullYear()
  // Section links must work from the auth routes too, where there is nothing on
  // the page to scroll to — the shared hook routes home first.
  const { goToSection } = useSectionNavigate()

  return (
    <footer className="tone-dark border-t border-[var(--tone-line)]">
      {/* Tight above the wordmark, generous below the columns: the old
          `py-20 lg:py-24` + `pb-10` + `mt-16` stacked ~290px of mostly empty
          navy between the footer's top edge and the first link. */}
      <Container className="pb-20 lg:pb-24">
        {/* oversized wordmark closes the page the way the hero opened it */}
        <p
          aria-hidden="true"
          className="display-xl select-none border-b border-[var(--tone-line)] pb-4 leading-[0.78] text-[var(--tone-ink)] opacity-[0.07]"
        >
          {site.name}
        </p>

        <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo size="footer" onClick={() => goToSection('home')} />
            <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-[var(--tone-muted)]">
              {footer.note}
            </p>
          </div>

          {/* Sections that genuinely exist on the landing page */}
          <nav aria-label="Sections" className="lg:col-span-2">
            <h2 className="label-mono text-[var(--tone-muted)]">Sections</h2>
            <ul className="mt-6 space-y-3.5">
              {footer.sections.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => goToSection(link.id)}
                    className={`${FOOTER_LINK} text-[var(--tone-ink)] hover:text-[var(--tone-accent)]`}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Real routes, not decoration */}
          <nav aria-label="Account" className="lg:col-span-2">
            <h2 className="label-mono text-[var(--tone-muted)]">Account</h2>
            <ul className="mt-6 space-y-3.5">
              {footer.account.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`${FOOTER_LINK} text-[var(--tone-ink)] hover:text-[var(--tone-accent)]`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="label-mono text-[var(--tone-muted)]">Contact</h2>
            <ul className="mt-6 space-y-3.5">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className={`${FOOTER_LINK} text-[var(--tone-ink)] hover:text-[var(--tone-accent)]`}
                >
                  {site.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${site.phone.replace(/\s/g, '')}`}
                  className={`${FOOTER_LINK} text-[var(--tone-ink)] hover:text-[var(--tone-accent)]`}
                >
                  {site.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-[var(--tone-line)] pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="label-mono text-[var(--tone-muted)]">
            © {year} {site.name} — {site.tagline}
          </p>
          <p className="label-mono text-[var(--tone-muted)]">{footer.legalNote}</p>
        </div>
      </Container>
    </footer>
  )
}
