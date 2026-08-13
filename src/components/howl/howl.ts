import { defineHowls, playRegistered, stopRegistered } from "./define"
import { configure, mute, muted, toggle, unlocked, unmute, volume } from "./runtime"

/**
 * Imperative facade. Mute/volume live here; `play` / `stop` look up sounds
 * previously registered with `defineHowls` (or `howl.define`).
 */
export const howl = {
  define: defineHowls,
  play: playRegistered,
  stop: stopRegistered,
  mute,
  unmute,
  toggle,
  volume,
  muted,
  unlocked,
  configure,
}
