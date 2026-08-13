# Howl

A SolidJS wrapper around [howler.js](https://howlerjs.com) core.

Nothing ships until you import it. Nothing plays until the visitor unmutes.
Howler itself is loaded on that unmute (or the first unmuted `play`), never at
module evaluate time, so SSR and unused routes stay silent.

## Usage

```tsx
import { createHowl, defineHowls, howl, HowlToggle } from "~/components/howl"

const sfx = defineHowls({
  click: { src: "/sounds/click.webm" },
  ui: {
    src: ["/sounds/ui.webm", "/sounds/ui.mp3"],
    sprite: { tap: [0, 180], hover: [200, 120] },
  },
})

sfx.play("click")
sfx.play("ui", "tap")

const ambient = createHowl("/sounds/bed.mp3", {
  loop: true,
  html5: true,
  volume: 0.3,
  resumeOnUnmute: true,
})

export default function Page() {
  return <HowlToggle>Sound</HowlToggle>
}
```

Mount `<HowlToggle />` (or call `howl.unmute()` from your own control) to opt
the visitor in. Until then every `play` is a no-op: no Howler import, no
network.

## Opt-in defaults

| Default | Why |
|---|---|
| Global mute starts `true` | A previous visit cannot start audio |
| `Howler.autoUnlock = false` | A click anywhere would otherwise unlock audio |
| `preload: false` | Defining a sound does not fetch it |
| Core build only | Spatial plugin stays out until you ask |
| Dynamic `import()` | Howler touches `window` at evaluate time |

`prefers-reduced-motion: reduce` does not mute — that is a different
preference. It only skips `resumeOnUnmute` for looping sounds.

## `defineHowls`

Registers named sounds. Instances are created on the first unmuted `play`.
Sprite names are typed from the `sprite` map.

```ts
const sfx = defineHowls({
  ui: { src: "/ui.webm", sprite: { tap: [0, 180], hover: [200, 120] } },
})

sfx.play("ui", "tap")
sfx.stop("ui")
sfx.unload()
```

The same names are also available on the imperative facade:

```ts
howl.play("ui", "tap")
howl.stop("ui")
```

## `createHowl`

Owns one Howl for the lifetime of the calling component (needs a Solid owner,
same as `createReveal`). The instance is created on the first unmuted `play`,
or on unmute when `preload` is set. Overlapping loads are safe: only the
newest attempt is kept. Cleanup unloads.

```ts
const whoosh = createHowl(() => `/sounds/${take()}.webm`, { volume: 0.4 })

whoosh.play()
whoosh.playing() // Accessor<boolean>
whoosh.howl()    // the live Howl, once created
```

`src` may be a value or an accessor. Changing it tears the current instance
down and, if it was playing, starts the new one.

### Options

Every [Howl option](https://github.com/goldfire/howler.js#documentation) is
accepted except `autoplay` (always off). Additions:

| Option | Type | Default | Description |
|---|---|---|---|
| `resumeOnUnmute` | `boolean` | `false` | Replay when the user unmutes |
| `onError` | `(error: Error) => void` | — | Suppresses the default `console.error` |
| `preload` | `boolean \| "metadata"` | `false` | Fetch on unmute, not on define |

Returned controls: `play`, `pause`, `stop`, `fade`, `seek`, `unload`,
`playing`, `muted`, `unlocked`, `volume`, `setVolume`, `howl`.

`play` returns `Promise<number \| undefined>` — the Howl sound id, or
`undefined` while muted / on the server.

## `howl` facade

```ts
howl.unmute()
howl.mute()
howl.toggle()
howl.muted()     // Accessor<boolean>
howl.unlocked()  // Accessor<boolean>
howl.volume()    // 0–1
howl.volume(0.5)
howl.configure({ persist: true })
```

`configure({ persist: true })` writes mute to `localStorage` under `howl:muted`.
Off by default. A stored unmute restores the preference only; the AudioContext
still needs a gesture.

## `<HowlToggle />`

Optional. Unstyled `<button type="button">` that calls `howl.toggle()`. State
is exposed as `data-howl="muted" | "on"` so it can be styled without importing
anything:

```css
.howl-toggle[data-howl="on"] {
  color: var(--color-foreground);
}
```

A handful of token-only rules are injected into `<head>` once, on first
render, under the `howl-toggle` class. They are prepended so application
styles win. Under a strict `style-src` CSP, opt out before the first render
and add `HOWL_TOGGLE_CSS` to your own stylesheet:

```ts
import { HOWL_TOGGLE_CSS, setStyleInjection } from "~/components/howl"

setStyleInjection(false)
```

Any other button prop — `id`, `class`, `aria-*`, `onClick` — is forwarded.
`onClick` can `preventDefault()` to skip the toggle.

## Loading the runtime yourself

`loadHowler` is exported for preloading. It is idempotent, shared across
callers, and loads `howler/src/howler.core.js` (no spatial plugin):

```ts
import { loadHowler } from "~/components/howl"

const { Howl, Howler } = await loadHowler()
```

## Errors

Failures are reported through `onError` on the definition / `createHowl`
options. Without a handler the wrapper logs to the console instead of failing
silently.

## Notes

- Do not statically import `howler`. The wrapper's dynamic import is what
  keeps SolidStart's SSR from evaluating the UMD bundle.
- Long beds should pass `html5: true` so Howler does not decode the whole
  file before playing.
- This module does not mount itself. Nothing in `app.tsx` references it.
