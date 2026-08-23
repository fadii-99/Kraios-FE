/**
 * DASHBOARD MOTION TOKENS & UTILITIES
 *
 * Inherited from the KRAIOS landing-page motion language:
 * - Architectural precision & restraint
 * - Primary easing: 'expo.out' (matches CSS var(--ease-out-expo))
 * - Fast application timing (~350ms–600ms) for snappy desktop UX
 * - Restrained vertical translations (8px–16px)
 * - Tight staggers (0.04s–0.08s)
 */

export const DASHBOARD_MOTION = {
  /** Primary architectural easing for cards, headers, and UI elements */
  ease: 'expo.out',
  /** Softer easing for subtle body text / secondary elements */
  easeSubtle: 'power3.out',
  /** Standard dashboard duration (500ms) */
  duration: 0.5,
  /** Fast UI duration (350ms) */
  durationFast: 0.35,
  /** Hero/prominent UI duration (650ms) */
  durationHero: 0.65,
  /** Standard element stagger (60ms) */
  stagger: 0.06,
  /** Fast card/list stagger (45ms) */
  staggerFast: 0.045,
  /** Standard vertical translation distance */
  y: 14,
  /** Small subtle translation distance */
  ySmall: 8,
}
