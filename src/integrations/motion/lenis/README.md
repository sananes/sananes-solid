# Lenis

Smooth scroll via [Lenis](https://github.com/darkroomengineering/lenis), wired to
GSAP ScrollTrigger through a single animation loop.

Nothing ships until you import it. Lenis is dynamically imported on mount, and a
visitor who asked for reduced motion never downloads it at all.

## Usage

```tsx
import { SmoothScroll } from "~/integrations/motion/lenis"

<Router root={(props) => (
  <>
    <SmoothScroll />
    {props.children}
  </>
)} />
```

Or imperatively, if you want to own the lifecycle:

```ts
import { destroySmoothScroll, initSmoothScroll } from "~/integrations/motion/lenis"

const lenis = await initSmoothScroll({ lerp: 0.1 })
onCleanup(destroySmoothScroll)
```

Both mount one instance for the document. `initSmoothScroll` is idempotent —
concurrent callers get the same instance — and resolves to `null` when smooth
scroll is deliberately not running.

## Why it is wired this way

Two `requestAnimationFrame` loops fighting each other is the most common cause of
janky scroll sites, and it cannot be fixed by optimising assets. So:

- Lenis is constructed with `autoRaf: false` and never opens its own loop. It is
  driven by the shared ticker in `../ticker.ts`, which hands over to
  `gsap.ticker` the moment GSAP loads.
- ScrollTrigger updates from the **Lenis** scroll event, not the native one, so
  scrubbed animations follow the eased value the visitor actually sees.
- `gsap.ticker.lagSmoothing(0)` while Lenis is being driven. GSAP normally
  clamps delta time after a long frame (a background tab, a heavy task); that
  compensation fights an external driver and shows up as a jump on the next
  frame. It is restored to GSAP's default on teardown.
- `ScrollTrigger.refresh()` once on start, because Lenis changes the document
  height and that invalidates every cached trigger position.

A window-scrolling Lenis needs **no** `ScrollTrigger.scrollerProxy`. That is only
for scrolling inside a wrapper element.

## Options

Every [Lenis option](https://github.com/darkroomengineering/lenis#instance-settings)
is accepted. Changed defaults:

| Option | Default here | Why |
|---|---|---|
| `autoRaf` | `false` | The shared ticker owns the loop |
| `anchors` | `true` | `#hash` links should still work |
| `syncTouch` | `false` | Emulated touch momentum is worse than the platform's |
| `stopInertiaOnNavigate` | `true` | Inertia carrying into a new route feels broken |

Additions:

| Option | Type | Default | Description |
|---|---|---|---|
| `skipOnReducedMotion` | `boolean` | `true` | Do not load Lenis at all under `prefers-reduced-motion: reduce` |
| `syncScrollTrigger` | `boolean` | `true` | Load ScrollTrigger and wire the two together |
| `syncUnicornStudio` | `boolean` | `false` | Forward the eased scroll to `UnicornStudio.setScroll` |
| `onError` | `(error: Error) => void` | — | Suppresses the default `console.error` |

`skipOnReducedMotion` is stricter than Lenis's own `respectReducedMotion`, which
keeps Lenis running with smoothing disabled. Skipping means no library is
fetched and nothing intercepts the wheel.

Set `syncScrollTrigger: false` to use Lenis on its own; that keeps GSAP out of
the bundle entirely and the shared ticker falls back to its own
`requestAnimationFrame`.

## Unicorn Studio

`syncUnicornStudio` feeds the eased scroll position to a Unicorn Studio scene, so
the WebGL scene tracks the smoothed value rather than the raw one:

```tsx
<SmoothScroll syncUnicornStudio />
```

It is a no-op when no scene is present, so it is safe to leave on.

## Opting out of nested scroll

Lenis reads `data-lenis-prevent` on any scrollable region it should leave alone —
a modal body, a code block with overflow, a map:

```tsx
<div class="overflow-y-auto" data-lenis-prevent>
```

## Styles

Lenis needs a handful of rules, injected into `<head>` once on start under the
`lenis` classes it puts on `<html>`. They are prepended so application styles
win. Under a strict `style-src` CSP, opt out before `initSmoothScroll` and add
`LENIS_CSS` to your own stylesheet:

```ts
import { LENIS_CSS, setStyleInjection } from "~/integrations/motion/lenis"

setStyleInjection(false)
```

They are kept as a string rather than an `@import "lenis/dist/lenis.css"` in
`app.css`, which would ship the rules whether or not smooth scroll is opted
into. Check them against upstream when bumping the dependency.

One related rule already lives in the design system, in
`~/styles/css/global.css`: `html` gets `scrollbar-gutter: stable`, and
`html.lenis-stopped` exposes the scrollbar width as `--scrollbar-gutter`. So
`lenis.stop()` — for a modal, say — will not shift the layout. That rule ships
whether or not you opt in, since it is two lines and useful without Lenis.

## Notes

- Do not run this alongside GSAP's `ScrollSmoother`. They both take over the
  scroll and will fight.
- `getLenis()` returns the live instance for `scrollTo`, `stop`, `start`. It is
  `null` when smooth scroll is not running — under reduced motion, on the
  server, or before the import settles — so always null-check.
- Nothing here fixes a page that does not scroll natively. Test without Lenis
  first.
- This module does not mount itself. `app.tsx` opts in by rendering
  `<SmoothScroll />`; remove that line and Lenis is never downloaded.
