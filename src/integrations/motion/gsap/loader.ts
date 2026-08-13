import { setTickerSource } from "../ticker"
import type { Gsap, GsapPluginName, ScrollTriggerStatic } from "./types"
import { PLUGIN_LOADERS } from "./types"

type GsapLoader = () => Promise<Gsap>
type GsapPluginLoader = (name: GsapPluginName) => Promise<unknown>

let pending: Promise<Gsap> | null = null
let loaded: Gsap | null = null
let customLoader: GsapLoader | null = null
let customPluginLoader: GsapPluginLoader | null = null

const registered = new Map<GsapPluginName, unknown>()
const pendingPlugins = new Map<GsapPluginName, Promise<unknown>>()

/**
 * GSAP core is dynamically imported so it stays out of the initial bundle and
 * never evaluates during SSR. Concurrent callers share one request; a failure
 * clears the cache so a later caller can retry rather than inheriting the
 * rejection forever.
 *
 * Loading GSAP also hands the shared ticker over to `gsap.ticker`, so anything
 * already subscribed — Lenis, the performance sampler — migrates onto GSAP's
 * loop instead of running a second one.
 */
export function loadGsap(plugins: readonly GsapPluginName[] = []): Promise<Gsap> {
  const core = loadCore()
  if (plugins.length === 0) return core

  return core.then(async (gsap) => {
    await Promise.all(plugins.map((name) => loadPlugin(gsap, name)))
    return gsap
  })
}

function loadCore(): Promise<Gsap> {
  if (loaded) return Promise.resolve(loaded)
  if (pending) return pending

  pending = (customLoader ?? defaultLoad)()
    .then((gsap) => {
      loaded = gsap
      setTickerSource(gsap.ticker)
      return gsap
    })
    .catch((error) => {
      pending = null
      throw error
    })

  return pending
}

async function defaultLoad(): Promise<Gsap> {
  if (typeof window === "undefined") {
    throw new Error("GSAP can only be loaded in a browser")
  }

  return (await import("gsap")).gsap
}

/**
 * Each plugin is a separate chunk, imported once and registered once. The
 * loaders live in a static record because a variable `import()` specifier
 * cannot be analysed by the bundler.
 */
function loadPlugin(gsap: Gsap, name: GsapPluginName): Promise<unknown> {
  const already = registered.get(name)
  if (already) return Promise.resolve(already)

  const inFlight = pendingPlugins.get(name)
  if (inFlight) return inFlight

  const load = customPluginLoader ? customPluginLoader(name) : PLUGIN_LOADERS[name]()

  const request = load
    .then((plugin) => {
      gsap.registerPlugin(plugin as object)
      registered.set(name, plugin)
      pendingPlugins.delete(name)
      return plugin
    })
    .catch((error) => {
      pendingPlugins.delete(name)
      throw error
    })

  pendingPlugins.set(name, request)
  return request
}

/**
 * ScrollTrigger with its own accessor because it is the plugin that other code
 * needs a direct handle on — `ScrollTrigger.update`, `.refresh`, `.getAll`.
 */
export async function loadScrollTrigger(): Promise<ScrollTriggerStatic> {
  const gsap = await loadGsap()
  return (await loadPlugin(gsap, "ScrollTrigger")) as ScrollTriggerStatic
}

/** Loaded core if `loadGsap` has already settled; otherwise `null`. */
export function getGsap(): Gsap | null {
  return loaded
}

/**
 * ScrollTrigger if it has already been registered; otherwise `null`. Lets code
 * integrate with ScrollTrigger without forcing it into the bundle.
 */
export function getScrollTrigger(): ScrollTriggerStatic | null {
  return (registered.get("ScrollTrigger") as ScrollTriggerStatic | undefined) ?? null
}

/** A plugin is registered. */
export function hasPlugin(name: GsapPluginName): boolean {
  return registered.has(name)
}

/**
 * Replace the importer. Used by tests so they never evaluate the real GSAP.
 * Pass `null` to restore the default.
 */
export function setGsapLoader(loader: GsapLoader | null): void {
  customLoader = loader
}

/**
 * Replace the plugin importer, so tests can exercise code that integrates with
 * a plugin without pulling the real chunk in. Pass `null` to restore the
 * default.
 */
export function setGsapPluginLoader(loader: GsapPluginLoader | null): void {
  customPluginLoader = loader
}

/** Drop the cached core and plugins so the next `loadGsap` runs again. */
export function resetLoader(): void {
  pending = null
  loaded = null
  customLoader = null
  customPluginLoader = null
  registered.clear()
  pendingPlugins.clear()
  setTickerSource(null)
}
