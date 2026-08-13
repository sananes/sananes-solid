import { prefersReducedMotion } from "../gsap/create-gsap"
import { getGsap, loadScrollTrigger } from "../gsap/loader"
import type { ScrollTriggerStatic } from "../gsap/types"
import { addTick, removeTick } from "../ticker"
import { loadLenis } from "./loader"
import { ensureStyles } from "./styles"
import type { LenisInstance, SmoothScrollOptions } from "./types"

/**
 * Smooth scroll, as one instance for the whole document.
 *
 * Lenis wraps native scroll rather than replacing it, so `position: sticky`,
 * anchor links and accessibility all keep working. Two things about this setup
 * are deliberate:
 *
 * - `autoRaf: false`. Lenis never opens its own `requestAnimationFrame`; it is
 *   driven by the shared ticker in `../ticker.ts`, which hands over to
 *   `gsap.ticker` as soon as GSAP loads. Two loops fighting is the most common
 *   cause of scroll jank and cannot be fixed by optimising assets.
 * - ScrollTrigger updates from the Lenis scroll event, not from the native one,
 *   so scrubbed animations follow the eased value the visitor actually sees.
 *
 * A window-scrolling Lenis needs no `ScrollTrigger.scrollerProxy`; that is only
 * for scrolling inside a wrapper element.
 */

const DEFAULTS = {
  autoRaf: false,
  anchors: true,
  // Emulated touch momentum is worse than the platform's own.
  syncTouch: false,
  stopInertiaOnNavigate: true,
} as const

let instance: LenisInstance | null = null
let pending: Promise<LenisInstance | null> | null = null
const teardowns: Array<() => void> = []

export function initSmoothScroll(options: SmoothScrollOptions = {}): Promise<LenisInstance | null> {
  if (instance) return Promise.resolve(instance)
  if (pending) return pending

  const {
    skipOnReducedMotion = true,
    syncScrollTrigger = true,
    syncUnicornStudio = false,
    onError,
    ...lenisOptions
  } = options

  if (typeof window === "undefined") return Promise.resolve(null)

  // Bail before loading anything: a visitor who asked for reduced motion should
  // not pay for a library that would then disable itself.
  if (skipOnReducedMotion && prefersReducedMotion()) return Promise.resolve(null)

  pending = (async () => {
    ensureStyles()

    const [Lenis, ScrollTrigger] = await Promise.all([
      loadLenis(),
      syncScrollTrigger ? loadScrollTrigger() : Promise.resolve(null),
    ])

    const lenis = new Lenis({ ...DEFAULTS, ...lenisOptions })
    instance = lenis

    const tick = (timeMs: number) => lenis.raf(timeMs)
    addTick(tick)
    teardowns.push(() => removeTick(tick))

    if (ScrollTrigger) wireScrollTrigger(lenis, ScrollTrigger)
    if (syncUnicornStudio) wireUnicornStudio(lenis)

    return lenis
  })()

  return pending.catch((error: unknown) => {
    pending = null
    const failure = error instanceof Error ? error : new Error(String(error))
    if (onError) onError(failure)
    else console.error("initSmoothScroll: failed to start Lenis", failure)
    return null
  })
}

function wireScrollTrigger(lenis: LenisInstance, ScrollTrigger: ScrollTriggerStatic): void {
  // Non-null in practice: loading ScrollTrigger loads the core first.
  const gsap = getGsap()
  if (!gsap) return

  const update = () => ScrollTrigger.update()
  teardowns.push(lenis.on("scroll", update))

  // GSAP's ticker normally compensates for long frames (a background tab, a
  // heavy task) by clamping delta time. That compensation fights an external
  // driver, showing up as a jump on the frame after the stall, so it is off
  // while Lenis is the thing being driven.
  gsap.ticker.lagSmoothing(0)
  teardowns.push(() => gsap.ticker.lagSmoothing(500, 33))

  // Lenis changes the document height when it starts, which invalidates every
  // cached trigger position.
  ScrollTrigger.refresh()
}

function wireUnicornStudio(lenis: LenisInstance): void {
  const forward = ({ scroll }: LenisInstance) => {
    window.UnicornStudio?.setScroll?.(scroll)
  }
  teardowns.push(lenis.on("scroll", forward))
}

/** The live instance, or `null` when smooth scroll is not running. */
export function getLenis(): LenisInstance | null {
  return instance
}

/** Tear down the instance and every listener it registered. */
export function destroySmoothScroll(): void {
  for (const teardown of teardowns.splice(0)) teardown()
  instance?.destroy()
  instance = null
  pending = null
}
