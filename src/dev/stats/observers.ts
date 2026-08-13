/**
 * Everything the browser will tell you about a page's performance that is not a
 * frame time.
 *
 * All of it is feature-detected individually. `PerformanceObserver` entry type
 * support is uneven — Safari has no `layout-shift`, no `longtask` and no `event`
 * timing — and an unsupported `observe()` throws rather than no-oping, so each
 * one gets its own try/catch and simply stays at zero where it is unavailable.
 *
 * These are diagnostics, not analytics. The numbers are lab values from whatever
 * machine the overlay is open on; real Core Web Vitals need field data.
 */

/** A long task blocks the main thread long enough for input to feel laggy. */
export const LONG_TASK_MS = 50

export interface VitalsStats {
  /** Largest Contentful Paint, milliseconds. 0 until it is known. */
  lcp: number
  /** Cumulative Layout Shift, unitless. Excludes shifts near an interaction. */
  cls: number
  /** Worst interaction latency seen, milliseconds. Approximates INP. */
  inp: number
  /** Number of tasks over `LONG_TASK_MS`. */
  longTasks: number
  /** Total main-thread time spent in long tasks, milliseconds. */
  longTaskMs: number
  /** Bytes transferred, by resource kind. */
  transferred: TransferStats
  /** Entry types this browser refused to observe. */
  unsupported: string[]
}

export interface TransferStats {
  total: number
  script: number
  css: number
  font: number
  image: number
  other: number
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

interface EventTimingEntry extends PerformanceEntry {
  duration: number
  interactionId?: number
}

const RESOURCE_KINDS: Record<string, keyof TransferStats> = {
  script: "script",
  link: "css",
  css: "css",
  font: "font",
  img: "image",
  image: "image",
  imageset: "image",
}

export function createVitalsCollector() {
  const observers: PerformanceObserver[] = []
  const unsupported: string[] = []

  let lcp = 0
  let cls = 0
  let inp = 0
  let longTasks = 0
  let longTaskMs = 0

  function observe(type: string, callback: (entries: PerformanceEntryList) => void): void {
    if (typeof PerformanceObserver === "undefined") return
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()))
      // `buffered` replays entries from before the overlay mounted, which is the
      // only way to see an LCP that already happened.
      observer.observe({ type, buffered: true })
      observers.push(observer)
    } catch {
      unsupported.push(type)
    }
  }

  function start(): void {
    observe("largest-contentful-paint", (entries) => {
      for (const entry of entries) lcp = Math.max(lcp, entry.startTime)
    })

    observe("layout-shift", (entries) => {
      for (const entry of entries as LayoutShiftEntry[]) {
        // Shifts within 500ms of an interaction are the visitor's own doing.
        if (!entry.hadRecentInput) cls += entry.value
      }
    })

    observe("longtask", (entries) => {
      for (const entry of entries) {
        longTasks += 1
        longTaskMs += entry.duration
      }
    })

    observe("event", (entries) => {
      for (const entry of entries as EventTimingEntry[]) {
        // Only interactions count towards INP; plain events do not.
        if (entry.interactionId) inp = Math.max(inp, entry.duration)
      }
    })
  }

  function snapshot(): VitalsStats {
    return {
      lcp: Math.round(lcp),
      // Three decimals: the "good" threshold is 0.1, so rounding hides it.
      cls: Math.round(cls * 1000) / 1000,
      inp: Math.round(inp),
      longTasks,
      longTaskMs: Math.round(longTaskMs),
      transferred: transferred(),
      unsupported: [...unsupported],
    }
  }

  function stop(): void {
    for (const observer of observers.splice(0)) observer.disconnect()
  }

  return { start, stop, snapshot }
}

export type VitalsCollector = ReturnType<typeof createVitalsCollector>

/**
 * Bytes over the wire, by kind. Read on demand from the resource timeline
 * rather than observed, because nothing needs it more than a few times a second.
 *
 * `transferSize` is 0 for cross-origin responses without `Timing-Allow-Origin`,
 * so treat this as a floor rather than a total.
 */
export function transferred(): TransferStats {
  const stats: TransferStats = { total: 0, script: 0, css: 0, font: 0, image: 0, other: 0 }
  if (typeof performance === "undefined" || !performance.getEntriesByType) return stats

  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[]
  for (const entry of entries) {
    const bytes = entry.transferSize ?? 0
    if (bytes === 0) continue
    const kind = RESOURCE_KINDS[entry.initiatorType] ?? "other"
    stats[kind] += bytes
    stats.total += bytes
  }
  return stats
}

/** Heap usage in bytes, where the browser exposes it (Chromium only). */
export function heapUsed(): number | null {
  const memory = (performance as { memory?: { usedJSHeapSize?: number } } | undefined)?.memory
  return memory?.usedJSHeapSize ?? null
}
