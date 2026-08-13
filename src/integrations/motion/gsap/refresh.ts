import { getScrollTrigger, loadScrollTrigger } from "./loader"

/**
 * Keeping ScrollTrigger's measurements honest.
 *
 * ScrollTrigger caches every start/end position on refresh, so anything that
 * changes layout *after* those positions were measured leaves triggers firing
 * at the wrong scroll offset. Two things do that here in particular:
 *
 * - Webfonts. `entry-server.tsx` preloads them, but the swap still reflows text
 *   after first paint, which moves everything below it.
 * - Content that settles late: images without intrinsic dimensions, a CMS list
 *   that renders after its data resolves, an expanding accordion.
 *
 * ScrollTrigger already refreshes on window resize. This adds the two cases it
 * cannot see.
 */

const DEFAULT_DEBOUNCE_MS = 200

/** Refresh once webfonts have swapped. No-op where `document.fonts` is missing. */
export function refreshOnFontsReady(): void {
  if (typeof document === "undefined" || !document.fonts) return

  document.fonts.ready.then(() => {
    getScrollTrigger()?.refresh()
  })
}

export interface RefreshOnResizeOptions {
  /** Element to watch. Defaults to `document.body`. */
  target?: Element
  /** Milliseconds of quiet before refreshing. Default 200. */
  debounceMs?: number
}

/**
 * Refresh when the observed element's box changes — content growth, not just
 * viewport resize. Returns a teardown function.
 */
export function refreshOnResize(options: RefreshOnResizeOptions = {}): () => void {
  if (typeof ResizeObserver === "undefined" || typeof document === "undefined") {
    return () => undefined
  }

  const target = options.target ?? document.body
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  let timer: ReturnType<typeof setTimeout> | undefined

  const observer = new ResizeObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(() => getScrollTrigger()?.refresh(), debounceMs)
  })

  observer.observe(target)

  return () => {
    clearTimeout(timer)
    observer.disconnect()
  }
}

/**
 * Both guards at once, for the router root. Loads ScrollTrigger first so an
 * early font swap is not missed. Returns a teardown function.
 */
export function autoRefresh(options: RefreshOnResizeOptions = {}): () => void {
  let disposed = false
  let teardown: (() => void) | undefined

  loadScrollTrigger().then(() => {
    if (disposed) return
    refreshOnFontsReady()
    teardown = refreshOnResize(options)
  })

  return () => {
    disposed = true
    teardown?.()
    teardown = undefined
  }
}
