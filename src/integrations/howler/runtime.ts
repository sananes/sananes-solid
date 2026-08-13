import { createSignal } from "solid-js"

import { getHowler, loadHowler } from "./loader"

const STORAGE_KEY = "howl:muted"

const [muted, setMuted] = createSignal(true)
const [unlocked, setUnlocked] = createSignal(false)
const [volumeSignal, setVolumeSignal] = createSignal(1)

let persistEnabled = false
const unmuteListeners = new Set<() => void>()

export { muted, unlocked }

/** Clamp and (optionally) apply the master volume. Omit `value` to read. */
export function volume(): number
export function volume(value: number): number
export function volume(value?: number): number {
  if (value === undefined) return volumeSignal()
  const next = value < 0 ? 0 : value > 1 ? 1 : value
  setVolumeSignal(next)
  getHowler()?.Howler.volume(next)
  return next
}

export type HowlConfigureOptions = {
  /**
   * Persist mute to `localStorage` under `howl:muted`. Off by default so a
   * previous visit cannot unmute a later one without the user asking.
   */
  persist?: boolean
}

export function configure(options: HowlConfigureOptions): void {
  persistEnabled = Boolean(options.persist)
  if (persistEnabled) readStoredMute()
}

/**
 * Subscribe to a successful unmute. Returns an unsubscribe function.
 * Used by `createHowl({ resumeOnUnmute })` so looping beds can restart.
 */
export function onUnmute(listener: () => void): () => void {
  unmuteListeners.add(listener)
  return () => {
    unmuteListeners.delete(listener)
  }
}

export function mute(): void {
  setMuted(true)
  getHowler()?.Howler.mute(true)
  writeStoredMute()
}

/**
 * The opt-in. Loads Howler (if needed), resumes the AudioContext, and flips
 * the global mute. No-ops on the server.
 */
export async function unmute(): Promise<void> {
  if (typeof window === "undefined") return
  if (!muted() && unlocked()) return

  try {
    const mod = await armHowler()
    setMuted(false)
    setUnlocked(await resumeContext(mod.Howler))
    writeStoredMute()
    for (const listener of unmuteListeners) listener()
  } catch (error) {
    reportError(error)
  }
}

/**
 * Load Howler and resume the context without changing mute. `play` uses this
 * when mute is already off (e.g. a persisted preference) so the first gesture
 * still unlocks autoplay.
 */
export async function preparePlayback() {
  if (typeof window === "undefined" || muted()) return undefined
  try {
    const mod = await armHowler()
    if (await resumeContext(mod.Howler)) setUnlocked(true)
    return mod
  } catch (error) {
    reportError(error)
    return undefined
  }
}

async function armHowler() {
  const mod = await loadHowler()
  mod.Howler.volume(volumeSignal())
  mod.Howler.mute(false)
  return mod
}

export async function toggle(): Promise<void> {
  if (muted()) await unmute()
  else mute()
}

export function reportError(err: unknown, onError?: (error: Error) => void): void {
  const error = err instanceof Error ? err : new Error(String(err))
  if (onError) onError(error)
  else console.error(error)
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function resetRuntime(): void {
  setMuted(true)
  setUnlocked(false)
  setVolumeSignal(1)
  persistEnabled = false
  unmuteListeners.clear()
}

async function resumeContext(Howler: {
  ctx?: { state: string; resume?: () => Promise<void> }
}): Promise<boolean> {
  const ctx = Howler.ctx
  if (!ctx) return false
  if (ctx.state === "running") return true
  try {
    await ctx.resume?.()
    return ctx.state === "running"
  } catch {
    return false
  }
}

function readStoredMute(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // `"0"` means they previously unmuted. Restore the preference; the
    // AudioContext still needs a gesture (`unmute` / a click on HowlToggle).
    if (stored === "0") setMuted(false)
  } catch {
    // Private mode / no storage — keep the in-memory default.
  }
}

function writeStoredMute(): void {
  if (!persistEnabled) return
  try {
    localStorage.setItem(STORAGE_KEY, muted() ? "1" : "0")
  } catch {
    // Ignore quota / privacy failures; mute state still lives in memory.
  }
}
