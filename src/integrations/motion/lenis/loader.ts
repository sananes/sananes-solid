import type { LenisConstructor } from "./types"

type LenisLoader = () => Promise<LenisConstructor>

let pending: Promise<LenisConstructor> | null = null
let loaded: LenisConstructor | null = null
let customLoader: LenisLoader | null = null

/**
 * Lenis reads the document at construction time and is only ever needed after
 * mount, so it is dynamically imported rather than pulled into the initial
 * bundle. Concurrent callers share one request; a failure clears the cache so a
 * later caller can retry rather than inheriting the rejection forever.
 */
export function loadLenis(): Promise<LenisConstructor> {
  if (loaded) return Promise.resolve(loaded)
  if (pending) return pending

  pending = (customLoader ?? defaultLoad)()
    .then((Lenis) => {
      loaded = Lenis
      return Lenis
    })
    .catch((error) => {
      pending = null
      throw error
    })

  return pending
}

async function defaultLoad(): Promise<LenisConstructor> {
  if (typeof window === "undefined") {
    throw new Error("Lenis can only be loaded in a browser")
  }

  // Core only — `lenis/react`, `lenis/vue` and `lenis/snap` stay out.
  return (await import("lenis")).default
}

/** Loaded constructor if `loadLenis` has already settled; otherwise `null`. */
export function getLenisConstructor(): LenisConstructor | null {
  return loaded
}

/**
 * Replace the importer. Used by tests so they never construct a real Lenis
 * against a document. Pass `null` to restore the default.
 */
export function setLenisLoader(loader: LenisLoader | null): void {
  customLoader = loader
}

/** Drop the cached constructor so the next `loadLenis` runs again. */
export function resetLoader(): void {
  pending = null
  loaded = null
  customLoader = null
}
