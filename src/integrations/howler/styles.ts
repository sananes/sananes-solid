export const TOGGLE_CLASS = "howl-toggle"

export const HOWL_TOGGLE_CSS = `.${TOGGLE_CLASS} {
  appearance: none;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
  cursor: pointer;
}

.${TOGGLE_CLASS}[data-howl="muted"] {
  color: var(--color-muted);
}
`

const MARKER = "data-howl-toggle"

let injected = false
let enabled = true

/**
 * Opt out of runtime style injection, for a strict `style-src` CSP or when the
 * rules are already in an application stylesheet. Must run before the first
 * toggle renders. Pair with `HOWL_TOGGLE_CSS`.
 */
export function setStyleInjection(value: boolean): void {
  enabled = value
}

/** Adds the toggle rules to the document once. No-op on the server. */
export function ensureStyles(): void {
  if (injected || !enabled || typeof document === "undefined") return
  injected = true

  if (document.querySelector(`style[${MARKER}]`)) return

  const style = document.createElement("style")
  style.setAttribute(MARKER, "")
  style.textContent = HOWL_TOGGLE_CSS
  // Prepended so application stylesheets win without needing extra specificity.
  document.head.prepend(style)
}

export function resetStyleInjection(): void {
  injected = false
  enabled = true
}
