# GSAP

[GSAP](https://gsap.com) for Solid, with scoped setup and automatic cleanup.

Nothing ships until you import it. GSAP core is dynamically imported on mount,
so it stays out of the initial bundle and never evaluates during SSR. Every
plugin is a separate chunk, fetched only when you name it.

## Usage

```tsx
import { createGsap } from "~/integrations/motion/gsap"

export default function Cards() {
  const scope = createGsap<HTMLDivElement>(({ gsap }) => {
    gsap.from(".card", {
      y: 40,
      opacity: 0,
      stagger: 0.1,
      scrollTrigger: { trigger: ".grid", start: "top 75%" },
    })
  }, { plugins: ["ScrollTrigger"] })

  return (
    <div ref={scope} class="grid">
      <For each={items}>{(item) => <div class="card">{item.name}</div>}</For>
    </div>
  )
}
```

## `createGsap`

The Solid counterpart of React's `useGSAP`. Returns a ref setter; attach it to a
container and:

- GSAP (and any named plugins) load on mount, before the callback runs.
- The callback runs inside a `gsap.context()` **scoped to that container**, so
  `".card"` cannot reach into the rest of the page.
- On cleanup the context is reverted: every tween and ScrollTrigger it created
  is killed and the inline styles they wrote are removed.
- If the component unmounts while the import is still in flight, no context is
  ever created.

The callback receives `{ gsap, context, scope }`. `context` is the GSAP
[Context](https://gsap.com/docs/v3/GSAP/gsap.context()); use `context.add(name, fn)`
when a later event handler needs to create animations that are still tracked.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `plugins` | `GsapPluginName[]` | `[]` | Registered before the callback runs |
| `respectReducedMotion` | `boolean` | `true` | Skip the callback entirely under `prefers-reduced-motion: reduce` |
| `onError` | `(error: Error) => void` | — | Suppresses the default `console.error` |

`respectReducedMotion` defaults to `true` because an animation that only
decorates should not run at all. When the animation carries meaning, set it to
`false` and branch inside the callback — `createGsapMatchMedia` makes that a
one-liner.

`createGsapContext` is the same contract without a scope, for animations that
are not anchored to one element. Selector strings then resolve document-wide, so
prefer `createGsap`.

## `createGsapMatchMedia`

Responsive and reduced-motion branches. `gsap.matchMedia()` records everything
created inside a branch and reverts it when that branch stops matching, so
crossing a breakpoint unpins sections and clears cached measurements instead of
leaking stale triggers.

```tsx
import { createGsapMatchMedia, MOTION_OK, MOTION_REDUCED } from "~/integrations/motion/gsap"

const scope = createGsapMatchMedia<HTMLElement>(({ mm, gsap }) => {
  mm.add(`(min-width: 64rem) and ${MOTION_OK}`, () => {
    gsap.to(".panel", { xPercent: -100, scrollTrigger: { pin: true, scrub: true } })
  })
  mm.add(MOTION_REDUCED, () => {
    gsap.set(".panel", { opacity: 1 })
  })
}, { plugins: ["ScrollTrigger"] })
```

The ref is optional here: attach it to scope selectors to a container, or ignore
it and they resolve document-wide.

## Plugins

Every plugin ships free in the `gsap` package as of 3.13, so naming one is only
a bundle-size decision. Available names:

`ScrollTrigger`, `ScrollSmoother`, `ScrollToPlugin`, `SplitText`, `Observer`,
`Flip`, `Draggable`, `MotionPathPlugin`, `CustomEase`, `TextPlugin`.

Each is imported and registered once, however many components ask for it. Add
more to `PLUGIN_LOADERS` in `types.ts` — the record is static because a variable
`import()` specifier cannot be analysed by the bundler.

`ScrollSmoother` is listed for completeness, but this starter uses Lenis for
smooth scrolling (see `../lenis`). Do not run both.

## Keeping ScrollTrigger accurate

ScrollTrigger caches start/end positions on refresh, so anything that changes
layout afterwards leaves triggers firing at the wrong offset. It already
refreshes on window resize; `refresh.ts` covers the two cases it cannot see.

```ts
import { autoRefresh } from "~/integrations/motion/gsap"

// In the router root:
onCleanup(autoRefresh())
```

- `refreshOnFontsReady()` — webfonts are preloaded in `entry-server.tsx`, but the
  swap still reflows text after first paint, moving everything below it.
- `refreshOnResize({ target, debounceMs })` — a debounced `ResizeObserver`, for
  content that settles late: images without intrinsic dimensions, a CMS list
  that renders after its data resolves, an expanding accordion.

## Loading GSAP yourself

`loadGsap` is exported for preloading or for imperative code. It is idempotent
and shared across callers:

```ts
import { loadGsap, loadScrollTrigger } from "~/integrations/motion/gsap"

const gsap = await loadGsap(["SplitText"])
const ScrollTrigger = await loadScrollTrigger()
```

`getGsap()` and `getScrollTrigger()` return the loaded instances or `null`,
which lets other code integrate with ScrollTrigger without forcing it into the
bundle — `../lenis` uses exactly that.

## Notes

- Loading GSAP hands the shared ticker in `../ticker.ts` over to `gsap.ticker`.
  Anything already subscribed migrates onto GSAP's loop rather than running a
  second `requestAnimationFrame`. This is the whole reason `ticker.ts` exists.
- Animate `transform` and `opacity` wherever possible; they run on the
  compositor. Animating `top`, `width`, or `margin` on scroll will cost frames.
- Scrub, do not scroll-jack: let the visitor's scroll position drive progress
  (`scrub: true`) rather than animating the scroll position itself.
- Register plugins through `loadGsap`, not `gsap.registerPlugin`, so the
  once-only bookkeeping stays in one place.
- This module does not mount itself, and no app code imports it — but the Lenis
  module loads GSAP and ScrollTrigger at runtime unless `<SmoothScroll />` is
  given `syncScrollTrigger={false}`.
