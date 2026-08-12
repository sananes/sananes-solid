import { onCleanup, onMount } from "solid-js"
import { isServer } from "solid-js/web"

/**
 * Reveal-on-scroll primitive — Solid port of the starter's `useReveal` hook.
 *
 * Returns a `ref` setter. Attach it to a container; the primitive flips a
 * `data-reveal` attribute (`"hidden"` → `"visible"`) via IntersectionObserver
 * when the container enters the viewport. The animation itself lives in CSS
 * (`css/global.css`, the `[data-reveal]` contract) and animates only `transform`
 * and `opacity`, so it runs on the compositor thread, unaffected by hydration.
 *
 * Children that should stagger carry `data-reveal-item`; the primitive sets a
 * `--reveal-index` custom property on each so CSS can derive a
 * `transition-delay`. The visual treatment (distance, axis, duration, easing)
 * stays in your component's CSS — set `--reveal-transform`, `--reveal-stagger`,
 * `--reveal-duration` on the container.
 *
 * Degrades gracefully: with JS disabled the attribute is never set, so the
 * hidden state (scoped under `[data-reveal]`) never applies and content renders
 * visible. Under `prefers-reduced-motion` the container is revealed immediately
 * and the observer is skipped.
 *
 * @example
 * ```tsx
 * const reveal = createReveal<HTMLDivElement>({ once: true })
 * return (
 *   <div ref={reveal} class={s.grid}>
 *     <For each={items}>{(item) => (
 *       <div data-reveal-item class={s.card}>{item.name}</div>
 *     )}</For>
 *   </div>
 * )
 * ```
 *
 * ```css
 * .grid {
 *   --reveal-transform: translateY(32px);
 *   --reveal-stagger: 120ms;
 * }
 * ```
 */

interface CreateRevealOptions {
  /** IntersectionObserver threshold (0–1). Default 0. */
  threshold?: number
  /**
   * IntersectionObserver rootMargin. The default bottom inset of -25% mirrors a
   * GSAP ScrollTrigger `start: 'top 75%'` — reveal once the element is a quarter
   * into the viewport.
   */
  rootMargin?: string
  /** Reveal only once, then disconnect. Default true. */
  once?: boolean
}

export function createReveal<T extends HTMLElement = HTMLElement>({
  threshold = 0,
  rootMargin = "0px 0px -25% 0px",
  once = true,
}: CreateRevealOptions = {}) {
  let element: T | undefined

  onMount(() => {
    if (isServer || !element) return
    const el = element

    // Index staggered children so CSS can offset each via transition-delay.
    el.querySelectorAll<HTMLElement>("[data-reveal-item]").forEach((item, index) => {
      item.style.setProperty("--reveal-index", String(index))
    })

    // Respect reduced motion: reveal immediately, never observe.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.reveal = "visible"
      return
    }

    el.dataset.reveal = "hidden"

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.reveal = "visible"
            if (once) observer.disconnect()
          } else if (!once) {
            el.dataset.reveal = "hidden"
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    onCleanup(() => observer.disconnect())
  })

  // Solid ref setter: `ref={createReveal()}`
  return (node: T) => {
    element = node
  }
}
