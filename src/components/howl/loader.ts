import type { HowlerModule } from "./types"

type HowlerLoader = () => Promise<HowlerModule>

let pending: Promise<HowlerModule> | null = null
let loaded: HowlerModule | null = null
let customLoader: HowlerLoader | null = null

/**
 * The Howler UMD bundle touches `window`/`global` at evaluate time, so it is
 * never statically imported. Concurrent callers share one request; a failure
 * clears the cache so a later caller can retry rather than inheriting the
 * rejection forever.
 */
export function loadHowler(): Promise<HowlerModule> {
  if (loaded) return Promise.resolve(loaded)
  if (pending) return pending

  pending = (customLoader ?? defaultLoad)()
    .then((mod) => {
      // Unlock is a user gesture we own (`unmute`), not Howler's global click
      // listener — otherwise a click anywhere would opt the visitor in.
      mod.Howler.autoUnlock = false
      mod.Howler.autoSuspend = true
      loaded = mod
      return mod
    })
    .catch((error) => {
      pending = null
      throw error
    })

  return pending
}

async function defaultLoad(): Promise<HowlerModule> {
  if (typeof window === "undefined") {
    throw new Error("Howler can only be loaded in a browser")
  }

  // Core only — the default `howler` entry also pulls in the spatial plugin.
  return import("howler/src/howler.core.js") as Promise<HowlerModule>
}

/** Loaded module if `loadHowler` has already settled; otherwise `null`. */
export function getHowler(): HowlerModule | null {
  return loaded
}

/**
 * Replace the importer. Used by tests so they never construct a real
 * AudioContext. Pass `null` to restore the default.
 */
export function setHowlerLoader(loader: HowlerLoader | null): void {
  customLoader = loader
}

/** Drop the cached module so the next `loadHowler` runs again. */
export function resetLoader(): void {
  pending = null
  loaded = null
  customLoader = null
}
