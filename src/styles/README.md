# Styles (SolidStart port)

Hybrid styling ported from darkroom.engineering's Satūs starter to **SolidStart
/ Vite**: **Tailwind CSS v4** (CSS-based config via `@theme`), plain **CSS
Modules** for complex/animated components, and custom **PostCSS functions**.

- **`dr-*` utilities** for viewport-relative responsive sizing.

Only the framework-coupled pieces changed; the token architecture, generators,
`dr-*` utility system, PostCSS functions, and contrast harness are byte-for-byte
the original. See `PORT-NOTES` in the top-level README for the exact diff.

## Which tool for which job?

Reach for the lightest tool that does the job. In rough order of preference:

| Use…                   | When                                                                  | Example                                |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| **Tailwind utilities** | Layout, spacing, flex/grid, color, simple states. The default.        | `class="flex items-center gap-4 p-6"`  |
| **`dr-*` utilities**   | Sizing that must **scale with the viewport** (px-perfect to a design) | `class="dr-w-150 dr-h-100"`            |
| **PostCSS fns in CSS** | Viewport/column math inside a CSS Module                              | `width: desktop-vw(320);`              |
| **CSS Modules**        | Complex layouts, keyframes, pseudo-elements, deep specificity         | `import s from './x.module.css'`       |
| **Inline `style`**     | **Only** dynamic runtime values (a computed `--progress`)             | `style={{ '--p': pct }}`               |

Rules of thumb: never hand-write spacing/colors Tailwind already gives you;
animate only `transform`/`opacity`; compose classes with `clsx`.

## PostCSS functions

```css
.element {
  width: mobile-vw(375);   /* 375px at the mobile viewport */
  height: desktop-vh(100); /* 100px at the desktop viewport */
}
.sidebar {
  width: columns(3);       /* spans 3 grid columns + gaps */
}
```

Available: `mobile-vw()`, `mobile-vh()`, `desktop-vw()`, `desktop-vh()`, `columns(n)`.

## Custom `dr-*` utilities

```tsx
<div class="dr-w-150 dr-h-100" />  {/* viewport-scaled width/height */}
<div class="dr-w-col-4" />          {/* 4 columns wide */}
<div class="dr-grid" />             {/* 4 cols mobile, 12 cols desktop */}
```

See the generated `css/tailwind.css` for the full generated set. On the mobile
board (`<800px`) a `dr-*` value is interpreted against a 375px artboard; on the
desktop board (`>=800px`) against 1440px — so you typically pair them with the
`dt:` variant: `class="dr-w-40 dt:dr-w-150"`.

## Breakpoints

```css
@media (--mobile)  { /* <= 799px */ }
@media (--desktop) { /* >= 800px */ }
```

## Theme

```tsx
import { Theme, useTheme } from '@/styles'

<Theme theme="dark" global>
  <App />
</Theme>

const { name, theme, setTheme } = useTheme()
setTheme('evil')
```

`Theme` sets `data-theme` on <html>; the generated `[data-theme=…]` blocks remap
every role in the palette per theme. Reference the semantic tokens — never
hard-code a hex in a component.

## Reveal on scroll

```tsx
import { createReveal } from '@/styles'

const reveal = createReveal<HTMLDivElement>()
<div ref={reveal} class={s.grid}>
  <div data-reveal-item>…</div>
</div>
```

```css
.grid {
  --reveal-transform: translateY(32px);
  --reveal-stagger: 120ms;
}
```

The animation contract lives in `css/global.css`; the primitive only owns the
IntersectionObserver mechanism. Degrades gracefully with JS disabled and respects
`prefers-reduced-motion`.

## Contrast

The `contrast` token (red in the shipped palette) is not body-text-safe on the
dark themes — APCA scores it ~Lc 32 against black even though WCAG 2 passes it —
so treat it as an accent, focus-ring, and display-type colour only, not body
copy. Run `bun run contrast:accept` after rebranding to re-record the accepted
baseline for your palette.

## Design tokens

Layout tokens are generated into `css/root.css`. Color and font tokens are
registered with Tailwind via `@theme` in `css/tailwind.css`. Easing tokens live
in hand-authored `css/easings.css`; font families in hand-authored `css/fonts.css`.

- **Color** — `colors.ts` is the source; `@theme` in `css/tailwind.css` is
  generated from it. The roles are `--color-foreground`, `--color-subdued`,
  `--color-muted`, `--color-black`, `--color-white`, `--color-border` and
  `--color-borderHover`, remapped per theme (`light`, `dark`). Note the camel
  case on the last one — it is the TypeScript key, verbatim.
- **Easing** — `--ease-out-expo`, `--ease-in-out-cubic`, … in `css/easings.css`.
- **Font** — `--font-family-display` / `--font-family-mono` in `css/fonts.css`,
  mapped by the generator to Tailwind's `--font-display` / `--font-mono`.
- **Layout** — `--gap`, `--device-width`, and the column grid that powers
  `columns()` and `dr-*-col-*`.

## Adding a design token

Edit the **source** config (never the generated CSS), then regenerate:

```bash
# 1. Add the value — e.g. a new brand color in src/styles/colors.ts
#    colors = { ..., brand: 'oklch(0.7 0.2 30)' }
# 2. Regenerate root.css + tailwind.css from the config
bun run setup:styles
# 3. Use it
#    CSS:      color: var(--color-brand);
#    Tailwind: class="text-(--color-brand)"
```

| File            | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `colors.ts`     | Color palette & per-theme semantic mapping                       |
| `typography.ts` | Font sizes & weights (points at the `--font-family-*` vars)      |
| `layout.mjs`    | Grid, breakpoints, spacing, device widths                        |
| `fonts.ts`      | JS-side font stacks + CSS var names (registration in fonts.css)  |
| `config.ts`     | Aggregates the above (imported as `@/styles`)                    |

## Generated files — do not edit

`css/root.css` and `css/tailwind.css` are **generated** by `bun run setup:styles`
and **committed** to the repo (that is the drift-control model — `setup-styles.test.ts`
fails CI if they go stale). Hand-edits are overwritten on the next run.

`css/easings.css`, `css/fonts.css`, and `css/global.css` are hand-authored — edit
them directly.

## Troubleshooting

- **Tokens missing / `dr-*` does nothing / `mobile-vw()` left unparsed** — the
  generated CSS is stale. `bun run setup:styles` regenerates it; `predev`/`prebuild`
  run it automatically, so this normally self-heals.
- **A token edit "didn't apply"** — confirm you changed the source in
  `src/styles/*`, not the generated `css/*`, then re-run `bun run setup:styles`.
