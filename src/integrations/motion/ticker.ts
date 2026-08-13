/**
 * The single animation loop.
 *
 * Two `requestAnimationFrame` loops fighting each other is the most common
 * cause of scroll jank, and it cannot be fixed by optimising assets. Lenis and
 * the performance sampler therefore never open their own loop — they subscribe
 * here, and this module keeps exactly one.
 *
 * When GSAP is loaded it becomes the master clock (`setTickerSource` is called
 * from the GSAP loader) and every subscriber migrates onto `gsap.ticker`
 * mid-flight. Without GSAP the fallback below drives them, so each module still
 * works on its own.
 *
 * Times are normalised to milliseconds for both backends: `gsap.ticker` reports
 * elapsed time in seconds, `requestAnimationFrame` in milliseconds.
 */

export type TickCallback = (timeMs: number, deltaMs: number) => void

/** The shape of `gsap.ticker` that this module relies on. */
export interface TickerSource {
  add(callback: (time: number, deltaMs: number) => void): unknown
  remove(callback: (time: number, deltaMs: number) => void): unknown
}

const FALLBACK_FRAME_MS = 1000 / 60

type Backend = "source" | "raf" | null

const subscribers = new Set<TickCallback>()

let source: TickerSource | null = null
let backend: Backend = null
/** The source the bridge is currently registered on, so teardown is exact. */
let attachedSource: TickerSource | null = null
let rafId: number | null = null
let lastFrameMs = 0

function dispatch(timeMs: number, deltaMs: number): void {
  // Copied so a subscriber that unsubscribes mid-tick cannot skip its peers.
  for (const callback of Array.from(subscribers)) callback(timeMs, deltaMs)
}

function onGsapTick(time: number, deltaMs: number): void {
  dispatch(time * 1000, deltaMs)
}

function onFrame(now: number): void {
  rafId = requestAnimationFrame(onFrame)
  const deltaMs = lastFrameMs === 0 ? FALLBACK_FRAME_MS : now - lastFrameMs
  lastFrameMs = now
  dispatch(now, deltaMs)
}

/**
 * Move the bridge onto whichever backend should be running, and stop entirely
 * once the last subscriber leaves. Safe to call repeatedly.
 */
function reconcile(): void {
  const wanted: Backend = subscribers.size === 0 ? null : source ? "source" : "raf"
  const stale = backend === "source" && attachedSource !== source
  if (wanted === backend && !stale) return

  if (attachedSource) {
    attachedSource.remove(onGsapTick)
    attachedSource = null
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
    lastFrameMs = 0
  }
  backend = null

  if (wanted === "source" && source) {
    source.add(onGsapTick)
    attachedSource = source
    backend = "source"
    return
  }

  // No rAF on the server, so the loop simply never starts there.
  if (wanted === "raf" && typeof requestAnimationFrame === "function") {
    rafId = requestAnimationFrame(onFrame)
    backend = "raf"
  }
}

/** Subscribe to the loop. Returns an unsubscribe function. */
export function addTick(callback: TickCallback): () => void {
  subscribers.add(callback)
  reconcile()
  return () => removeTick(callback)
}

export function removeTick(callback: TickCallback): void {
  if (!subscribers.delete(callback)) return
  reconcile()
}

/**
 * Hand the loop over to an external ticker, or pass `null` to fall back to a
 * private `requestAnimationFrame`. Existing subscribers migrate immediately.
 */
export function setTickerSource(next: TickerSource | null): void {
  if (source === next) return
  source = next
  reconcile()
}

/** Whether an external ticker (in practice `gsap.ticker`) is driving the loop. */
export function hasTickerSource(): boolean {
  return source !== null
}

/** Test hook: drop every subscriber and stop the loop. */
export function resetTicker(): void {
  subscribers.clear()
  source = null
  reconcile()
}
