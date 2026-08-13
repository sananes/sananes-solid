# Stats

A performance debug overlay: frame times, long tasks, layout shift, and page
weight, in a panel over the page you are measuring.

Zero dependencies, and dead-code-eliminated from production builds when imported
the way below.

## Usage

```tsx
import { StatsOverlay } from "~/dev/stats"

<Router root={(props) => (
  <>
    {props.children}
    {import.meta.env.DEV && <StatsOverlay />}
  </>
)} />
```

`import.meta.env.DEV` is a compile-time constant, so the whole subtree — the
overlay, the sampler, the observers, the CSS string — is dropped from the
production bundle. Wrap the import in `lazy()` if you would rather keep it out of
the dev bundle's critical path too.

Ctrl+Alt+P collapses the panel to just the fps readout; the state is remembered.

## What it reports

| Row | Meaning |
|---|---|
| fps | Frames in the last **completed** second, not a rolling average |
| fps min | Worst completed second since load |
| frame p50 / p95 | Median and 95th percentile frame time |
| frame worst | Slowest single frame in the buffer |
| dropped | Frames over 20ms, out of frames measured |
| tasks >50ms | Long tasks, and total main-thread time inside them |
| LCP / CLS / INP | Core Web Vitals, as lab values |
| transferred | Bytes over the wire, from the resource timeline |
| JS heap | `usedJSHeapSize`, Chromium only |

The header also shows which loop is driving the page — `gsap.ticker` or `raf`
(see `~/integrations/motion`). Two loops is the most common cause of scroll jank, so it is
worth being able to see at a glance.

### Why the tail, not the average

A page that renders 58 frames in a second and spends 120ms on one of them reads
as "58 fps" and feels broken. The average is the one number that cannot tell you
that, which is why p95, the worst frame, and the dropped count sit next to it.
Watch p95 while scrolling; that is the number that tracks how the page feels.

## Cost

The overlay has to be cheap enough to trust while it is open:

- Frame times are recorded on the shared ticker from `~/integrations/motion`, not a second
  `requestAnimationFrame`. Measuring from its own loop would both distort the
  numbers and add the problem it is reporting.
- Per frame it writes one slot in a fixed `Float32Array`. No allocation, no
  signal write, no reconciliation.
- The panel repaints 5 times a second (`hz`), writing `textContent` on cached
  element references and only when a value actually changed.
- The graph is one canvas draw call, not 240 elements.
- Percentiles are computed on snapshot, not per frame.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `corner` | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right"` | `"bottom-left"` | Panel position |
| `hz` | `number` | `5` | Panel repaints per second |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `hotkey` | `string \| null` | `"p"` | Toggle key, with Ctrl+Alt. `null` disables |
| `persist` | `boolean` | `true` | Remember collapsed state in `localStorage` |

## Profiling a production build

Development numbers are not production numbers: unminified code, no bundling, hot
module reloading and the dev server's own work all show up in the frame times. To
measure the real thing, render the overlay unconditionally, build, and serve the
static output:

```sh
bun run build && bun run serve
```

Remember to put the `import.meta.env.DEV` guard back.

## The pieces, used directly

Each part works on its own, if you want numbers somewhere other than a panel:

```ts
import { createFrameSampler, createVitalsCollector, startFrameSampler } from "~/dev/stats"

const sampler = createFrameSampler()
const stop = startFrameSampler(sampler)
sampler.snapshot() // { fps, p50, p95, worst, dropped, history, ... }

const vitals = createVitalsCollector()
vitals.start()
vitals.snapshot() // { lcp, cls, inp, longTasks, transferred, unsupported }
```

`createFrameSampler` takes time and delta as arguments rather than reading a
clock, which is what makes it testable — see `sampler.test.ts`.

## Notes

- Everything is feature-detected individually. `PerformanceObserver` entry type
  support is uneven — Safari has no `layout-shift`, `longtask` or `event` timing
  — and an unsupported `observe()` throws rather than no-oping. Unavailable
  metrics stay at zero and are listed in `snapshot().unsupported`.
- `transferSize` is 0 for cross-origin responses without `Timing-Allow-Origin`,
  so page weight is a floor rather than a total.
- These are lab values from one machine. Real Core Web Vitals need field data
  from real visitors, which a static site has to collect elsewhere.
- The panel's styles are self-contained rather than themed, so it stays legible
  on top of whatever it is measuring. `setStyleInjection(false)` plus
  `STATS_OVERLAY_CSS` for a strict `style-src` CSP.
- This module does not mount itself. `app.tsx` opts in behind
  `import.meta.env.DEV`, so the overlay is dead-code-eliminated from production.
