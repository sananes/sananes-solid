export const PANEL_CLASS = "stats-overlay"

/**
 * The overlay's own styles, as a string.
 *
 * Deliberately self-contained rather than themed: a debug panel has to stay
 * legible on top of whatever page it is measuring, including a light one, and
 * inheriting the site's colours would make it unreadable exactly when something
 * is wrong. The only token it borrows is the mono family, with a fallback.
 *
 * Every value is a custom property on the panel, so it can still be restyled.
 */
export const STATS_OVERLAY_CSS = `.${PANEL_CLASS} {
  --stats-bg: oklch(0.18 0 0 / 0.88);
  --stats-fg: oklch(0.97 0 0);
  --stats-dim: oklch(0.72 0 0);
  --stats-good: oklch(0.82 0.17 150);
  --stats-warn: oklch(0.85 0.17 85);
  --stats-bad: oklch(0.72 0.19 25);
  --stats-line: oklch(1 0 0 / 0.12);

  position: fixed;
  z-index: 2147483000;
  inset-block-end: 0.75rem;
  inset-inline-start: 0.75rem;
  min-width: 11rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--stats-line);
  border-radius: 0.375rem;
  background: var(--stats-bg);
  color: var(--stats-fg);
  font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.6875rem;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  user-select: none;
  /* A debug panel must never be the thing that breaks the page under it. */
  pointer-events: auto;
  contain: content;
}

.${PANEL_CLASS}[data-corner="top-left"] {
  inset-block: 0.75rem auto;
  inset-inline: 0.75rem auto;
}

.${PANEL_CLASS}[data-corner="top-right"] {
  inset-block: 0.75rem auto;
  inset-inline: auto 0.75rem;
}

.${PANEL_CLASS}[data-corner="bottom-right"] {
  inset-block: auto 0.75rem;
  inset-inline: auto 0.75rem;
}

.${PANEL_CLASS}-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.${PANEL_CLASS}-fps {
  font-size: 1.125rem;
  line-height: 1;
  font-weight: 600;
}

.${PANEL_CLASS}-fps[data-grade="warn"] {
  color: var(--stats-warn);
}

.${PANEL_CLASS}-fps[data-grade="bad"] {
  color: var(--stats-bad);
}

.${PANEL_CLASS}-fps[data-grade="good"] {
  color: var(--stats-good);
}

.${PANEL_CLASS}-loop {
  color: var(--stats-dim);
  font-size: 0.625rem;
  letter-spacing: 0.02em;
}

.${PANEL_CLASS}-graph {
  display: block;
  width: 100%;
  height: 2rem;
  margin-block: 0.375rem;
  border-radius: 0.125rem;
  background: oklch(1 0 0 / 0.05);
}

.${PANEL_CLASS}-rows {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 0.75rem;
  margin: 0;
}

.${PANEL_CLASS}-rows dt {
  color: var(--stats-dim);
}

.${PANEL_CLASS}-rows dd {
  margin: 0;
  text-align: right;
}

.${PANEL_CLASS}-rows dd[data-grade="warn"] {
  color: var(--stats-warn);
}

.${PANEL_CLASS}-rows dd[data-grade="bad"] {
  color: var(--stats-bad);
}

.${PANEL_CLASS}[data-collapsed] .${PANEL_CLASS}-graph,
.${PANEL_CLASS}[data-collapsed] .${PANEL_CLASS}-rows {
  display: none;
}

.${PANEL_CLASS}[data-collapsed] {
  min-width: 0;
}

.${PANEL_CLASS}-hint {
  display: block;
  margin-block-start: 0.375rem;
  color: var(--stats-dim);
  font-size: 0.5625rem;
}
`

const MARKER = "data-stats-overlay-styles"

let injected = false
let enabled = true

/**
 * Opt out of runtime style injection, for a strict `style-src` CSP or when the
 * rules are already in an application stylesheet. Must run before the overlay
 * renders. Pair with `STATS_OVERLAY_CSS`.
 */
export function setStyleInjection(value: boolean): void {
  enabled = value
}

/** Adds the overlay rules to the document once. No-op on the server. */
export function ensureStyles(): void {
  if (injected || !enabled || typeof document === "undefined") return
  injected = true

  if (document.querySelector(`style[${MARKER}]`)) return

  const style = document.createElement("style")
  style.setAttribute(MARKER, "")
  style.textContent = STATS_OVERLAY_CSS
  // Prepended so application stylesheets win without needing extra specificity.
  document.head.prepend(style)
}

export function resetStyleInjection(): void {
  injected = false
  enabled = true
}
