/**
 * GSAP loader and primitive behaviour. The real GSAP touches `window` and the
 * document at evaluate time, so every test injects a stub via `setGsapLoader`.
 *
 * Guards three contracts: the core and each plugin load exactly once, loading
 * GSAP hands the shared ticker over to `gsap.ticker` (there must never be two
 * animation loops), and a context is reverted when its owner is disposed —
 * including when the owner disappears while the import is still in flight.
 *
 * Run with: bun test --conditions browser src/integrations/motion
 *
 * The condition matters: without it Bun resolves Solid's server build, where
 * `onMount` is a no-op and none of these primitives would run.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createRoot } from "solid-js"

import { addTick, hasTickerSource, resetTicker } from "../ticker"
import { createGsap, createGsapContext } from "./create-gsap"
import { getScrollTrigger, hasPlugin, loadGsap, resetLoader, setGsapLoader } from "./loader"
import type { Gsap } from "./types"

/** The loaders chain several promises, so a macrotask is what settles them. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

interface MockContext {
  reverted: number
}

const contexts: MockContext[] = []
let registered: string[] = []
const tickerCallbacks = new Set<(time: number, delta: number) => void>()

function mockGsap(): Gsap {
  const gsap = {
    registerPlugin: (...plugins: object[]) => {
      for (const plugin of plugins) {
        registered.push((plugin as { name?: string }).name ?? "anonymous")
      }
    },
    context: (func?: (self: unknown) => void) => {
      const context: MockContext = { reverted: 0 }
      const self = {
        ...context,
        revert: () => {
          context.reverted += 1
        },
        add: () => undefined,
      }
      contexts.push(context)
      func?.(self)
      return self
    },
    matchMedia: () => ({ add: () => undefined, revert: () => undefined }),
    ticker: {
      add: (callback: (time: number, delta: number) => void) => {
        tickerCallbacks.add(callback)
        return callback
      },
      remove: (callback: (time: number, delta: number) => void) => {
        tickerCallbacks.delete(callback)
      },
      lagSmoothing: () => undefined,
    },
  }
  return gsap as unknown as Gsap
}

beforeEach(() => {
  if (typeof window === "undefined") {
    // bun:test has no DOM; the primitives are browser-gated on `window`.
    Object.defineProperty(globalThis, "window", {
      value: { matchMedia: () => ({ matches: false }) },
      configurable: true,
      writable: true,
    })
  }
  contexts.length = 0
  registered = []
  tickerCallbacks.clear()
  resetTicker()
  resetLoader()
  setGsapLoader(async () => mockGsap())
})

afterEach(() => {
  resetLoader()
  resetTicker()
})

describe("loadGsap", () => {
  it("loads the core once across concurrent callers", async () => {
    let loads = 0
    setGsapLoader(async () => {
      loads += 1
      return mockGsap()
    })

    const [a, b] = await Promise.all([loadGsap(), loadGsap()])
    await loadGsap()

    expect(loads).toBe(1)
    expect(a).toBe(b)
  })

  it("registers each requested plugin exactly once", async () => {
    await Promise.all([loadGsap(["ScrollTrigger"]), loadGsap(["ScrollTrigger"])])
    await loadGsap(["ScrollTrigger"])

    expect(registered).toHaveLength(1)
    expect(hasPlugin("ScrollTrigger")).toBe(true)
    expect(getScrollTrigger()).not.toBeNull()
  })

  it("does not load plugins that were not asked for", async () => {
    await loadGsap()
    expect(registered).toHaveLength(0)
    expect(hasPlugin("ScrollTrigger")).toBe(false)
    expect(getScrollTrigger()).toBeNull()
  })

  it("retries after a failure instead of caching the rejection", async () => {
    let attempts = 0
    setGsapLoader(async () => {
      attempts += 1
      if (attempts === 1) throw new Error("network")
      return mockGsap()
    })

    await expect(loadGsap()).rejects.toThrow("network")
    await loadGsap()
    expect(attempts).toBe(2)
  })
})

describe("ticker handover", () => {
  it("moves an existing subscriber onto gsap.ticker", async () => {
    const seen: number[] = []
    addTick((_time, delta) => seen.push(delta))

    expect(hasTickerSource()).toBe(false)
    await loadGsap()
    expect(hasTickerSource()).toBe(true)
    expect(tickerCallbacks.size).toBe(1)

    for (const callback of tickerCallbacks) callback(2, 16)
    expect(seen).toEqual([16])
  })

  it("converts gsap seconds to milliseconds", async () => {
    const seen: number[] = []
    addTick((time) => seen.push(time))
    await loadGsap()

    for (const callback of tickerCallbacks) callback(1.5, 16)
    expect(seen).toEqual([1500])
  })

  it("registers one bridge no matter how many subscribers there are", async () => {
    addTick(() => undefined)
    addTick(() => undefined)
    await loadGsap()
    expect(tickerCallbacks.size).toBe(1)
  })
})

describe("createGsap", () => {
  it("runs the callback in a context and reverts it on dispose", async () => {
    let scoped: HTMLElement | undefined
    const element = { nodeType: 1 } as unknown as HTMLElement

    const dispose = createRoot((d) => {
      const ref = createGsap<HTMLElement>(({ scope }) => {
        scoped = scope
      })
      ref(element)
      return d
    })

    await flush()

    expect(scoped).toBe(element)
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.reverted).toBe(0)

    dispose()
    expect(contexts[0]?.reverted).toBe(1)
  })

  it("never creates a context when the owner is disposed mid-load", async () => {
    let resolveLoad: (gsap: Gsap) => void = () => undefined
    const deferred = new Promise<Gsap>((resolve) => {
      resolveLoad = resolve
    })
    setGsapLoader(() => deferred)

    let ran = false
    const dispose = createRoot((d) => {
      const ref = createGsap<HTMLElement>(() => {
        ran = true
      })
      ref({ nodeType: 1 } as unknown as HTMLElement)
      return d
    })

    dispose()
    resolveLoad(mockGsap())
    await flush()

    expect(ran).toBe(false)
    expect(contexts).toHaveLength(0)
  })

  it("skips the callback under reduced motion by default", async () => {
    const original = window.matchMedia
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia

    let ran = false
    const dispose = createRoot((d) => {
      createGsapContext(() => {
        ran = true
      })
      return d
    })

    await flush()

    expect(ran).toBe(false)
    dispose()
    window.matchMedia = original
  })

  it("runs under reduced motion when the animation opts out of the default", async () => {
    const original = window.matchMedia
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia

    let ran = false
    const dispose = createRoot((d) => {
      createGsapContext(
        () => {
          ran = true
        },
        { respectReducedMotion: false },
      )
      return d
    })

    await flush()

    expect(ran).toBe(true)
    dispose()
    window.matchMedia = original
  })
})
