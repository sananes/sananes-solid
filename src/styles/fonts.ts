/**
 * Fonts (SolidStart / Vite)
 *
 * The original starter loaded fonts through `next/font/google`, which is a
 * Next-only build-time loader. SolidStart runs on Vite, so the faces come from
 * Fontsource *variable* packages instead — one file per family covers every
 * weight, like the `next/font` variable-axis loading it replaces.
 *
 * The families are this project's own (Geist / Geist Mono), not the starter's
 * Oswald / Spline Sans Mono: the type scale is what was ported, not the
 * typefaces.
 *
 * Two steps, mirroring how `next/font` worked:
 *   1. Register the font faces — import the Fontsource CSS once in your entry
 *      (see `src/app.tsx`):
 *          import '@fontsource-variable/geist/wght.css'
 *          import '@fontsource-variable/geist-mono/wght.css'
 *   2. Expose them as CSS custom properties — done in `css/fonts.css`, which
 *      sets `--font-family-display` / `--font-family-mono` on `:root`. Those are
 *      the variables `typography.ts` points at and that the generator turns into
 *      Tailwind's `--font-display` / `--font-mono` theme tokens.
 *
 * This module is the JS-side source of truth for the family stacks, so app code
 * and the CSS layer can't drift. It intentionally does not import the Fontsource
 * packages itself (importing font CSS from a `.ts` barrel would pull it into
 * every consumer); registration stays an explicit entry-point import.
 */

/** CSS custom-property names the font faces are published under (see fonts.css). */
export const fontVariables = {
  display: "--font-family-display",
  sans: "--font-family-sans",
  pixel: "--font-family-pixel",
  mono: "--font-family-mono",
} as const

/**
 * Resolved family stacks. Kept in sync with `css/fonts.css`; exported so a
 * component can read a stack in JS (e.g. a canvas `ctx.font`) without hardcoding
 * it.
 */
export const fontStacks = {
  display: `"Geist Variable", system-ui, -apple-system, sans-serif`,
  sans: `"Geist Variable", system-ui, -apple-system, sans-serif`,
  pixel: `"Geist Pixel", sans-serif`,
  mono: `"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace`,
} as const

export type FontRole = keyof typeof fontStacks
