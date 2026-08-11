/** Shared by every form so the email rule can never drift between pages. */
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())
