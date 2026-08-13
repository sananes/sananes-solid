import type Lenis from "lenis"
import type { LenisOptions } from "lenis"

export type { LenisOptions }

/** A live Lenis instance. */
export type LenisInstance = Lenis

export type LenisConstructor = new (options?: LenisOptions) => LenisInstance

export interface SmoothScrollOptions extends LenisOptions {
  /**
   * Do not load Lenis at all under `prefers-reduced-motion: reduce`, leaving
   * native scroll untouched. Default `true`.
   *
   * Not to be confused with Lenis's own `respectReducedMotion` option, which
   * keeps Lenis running with smoothing disabled. Skipping is stricter: no
   * library is fetched and nothing intercepts the wheel.
   */
  skipOnReducedMotion?: boolean
  /**
   * Load ScrollTrigger and wire the two together: ScrollTrigger updates on
   * every Lenis scroll, and `gsap.ticker` becomes the single loop driving
   * Lenis. Default `true`.
   *
   * Set to `false` to use Lenis on its own — that keeps GSAP out of the bundle
   * entirely, and the shared ticker falls back to its own
   * `requestAnimationFrame`.
   */
  syncScrollTrigger?: boolean
  /**
   * Feed the eased scroll position to a Unicorn Studio scene via
   * `UnicornStudio.setScroll`, so the WebGL scene tracks the smoothed value
   * rather than the raw one. Default `false`. No-op when no scene is present.
   */
  syncUnicornStudio?: boolean
  /** Called if Lenis fails to load. Defaults to `console.error`. */
  onError?: (error: Error) => void
}
