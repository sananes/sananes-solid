import { onCleanup, onMount } from "solid-js"
import { isServer } from "solid-js/web"

import { loadGsap } from "./loader"
import type { CreateGsapOptions, Gsap, GsapMatchMedia } from "./types"

/** Query that matches when the visitor has *not* asked for reduced motion. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)"

/** Query that matches when the visitor has asked for reduced motion. */
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)"

/**
 * Responsive and reduced-motion animation branches.
 *
 * `gsap.matchMedia()` records every tween and ScrollTrigger created inside a
 * branch and reverts them when that branch stops matching, so crossing a
 * breakpoint unpins sections and clears cached measurements instead of leaking
 * stale triggers. Reverting on cleanup covers the whole instance.
 *
 * Returns a ref setter, which is optional: attach it to scope selector strings
 * to that container, or ignore it and selectors resolve document-wide.
 *
 * @example
 * ```tsx
 * const scope = createGsapMatchMedia(({ mm, gsap }) => {
 *   mm.add(`(min-width: 64rem) and ${MOTION_OK}`, () => {
 *     gsap.to(".panel", { xPercent: -100, scrollTrigger: { pin: true, scrub: true } })
 *   })
 *   mm.add(MOTION_REDUCED, () => {
 *     gsap.set(".panel", { opacity: 1 })
 *   })
 * }, { plugins: ["ScrollTrigger"] })
 * ```
 */
export function createGsapMatchMedia<T extends HTMLElement = HTMLElement>(
  setup: (api: { gsap: Gsap; mm: GsapMatchMedia; scope: T | undefined }) => void,
  options: Omit<CreateGsapOptions, "respectReducedMotion"> = {},
) {
  const { plugins = [], onError } = options

  let element: T | undefined

  onMount(() => {
    if (isServer) return

    // The load is async, so the component may be gone by the time it settles.
    let disposed = false
    let mm: GsapMatchMedia | undefined

    onCleanup(() => {
      disposed = true
      mm?.revert()
      mm = undefined
    })

    loadGsap(plugins)
      .then((gsap) => {
        if (disposed) return
        mm = gsap.matchMedia(element)
        setup({ gsap, mm, scope: element })
      })
      .catch((error: unknown) => {
        const failure = error instanceof Error ? error : new Error(String(error))
        if (onError) onError(failure)
        else console.error("createGsapMatchMedia: failed to load GSAP", failure)
      })
  })

  return (node: T) => {
    element = node
  }
}
