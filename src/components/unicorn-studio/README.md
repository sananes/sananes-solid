# UnicornStudio

A SolidJS wrapper around [unicornstudio.js](https://github.com/hiunicornstudio/unicornstudio.js).

It injects the runtime once per document, creates exactly one scene bound to its own
element, keeps that scene in sync with its props, and destroys it on unmount.

## Usage

```tsx
import UnicornStudio from "~/components/unicorn-studio"

export default function Page() {
  return <UnicornStudio projectId="your-project-id" width="100%" height="100%" />
}
```

Pass either `projectId` (a published embed) or `filePath` (a self-hosted scene JSON),
never both.

## Props

Every prop below is optional. Any other prop — `id`, `role`, `aria-*`, `data-*`,
DOM event handlers — is forwarded to the container element.

| Prop | Type | Default | Description |
|---|---|---|---|
| `projectId` | `string` | — | Published Unicorn Studio embed id |
| `filePath` | `string` | — | Path to a self-hosted exported scene JSON |
| `width` / `height` | `number \| string` | `"100%"` | Numbers are treated as pixels |
| `scale` | `number` | runtime default | Canvas rendering scale, `0.25`–`1` |
| `dpi` | `number` | runtime default | Scene resolution, typically `1`–`1.5` |
| `fps` | `number` | runtime default | Render loop target |
| `altText` | `string` | — | SEO text placed inside the `<canvas>` |
| `ariaLabel` | `string` | — | `aria-label` applied to the `<canvas>` |
| `lazyLoad` | `boolean` | `false` | Defer initialization until the scene scrolls into view |
| `production` | `boolean` | `false` | Serve scene data from the production edge CDN |
| `fixed` | `boolean` | auto | Force fixed-element behaviour |
| `interactivity` | `{ mouse?: { disabled?, disableMobile? } }` | — | Mouse/touch behaviour |
| `variables` | `Record<string, unknown>` | — | Scene variables, applied live on change |
| `preset` | `string` | — | Named preset; changing it rebuilds the scene |
| `version` | `string` | `"2.2.8"` | Runtime tag to load from jsDelivr |
| `scriptUrl` | `string` | — | Full URL to the UMD bundle; overrides `version` |
| `opacity` | `number` | `1` | Opacity once ready |
| `fadeDuration` | `number` | `1000` | Fade-in duration in ms |
| `fallback` | `JSX.Element` | — | Rendered in place of the scene on failure |
| `onSceneReady` | `(scene: UnicornScene) => void` | — | Receives the live scene object |
| `onError` | `(error: Error) => void` | — | Suppresses the default `console.error` |
| `onDestroy` | `() => void` | — | Called on unmount |

## Controlling a live scene

`onSceneReady` hands you the underlying scene, so imperative APIs stay available:

```tsx
<UnicornStudio
  projectId="abc123"
  onSceneReady={(scene) => {
    scene.setVariable("brandColor", "#7c3aed")
    scene.getLayer("Background")?.hide()
    scene.paused = true
  }}
/>
```

For values that change over time, prefer the `variables` prop — it calls
`setVariables` on the existing scene instead of rebuilding it:

```tsx
<UnicornStudio projectId="abc123" variables={{ intensity: intensity() }} />
```

## Rebuild behaviour

The scene is torn down and recreated when `projectId`, `filePath`, `scale`, `dpi`,
`fps`, `lazyLoad`, `production`, `fixed`, `preset`, `version`, or `scriptUrl` change.
Everything else either applies live or only affects the container. Overlapping
rebuilds are safe: only the newest attempt is kept.

## Styling

There is no stylesheet to import. A handful of container rules are injected into
`<head>` once, on first render, under the `unicorn-studio` class. They are prepended
so application styles win without needing extra specificity.

The container exposes `data-ready` and `data-error` attributes once the scene
settles, so state can be styled without importing anything:

```css
.hero[data-error] {
  background: color-mix(in srgb, red 10%, transparent);
}
```

`width`, `height`, `opacity`, `visibility`, and `--us-fade-duration` are set inline.
A `style` object is merged after those, so it wins on conflict.
`prefers-reduced-motion` disables the fade.

Under a strict `style-src` CSP, or if you would rather own the rules, opt out before
the first render and add `UNICORN_STUDIO_CSS` to your own stylesheet:

```ts
import { setStyleInjection, UNICORN_STUDIO_CSS } from "~/components/unicorn-studio"

setStyleInjection(false)
```

## Errors

Failures are reported through `onError`. Without a handler the component logs to the
console instead of failing silently. `fallback` renders in place of the scene:

```tsx
<UnicornStudio projectId="abc123" fallback={<img src="/hero.avif" alt="" />} />
```

## Loading the runtime yourself

`loadUnicornStudio` is exported for preloading or for use outside the component. It
is idempotent, shared across callers, and bounded by a timeout:

```ts
import { loadUnicornStudio } from "~/components/unicorn-studio"

const runtime = await loadUnicornStudio({ scriptUrl: "/vendor/unicornStudio.umd.js" })
```

Self-hosting via `scriptUrl` is the usual answer to a strict `script-src` CSP.

## Notes

- The runtime owns its render loop, visibility gating, resize handling, and page
  visibility handling, so no manual pause/resume on route changes is needed. Call
  `scene.resize()` only after app-driven layout changes that no window resize follows.
- Browsers cap WebGL contexts at roughly 16; keep to under ten scenes per page.
- For ambient background scenes, lower `scale`, `dpi`, or `fps` before reaching for
  anything more elaborate.
