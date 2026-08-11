/** Minimal class-name joiner. Filters falsy values. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
