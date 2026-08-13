import type { Howl as HowlInstance } from "howler"
import { type Accessor, createEffect, createSignal, on, onCleanup } from "solid-js"

import { loadHowler } from "./loader"
import {
  muted,
  onUnmute,
  prefersReducedMotion,
  preparePlayback,
  reportError,
  unlocked,
} from "./runtime"
import type { HowlDefinition, HowlSrc } from "./types"

export type CreateHowlOptions = Omit<HowlDefinition, "src"> & {
  /**
   * Restart this sound when the user unmutes. Intended for looping beds.
   * Ignored for looping sounds when `prefers-reduced-motion: reduce`.
   */
  resumeOnUnmute?: boolean
}

export type CreateHowlReturn = {
  play: (sprite?: string) => Promise<number | undefined>
  pause: () => void
  stop: () => void
  fade: (from: number, to: number, duration: number) => void
  seek: (time?: number) => number | undefined
  unload: () => void
  playing: Accessor<boolean>
  muted: Accessor<boolean>
  unlocked: Accessor<boolean>
  volume: Accessor<number>
  setVolume: (value: number) => void
  howl: Accessor<HowlInstance | undefined>
}

/**
 * Own a single Howl for the lifetime of the calling component. The underlying
 * instance is created on the first unmuted `play` (or on unmute when
 * `preload` is set), and torn down on cleanup. Overlapping loads are safe:
 * only the newest attempt is kept.
 */
export function createHowl(
  src: HowlSrc | Accessor<HowlSrc>,
  options: CreateHowlOptions = {},
): CreateHowlReturn {
  const resolveSrc = () => (typeof src === "function" ? src() : src)

  const [playing, setPlaying] = createSignal(false)
  const [instance, setInstance] = createSignal<HowlInstance | undefined>()
  const [volume, setVolumeSignal] = createSignal(options.volume ?? 1)

  // Bumped on every rebuild and on unmount so in-flight `loadHowler` work can
  // tell whether it is still the current attempt before constructing a Howl.
  let generation = 0
  let current: HowlInstance | undefined

  const { resumeOnUnmute, onError, preload, ...howlOptions } = options

  const teardown = () => {
    if (!current) return
    try {
      current.unload()
    } catch (error) {
      reportError(error, onError)
    }
    current = undefined
    setInstance(undefined)
    setPlaying(false)
  }

  const wire = (howl: HowlInstance) => {
    howl.on("play", () => setPlaying(true))
    howl.on("pause", () => setPlaying(false))
    howl.on("stop", () => setPlaying(false))
    howl.on("end", () => {
      if (!howl.loop()) setPlaying(false)
    })
    howl.on("loaderror", (_id, error) => {
      reportError(error instanceof Error ? error : new Error(String(error)), onError)
    })
    howl.on("playerror", (_id, error) => {
      reportError(error instanceof Error ? error : new Error(String(error)), onError)
    })
  }

  const ensure = async (): Promise<HowlInstance | undefined> => {
    if (typeof window === "undefined" || muted()) return undefined
    if (current) return current

    const attempt = ++generation
    if (!(await preparePlayback())) return undefined
    if (attempt !== generation || muted()) return undefined
    const { Howl } = await loadHowler()
    if (attempt !== generation || muted()) return undefined

    const next = new Howl({
      ...howlOptions,
      src: resolveSrc(),
      volume: volume(),
      preload: preload ?? false,
      autoplay: false,
    })

    if (attempt !== generation || muted()) {
      next.unload()
      return undefined
    }

    current = next
    wire(next)
    setInstance(next)
    return next
  }

  const play = async (sprite?: string): Promise<number | undefined> => {
    if (typeof window === "undefined" || muted()) return undefined
    try {
      const howl = await ensure()
      if (!howl || muted()) return undefined
      return sprite === undefined ? howl.play() : howl.play(sprite)
    } catch (error) {
      reportError(error, onError)
      return undefined
    }
  }

  createEffect(
    on(resolveSrc, (_next, prev) => {
      if (prev === undefined || !current) return
      const wasPlaying = playing()
      generation++
      teardown()
      if (wasPlaying) void play()
    }),
  )

  onCleanup(
    onUnmute(() => {
      if (preload) void ensure()
      if (!resumeOnUnmute) return
      if (playing()) return
      if (howlOptions.loop && prefersReducedMotion()) return
      void play()
    }),
  )

  onCleanup(() => {
    generation++
    teardown()
  })

  return {
    play,
    pause: () => {
      current?.pause()
    },
    stop: () => {
      current?.stop()
    },
    fade: (from, to, duration) => {
      current?.fade(from, to, duration)
    },
    seek: (time) => {
      if (!current) return undefined
      if (time === undefined) return current.seek() as number
      current.seek(time)
      return time
    },
    unload: () => {
      generation++
      teardown()
    },
    playing,
    muted,
    unlocked,
    volume,
    setVolume: (value) => {
      const next = value < 0 ? 0 : value > 1 ? 1 : value
      setVolumeSignal(next)
      current?.volume(next)
    },
    howl: instance,
  }
}
