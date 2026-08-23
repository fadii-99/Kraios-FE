/**
 * The signed-in user — the ONE place the dashboard reads identity from.
 *
 * There is no authentication backend yet, so this is a deliberate placeholder:
 * a generic name rather than an invented person, for the same reason
 * `site.email` is `hello@example.com` and not a plausible-looking address.
 *
 * When real auth lands, replace this module's export with the session user and
 * nothing in the UI has to change — no component hardcodes a name.
 */
export const currentUser = {
  name: 'Alex',
  role: 'Architect Account',
}
