export const CONTAINER_CLASS = "unicorn-studio"

export const UNICORN_STUDIO_CSS = `.${CONTAINER_CLASS} {
  position: relative;
  overflow: hidden;
  background: transparent;
  transform: translateZ(0);
  transition: opacity var(--us-fade-duration, 1000ms) linear;
}

.${CONTAINER_CLASS} canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

@media (prefers-reduced-motion: reduce) {
  .${CONTAINER_CLASS} {
    transition: none;
  }
}
`

const MARKER = "data-unicorn-studio"

let injected = false
let enabled = true

/**
 * Opt out of runtime style injection, for a strict `style-src` CSP or when the
 * rules are already in an application stylesheet. Must run before the first
 * component renders. Pair with `UNICORN_STUDIO_CSS`.
 */
export function setStyleInjection(value: boolean): void {
  enabled = value
}

/** Adds the container rules to the document once. No-op on the server. */
export function ensureStyles(): void {
  if (injected || !enabled || typeof document === "undefined") return
  injected = true

  if (document.querySelector(`style[${MARKER}]`)) return

  const style = document.createElement("style")
  style.setAttribute(MARKER, "")
  style.textContent = UNICORN_STUDIO_CSS
  // Prepended so application stylesheets win without needing extra specificity.
  document.head.prepend(style)
}
