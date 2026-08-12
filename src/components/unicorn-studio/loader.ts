import type { UnicornStudioGlobal } from "./types"

export const DEFAULT_VERSION = "2.2.8"

export interface LoadUnicornStudioOptions {
  /** Tag of hiunicornstudio/unicornstudio.js to load from the jsDelivr CDN. */
  version?: string
  /** Full URL to the UMD bundle. Overrides `version`; use this to self-host under a strict CSP. */
  scriptUrl?: string
  /** Rejects if the runtime has not appeared within this many milliseconds. */
  timeoutMs?: number
}

const cdnUrl = (version: string) =>
  `https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v${version}/dist/unicornStudio.umd.js`

let pending: Promise<UnicornStudioGlobal> | null = null

/**
 * Injects the Unicorn Studio runtime once per document and hands back the global.
 * Concurrent callers share a single request; a failure clears the cache so a later
 * caller can retry rather than inheriting the rejection forever.
 */
export function loadUnicornStudio(
  options: LoadUnicornStudioOptions = {},
): Promise<UnicornStudioGlobal> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("UnicornStudio can only be loaded in a browser"))
  }

  if (window.UnicornStudio) return Promise.resolve(window.UnicornStudio)
  if (pending) return pending

  const src = options.scriptUrl ?? cdnUrl(options.version ?? DEFAULT_VERSION)
  const timeoutMs = options.timeoutMs ?? 15_000

  pending = new Promise<UnicornStudioGlobal>((resolve, reject) => {
    // A script tag from a previous attempt may already be present, and may already
    // have failed. Listeners alone would never settle in that case, so everything
    // is bounded by the timeout below.
    const href = new URL(src, document.baseURI).href
    const existing = Array.from(document.querySelectorAll("script")).find((el) => el.src === href)
    const script = existing ?? document.createElement("script")

    let timer: ReturnType<typeof setTimeout>

    const settle = (fn: () => void) => {
      clearTimeout(timer)
      script.removeEventListener("load", handleLoad)
      script.removeEventListener("error", handleError)
      fn()
    }

    function handleLoad() {
      settle(() => {
        if (window.UnicornStudio) resolve(window.UnicornStudio)
        else reject(new Error("UnicornStudio script loaded but exposed no global"))
      })
    }

    function handleError() {
      settle(() => reject(new Error(`Failed to load UnicornStudio script from ${src}`)))
    }

    timer = setTimeout(() => {
      settle(() => {
        if (window.UnicornStudio) resolve(window.UnicornStudio)
        else reject(new Error(`Timed out loading UnicornStudio script from ${src}`))
      })
    }, timeoutMs)

    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)

    if (!existing) {
      script.src = href
      script.async = true
      document.head.appendChild(script)
    }
  })

  return pending.catch((error) => {
    pending = null
    throw error
  })
}
