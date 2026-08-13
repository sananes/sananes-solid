import type { Howl } from "howler"

import { loadHowler } from "./loader"
import { muted, preparePlayback, reportError } from "./runtime"
import type { HowlDefinition } from "./types"

type SpriteName<D> = D extends { sprite: infer S }
  ? S extends Record<string, unknown>
    ? keyof S & string
    : never
  : never

type InstanceRecord = {
  def: HowlDefinition
  instance: Howl | undefined
}

const registry = new Map<string, InstanceRecord>()

export type HowlPack<T extends Record<string, HowlDefinition>> = {
  play: <K extends keyof T & string>(
    name: K,
    sprite?: SpriteName<T[K]>,
  ) => Promise<number | undefined>
  stop: (name?: keyof T & string) => void
  unload: (name?: keyof T & string) => void
}

/**
 * Register named sounds. Instances are created on the first unmuted `play`,
 * so defining a pack does not fetch audio or load Howler.
 *
 * Sprite names are typed from the `sprite` map:
 *
 * ```ts
 * const sfx = defineHowls({
 *   ui: { src: "/ui.webm", sprite: { tap: [0, 180] } },
 * })
 * sfx.play("ui", "tap")
 * ```
 */
export function defineHowls<T extends Record<string, HowlDefinition>>(defs: T): HowlPack<T> {
  const names = Object.keys(defs) as (keyof T & string)[]

  for (const name of names) {
    const existing = registry.get(name)
    existing?.instance?.unload()
    registry.set(name, { def: defs[name], instance: undefined })
  }

  const play = async <K extends keyof T & string>(
    name: K,
    sprite?: SpriteName<T[K]>,
  ): Promise<number | undefined> => {
    return playRegistered(name, sprite)
  }

  const stop = (name?: keyof T & string) => {
    if (name) stopRegistered(name)
    else for (const key of names) stopRegistered(key)
  }

  const unload = (name?: keyof T & string) => {
    if (name) unloadRegistered(name)
    else for (const key of names) unloadRegistered(key)
  }

  return { play, stop, unload }
}

export async function playRegistered(name: string, sprite?: string): Promise<number | undefined> {
  if (typeof window === "undefined" || muted()) return undefined

  const record = registry.get(name)
  if (!record) {
    reportError(new Error(`Howl: no sound registered as "${name}"`))
    return undefined
  }

  try {
    if (!(await preparePlayback())) return undefined
    const instance = await ensureInstance(name, record)
    if (!instance || muted()) return undefined
    return sprite === undefined ? instance.play() : instance.play(sprite)
  } catch (error) {
    reportError(error, record.def.onError)
    return undefined
  }
}

export function stopRegistered(name?: string): void {
  if (name) {
    registry.get(name)?.instance?.stop()
    return
  }
  for (const record of registry.values()) record.instance?.stop()
}

function unloadRegistered(name: string): void {
  const record = registry.get(name)
  if (!record) return
  record.instance?.unload()
  record.instance = undefined
}

async function ensureInstance(name: string, record: InstanceRecord): Promise<Howl | undefined> {
  if (record.instance) return record.instance

  const { Howl } = await loadHowler()
  // Mute (or a competing define) may have landed while we waited.
  const current = registry.get(name)
  if (!current || current !== record || muted()) return undefined
  if (current.instance) return current.instance

  const { onError: _onError, preload, ...options } = record.def
  const instance = new Howl({
    ...options,
    preload: preload ?? false,
    autoplay: false,
  })

  if (registry.get(name) !== record || muted()) {
    instance.unload()
    return undefined
  }

  record.instance = instance
  return instance
}

export function resetRegistry(): void {
  for (const record of registry.values()) {
    try {
      record.instance?.unload()
    } catch {
      // Tests use a stub Howl; a missing unload should not fail the reset.
    }
  }
  registry.clear()
}
