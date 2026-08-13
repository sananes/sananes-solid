/**
 * Smooth scroll wiring. The real Lenis measures a document at construction
 * time, so every test injects a stub via `setLenisLoader`.
 *
 * The contract worth guarding is the loop: Lenis must be driven by the shared
 * ticker with `autoRaf: false`, that ticker must be `gsap.ticker` once GSAP is
 * loaded, and a teardown must leave nothing subscribed. It also guards the
 * reduced-motion bail, which has to happen *before* anything is fetched.
 *
 * Run with: bun test --conditions browser src/integrations/motion
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import { resetLoader as resetGsapLoader, setGsapLoader, setGsapPluginLoader } from "../gsap/loader"
import type { Gsap } from "../gsap/types"
import { resetTicker } from "../ticker"
import { resetLoader, setLenisLoader } from "./loader"
import { destroySmoothScroll, getLenis, initSmoothScroll } from "./smooth-scroll"
import { resetStyleInjection, setStyleInjection } from "./styles"
import type { LenisConstructor } from "./types"

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const tickerCallbacks = new Set<(time: number, delta: number) => void>()
let lagSmoothingCalls: Array<number | boolean> = []
let scrollTriggerUpdates = 0
let scrollTriggerRefreshes = 0

class MockLenis {
  static constructed: MockLenis[] = []
  options: Record<string, unknown>
  rafCalls: number[] = []
  destroyed = false
  scroll = 0
  private listeners = new Set<(lenis: MockLenis) => void>()

  constructor(options: Record<string, unknown> = {}) {
    this.options = options
    MockLenis.constructed.push(this)
  }

  raf = (time: number) => {
    this.rafCalls.push(time)
  }

  on(_event: string, callback: (lenis: MockLenis) => void) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  emitScroll(scroll: number) {
    this.scroll = scroll
    for (const listener of Array.from(this.listeners)) listener(this)
  }

  listenerCount() {
    return this.listeners.size
  }

  destroy() {
    this.destroyed = true
    this.listeners.clear()
  }
}

const lenisLoader = MockLenis as unknown as LenisConstructor

function mockGsap(): Gsap {
  return {
    registerPlugin: () => undefined,
    ticker: {
      add: (callback: (time: number, delta: number) => void) => {
        tickerCallbacks.add(callback)
        return callback
      },
      remove: (callback: (time: number, delta: number) => void) => {
        tickerCallbacks.delete(callback)
      },
      lagSmoothing: (threshold: number | boolean) => {
        lagSmoothingCalls.push(threshold)
      },
    },
  } as unknown as Gsap
}

function mockScrollTrigger() {
  return {
    update: () => {
      scrollTriggerUpdates += 1
    },
    refresh: () => {
      scrollTriggerRefreshes += 1
    },
  }
}

const tick = (timeMs: number, deltaMs = 16) => {
  for (const callback of Array.from(tickerCallbacks)) callback(timeMs / 1000, deltaMs)
}

beforeEach(() => {
  if (typeof window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      value: { matchMedia: () => ({ matches: false }) },
      configurable: true,
      writable: true,
    })
  }
  MockLenis.constructed = []
  tickerCallbacks.clear()
  lagSmoothingCalls = []
  scrollTriggerUpdates = 0
  scrollTriggerRefreshes = 0
  destroySmoothScroll()
  resetTicker()
  resetLoader()
  resetGsapLoader()
  resetStyleInjection()
  setStyleInjection(false)
  setLenisLoader(async () => lenisLoader)
  setGsapLoader(async () => mockGsap())
  setGsapPluginLoader(async () => mockScrollTrigger())
})

afterEach(() => {
  destroySmoothScroll()
  resetTicker()
  resetLoader()
  resetGsapLoader()
  resetStyleInjection()
})

describe("reduced motion", () => {
  it("does not load Lenis at all when reduced motion is requested", async () => {
    const original = window.matchMedia
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia

    let loads = 0
    setLenisLoader(async () => {
      loads += 1
      return lenisLoader
    })

    expect(await initSmoothScroll()).toBeNull()
    expect(loads).toBe(0)
    expect(getLenis()).toBeNull()

    window.matchMedia = original
  })

  it("still starts when the caller opts out of the bail", async () => {
    const original = window.matchMedia
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia

    const lenis = await initSmoothScroll({
      skipOnReducedMotion: false,
      syncScrollTrigger: false,
    })

    expect(lenis).not.toBeNull()
    window.matchMedia = original
  })
})

describe("the single loop", () => {
  it("never lets Lenis run its own requestAnimationFrame", async () => {
    await initSmoothScroll({ syncScrollTrigger: false })
    expect(MockLenis.constructed[0]?.options.autoRaf).toBe(false)
  })

  it("drives lenis.raf from gsap.ticker in milliseconds", async () => {
    await initSmoothScroll()
    await flush()

    const lenis = MockLenis.constructed[0]
    expect(tickerCallbacks.size).toBe(1)

    tick(1000)
    tick(1016)
    expect(lenis?.rafCalls).toEqual([1000, 1016])
  })

  it("returns the same instance to every caller", async () => {
    const [a, b] = await Promise.all([
      initSmoothScroll({ syncScrollTrigger: false }),
      initSmoothScroll({ syncScrollTrigger: false }),
    ])

    expect(a).toBe(b)
    expect(MockLenis.constructed).toHaveLength(1)
  })

  it("unsubscribes from the ticker and destroys the instance on teardown", async () => {
    await initSmoothScroll()
    await flush()
    const lenis = MockLenis.constructed[0]

    destroySmoothScroll()

    expect(lenis?.destroyed).toBe(true)
    expect(lenis?.listenerCount()).toBe(0)
    expect(tickerCallbacks.size).toBe(0)
    expect(getLenis()).toBeNull()
  })
})

describe("ScrollTrigger integration", () => {
  it("updates ScrollTrigger on every lenis scroll, not on the native event", async () => {
    await initSmoothScroll()
    await flush()

    const lenis = MockLenis.constructed[0]
    lenis?.emitScroll(120)
    lenis?.emitScroll(240)

    expect(scrollTriggerUpdates).toBe(2)
  })

  it("refreshes once on start, because Lenis changes the document height", async () => {
    await initSmoothScroll()
    await flush()
    expect(scrollTriggerRefreshes).toBe(1)
  })

  it("turns lag smoothing off while Lenis is being driven, and back on after", async () => {
    await initSmoothScroll()
    await flush()

    expect(lagSmoothingCalls).toEqual([0])

    destroySmoothScroll()
    expect(lagSmoothingCalls).toEqual([0, 500])
  })

  it("stops updating ScrollTrigger after teardown", async () => {
    await initSmoothScroll()
    await flush()
    const lenis = MockLenis.constructed[0]

    destroySmoothScroll()
    lenis?.emitScroll(120)

    expect(scrollTriggerUpdates).toBe(0)
  })

  it("leaves GSAP out of it when the caller does not want the integration", async () => {
    await initSmoothScroll({ syncScrollTrigger: false })
    await flush()

    expect(scrollTriggerUpdates).toBe(0)
    expect(lagSmoothingCalls).toEqual([])
    // Without GSAP the shared ticker falls back to its own loop, so Lenis is
    // still driven — just not by gsap.ticker.
    expect(tickerCallbacks.size).toBe(0)
    expect(getLenis()).not.toBeNull()
  })
})

describe("Unicorn Studio sync", () => {
  it("forwards the eased scroll position when asked", async () => {
    const positions: number[] = []
    ;(window as unknown as { UnicornStudio?: unknown }).UnicornStudio = {
      setScroll: (value: number) => positions.push(value),
    }

    await initSmoothScroll({ syncScrollTrigger: false, syncUnicornStudio: true })
    MockLenis.constructed[0]?.emitScroll(420)

    expect(positions).toEqual([420])
    ;(window as unknown as { UnicornStudio?: unknown }).UnicornStudio = undefined
  })

  it("does not forward anything by default", async () => {
    const positions: number[] = []
    ;(window as unknown as { UnicornStudio?: unknown }).UnicornStudio = {
      setScroll: (value: number) => positions.push(value),
    }

    await initSmoothScroll({ syncScrollTrigger: false })
    MockLenis.constructed[0]?.emitScroll(420)

    expect(positions).toEqual([])
    ;(window as unknown as { UnicornStudio?: unknown }).UnicornStudio = undefined
  })
})
