/**
 * Howl runtime behaviour. The real howler.js UMD bundle touches `window` at
 * evaluate time and needs an AudioContext, so every test injects a stub via
 * `setHowlerLoader`.
 *
 * Run with: bun test src/components/howl
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createRoot } from "solid-js"

import { createHowl } from "./create-howl"
import { defineHowls, resetRegistry } from "./define"
import { howl } from "./howl"
import { resetLoader, setHowlerLoader } from "./loader"
import { muted, resetRuntime, unmute } from "./runtime"
import type { HowlerModule } from "./types"

type Constructed = MockHowl[]

class MockHowl {
  static constructed: Constructed = []
  playCalls: Array<string | number | undefined> = []
  unloaded = false
  options: Record<string, unknown>
  private looping = false
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

  constructor(options: Record<string, unknown>) {
    this.options = options
    this.looping = Boolean(options.loop)
    MockHowl.constructed.push(this)
  }

  play(sprite?: string | number) {
    this.playCalls.push(sprite)
    this.emit("play", 1)
    return 1
  }

  pause() {
    this.emit("pause", 1)
    return this
  }

  stop() {
    this.emit("stop", 1)
    return this
  }

  unload() {
    this.unloaded = true
    return null
  }

  fade() {
    return this
  }

  seek(time?: number) {
    return time === undefined ? 0 : this
  }

  volume(value?: number) {
    return value === undefined ? 1 : this
  }

  loop() {
    return this.looping
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    const bucket = this.listeners[event]
    if (bucket) bucket.push(callback)
    else this.listeners[event] = [callback]
    return this
  }

  private emit(event: string, ...args: unknown[]) {
    for (const callback of this.listeners[event] ?? []) callback(...args)
  }
}

function mockHowler(): HowlerModule {
  const ctx = { state: "running", resume: async () => undefined }
  const Howler = {
    autoUnlock: true,
    autoSuspend: true,
    ctx,
    mute: () => Howler,
    volume: (value?: number) => (value === undefined ? 1 : Howler),
    stop: () => Howler,
  }
  return {
    Howl: MockHowl as unknown as HowlerModule["Howl"],
    Howler: Howler as unknown as HowlerModule["Howler"],
  }
}

function resetHowl() {
  resetRegistry()
  resetRuntime()
  resetLoader()
  MockHowl.constructed = []
}

beforeEach(() => {
  if (typeof window === "undefined") {
    // bun:test has no DOM; play/unmute are browser-gated on `window`.
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
      writable: true,
    })
  }
  resetHowl()
  setHowlerLoader(async () => mockHowler())
})

afterEach(() => {
  resetHowl()
})

describe("mute gate", () => {
  it("starts muted and play does not call the loader", async () => {
    let loads = 0
    setHowlerLoader(async () => {
      loads += 1
      return mockHowler()
    })

    const sfx = defineHowls({ click: { src: "/click.webm" } })
    expect(muted()).toBe(true)
    expect(await sfx.play("click")).toBeUndefined()
    expect(loads).toBe(0)
    expect(MockHowl.constructed).toHaveLength(0)
  })

  it("loads once after unmute and shares the module across callers", async () => {
    let loads = 0
    setHowlerLoader(async () => {
      loads += 1
      return mockHowler()
    })

    const sfx = defineHowls({
      click: { src: "/click.webm" },
      whoosh: { src: "/whoosh.webm" },
    })

    await unmute()
    expect(muted()).toBe(false)
    expect(loads).toBe(1)

    expect(await sfx.play("click")).toBe(1)
    expect(await sfx.play("whoosh")).toBe(1)
    expect(loads).toBe(1)
    expect(MockHowl.constructed).toHaveLength(2)
  })

  it("forwards a sprite name to Howl.play", async () => {
    const sfx = defineHowls({
      ui: {
        src: "/ui.webm",
        sprite: { tap: [0, 180], hover: [200, 120] },
      },
    })

    await unmute()
    await sfx.play("ui", "tap")

    expect(MockHowl.constructed).toHaveLength(1)
    expect(MockHowl.constructed[0]?.playCalls).toEqual(["tap"])
  })

  it("does not preload when the Howl is constructed", async () => {
    const sfx = defineHowls({ click: { src: "/click.webm" } })
    await unmute()
    await sfx.play("click")
    expect(MockHowl.constructed[0]?.options.preload).toBe(false)
    expect(MockHowl.constructed[0]?.options.autoplay).toBe(false)
  })
})

describe("howl facade", () => {
  it("plays a registered name after unmute", async () => {
    howl.define({ click: { src: "/click.webm" } })
    await howl.unmute()
    expect(await howl.play("click")).toBe(1)
  })
})

describe("createHowl", () => {
  it("unloads on cleanup", async () => {
    let handle: ReturnType<typeof createHowl> | undefined
    const dispose = createRoot((d) => {
      handle = createHowl("/bed.mp3", { loop: true })
      return d
    })

    await unmute()
    await handle?.play()
    expect(MockHowl.constructed).toHaveLength(1)
    expect(handle?.playing()).toBe(true)

    dispose()
    expect(MockHowl.constructed[0]?.unloaded).toBe(true)
    expect(handle?.howl()).toBeUndefined()
  })

  it("ignores a stale load after cleanup", async () => {
    let resolveLoad: (mod: HowlerModule) => void = () => undefined
    const deferred = new Promise<HowlerModule>((resolve) => {
      resolveLoad = resolve
    })

    await unmute()
    resetLoader()
    setHowlerLoader(() => deferred)

    let handle: ReturnType<typeof createHowl> | undefined
    const dispose = createRoot((d) => {
      handle = createHowl("/bed.mp3")
      return d
    })

    const pending = handle?.play()
    dispose()
    resolveLoad(mockHowler())
    expect(await pending).toBeUndefined()
    expect(MockHowl.constructed).toHaveLength(0)
  })
})
