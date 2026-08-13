import type { gsap } from "gsap"
import type { ScrollTrigger } from "gsap/ScrollTrigger"

/** The `gsap` object itself. */
export type Gsap = typeof gsap

/** `gsap.context()` return value — a revertable group of animations. */
export type GsapContext = gsap.Context

/** `gsap.matchMedia()` return value. */
export type GsapMatchMedia = gsap.MatchMedia

/** The ScrollTrigger class, as registered on the plugin. */
export type ScrollTriggerStatic = typeof ScrollTrigger

/**
 * Every plugin ships free in the `gsap` package as of 3.13, so this list is
 * about bundle size rather than licensing: each entry is a separate chunk that
 * is only fetched when asked for.
 */
export const PLUGIN_LOADERS = {
  ScrollTrigger: () => import("gsap/ScrollTrigger").then((m) => m.ScrollTrigger),
  ScrollSmoother: () => import("gsap/ScrollSmoother").then((m) => m.ScrollSmoother),
  ScrollToPlugin: () => import("gsap/ScrollToPlugin").then((m) => m.ScrollToPlugin),
  SplitText: () => import("gsap/SplitText").then((m) => m.SplitText),
  Observer: () => import("gsap/Observer").then((m) => m.Observer),
  Flip: () => import("gsap/Flip").then((m) => m.Flip),
  Draggable: () => import("gsap/Draggable").then((m) => m.Draggable),
  MotionPathPlugin: () => import("gsap/MotionPathPlugin").then((m) => m.MotionPathPlugin),
  CustomEase: () => import("gsap/CustomEase").then((m) => m.CustomEase),
  TextPlugin: () => import("gsap/TextPlugin").then((m) => m.TextPlugin),
} as const

export type GsapPluginName = keyof typeof PLUGIN_LOADERS

export interface CreateGsapOptions {
  /**
   * Plugins to register before the callback runs. Awaiting them here is what
   * lets the callback use `scrollTrigger: {...}` without a race.
   */
  plugins?: readonly GsapPluginName[]
  /**
   * Skip the callback entirely under `prefers-reduced-motion: reduce`. Default
   * `true` — an animation that only decorates should not run at all. Set to
   * `false` and branch inside the callback when the animation carries meaning.
   */
  respectReducedMotion?: boolean
  /** Called if GSAP or a plugin fails to load. Defaults to `console.error`. */
  onError?: (error: Error) => void
}
