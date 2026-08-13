/**
 * The stylesheet Lenis requires, as a string.
 *
 * Kept here rather than as an `@import "lenis/dist/lenis.css"` in `app.css`,
 * which would ship these rules whether or not smooth scroll is opted into.
 * Mirrors `lenis/dist/lenis.css` — check it against upstream when bumping the
 * dependency.
 */
export const LENIS_CSS = `html.lenis,
html.lenis body {
  height: auto;
}

.lenis:not(.lenis-autoToggle).lenis-stopped {
  overflow: clip;
}

.lenis [data-lenis-prevent],
.lenis [data-lenis-prevent-wheel],
.lenis [data-lenis-prevent-touch],
.lenis [data-lenis-prevent-vertical],
.lenis [data-lenis-prevent-horizontal] {
  overscroll-behavior: contain;
}

.lenis.lenis-smooth iframe {
  pointer-events: none;
}

.lenis.lenis-autoToggle {
  transition-property: overflow;
  transition-duration: 1ms;
  transition-behavior: allow-discrete;
}
`

const MARKER = "data-lenis-styles"

let injected = false
let enabled = true

/**
 * Opt out of runtime style injection, for a strict `style-src` CSP or when the
 * rules are already in an application stylesheet. Must run before
 * `initSmoothScroll`. Pair with `LENIS_CSS`.
 */
export function setStyleInjection(value: boolean): void {
  enabled = value
}

/** Adds the Lenis rules to the document once. No-op on the server. */
export function ensureStyles(): void {
  if (injected || !enabled || typeof document === "undefined") return
  injected = true

  if (document.querySelector(`style[${MARKER}]`)) return

  const style = document.createElement("style")
  style.setAttribute(MARKER, "")
  style.textContent = LENIS_CSS
  // Prepended so application stylesheets win without needing extra specificity.
  document.head.prepend(style)
}

export function resetStyleInjection(): void {
  injected = false
  enabled = true
}
