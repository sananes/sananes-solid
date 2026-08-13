import { onCleanup, onMount } from "solid-js"
import { isServer } from "solid-js/web"

import { loadGsap } from "./loader"
import type { CreateGsapOptions, Gsap, GsapContext } from "./types"

/**
 * Scoped, self-cleaning GSAP — the Solid counterpart of React's `useGSAP`.
 *
 * Returns a ref setter (same ergonomics as `createReveal` in `~/styles`).
 * Attach it to a container; on mount GSAP is loaded, the callback runs inside a
 * `gsap.context()` scoped to that container, and on cleanup the context is
 * reverted — killing every tween and ScrollTrigger it created and removing the
 * inline styles they wrote.
 *
 * Scoping matters: selector strings inside the callback resolve against the
 * container only, so `".card"` cannot reach into the rest of the page.
 *
 * @example
 * ```tsx
 * const scope = createGsap(({ gsap }) => {
 *   gsap.from(".card", {
 *     y: 40,
 *     opacity: 0,
 *     stagger: 0.1,
 *     scrollTrigger: { trigger: ".grid", start: "top 75%" },
 *   })
 * }, { plugins: ["ScrollTrigger"] })
 *
 * return (
 *   <div ref={scope} class="grid">
 *     <For each={items}>{(item) => <div class="card">{item.name}</div>}</For>
 *   </div>
 * )
 * ```
 */
export function createGsap<T extends HTMLElement = HTMLElement>(
  setup: (api: { gsap: Gsap; context: GsapContext; scope: T }) => void,
  options: CreateGsapOptions = {},
) {
  const { plugins = [], respectReducedMotion = true, onError } = options

  let element: T | undefined

  onMount(() => {
    if (isServer || !element) return
    const scope = element

    if (respectReducedMotion && prefersReducedMotion()) return

    // The load is async, so the component may be gone by the time it settles.
    let disposed = false
    let context: GsapContext | undefined

    onCleanup(() => {
      disposed = true
      context?.revert()
      context = undefined
    })

    loadGsap(plugins)
      .then((gsap) => {
        if (disposed) return
        context = gsap.context((self) => setup({ gsap, context: self, scope }), scope)
      })
      .catch((error: unknown) => {
        const failure = error instanceof Error ? error : new Error(String(error))
        // Visible in development without forcing noise on consumers that handle it.
        if (onError) onError(failure)
        else console.error("createGsap: failed to load GSAP", failure)
      })
  })

  // Solid ref setter: `ref={createGsap(...)}`
  return (node: T) => {
    element = node
  }
}

/**
 * Same contract as `createGsap` without a scope, for animations that are not
 * anchored to one element — a global ScrollTrigger, a `gsap.ticker` effect.
 * Selector strings resolve against the whole document, so prefer `createGsap`.
 */
export function createGsapContext(
  setup: (api: { gsap: Gsap; context: GsapContext }) => void,
  options: CreateGsapOptions = {},
): void {
  const { plugins = [], respectReducedMotion = true, onError } = options

  onMount(() => {
    if (isServer) return
    if (respectReducedMotion && prefersReducedMotion()) return

    let disposed = false
    let context: GsapContext | undefined

    onCleanup(() => {
      disposed = true
      context?.revert()
      context = undefined
    })

    loadGsap(plugins)
      .then((gsap) => {
        if (disposed) return
        context = gsap.context((self) => setup({ gsap, context: self }))
      })
      .catch((error: unknown) => {
        const failure = error instanceof Error ? error : new Error(String(error))
        if (onError) onError(failure)
        else console.error("createGsapContext: failed to load GSAP", failure)
      })
  })
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}
