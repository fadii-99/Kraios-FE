/**
 * Scrolls to a section by id, accounting for the fixed navbar height and
 * honoring the user's reduced-motion preference.
 */
export function scrollToSection(id) {
  const target = document.getElementById(id)
  if (!target) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const nav = document.querySelector('[data-navbar]')
  const offset = (nav?.offsetHeight ?? 72) - 1

  const top = target.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}
