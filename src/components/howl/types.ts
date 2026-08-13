import type { Howl, HowlerGlobal, HowlOptions } from "howler"

export type HowlSrc = string | string[]

export type HowlerModule = {
  Howl: typeof Howl
  Howler: HowlerGlobal
}

/** Howler options we accept, minus autoplay (always off — playback is opt-in). */
export type HowlDefinition = Omit<HowlOptions, "autoplay" | "src"> & {
  src: HowlSrc
  /** Suppresses the default `console.error` when set. */
  onError?: (error: Error) => void
}
