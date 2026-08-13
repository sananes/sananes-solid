/**
 * Fonts — single source of truth for family stacks.
 *
 * Define a role here (`display`, `sans`, …) and `setup:styles` injects it:
 *   1. `@font-face` / Fontsource `@import`s into `css/fonts.css`
 *   2. latin woff2 `<link rel="preload">` hrefs into `font-preloads.ts`
 *
 * Fontsource vs custom is discriminated by `fontsource` vs `src`. Variable vs
 * static is the package scope (`@fontsource-variable/` vs `@fontsource/`) or,
 * for custom files, a string `src` (variable) vs a weight map (static).
 * Weights default to whatever `typography.ts` uses for that role's CSS var.
 */

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
export type FontWeight = (typeof FONT_WEIGHTS)[number]

export type FontsourcePackage = `@fontsource/${string}` | `@fontsource-variable/${string}`

type FontBase = {
  family: string
  fallbacks: readonly [string, ...string[]]
  /** Pin faces explicitly. Omit to collect weights from `typography.ts`. */
  weights?: readonly FontWeight[]
}

export type FontsourceDef = FontBase & {
  fontsource: FontsourcePackage
}

export type CustomFontSrc = string | Partial<Record<FontWeight, string>>

export type CustomFontDef = FontBase & {
  src: CustomFontSrc
  display?: "auto" | "block" | "swap" | "fallback" | "optional"
}

export type FontDef = FontsourceDef | CustomFontDef

export function isFontsourceDef(def: FontDef): def is FontsourceDef {
  return "fontsource" in def
}

export function isVariableFontsource(pkg: string): boolean {
  return pkg.startsWith("@fontsource-variable/")
}

/** CSS `font-family` stack for a role, including quoted family + fallbacks. */
export function fontStack(def: FontDef): string {
  return [`"${def.family}"`, ...def.fallbacks].join(", ")
}

export const fonts = {
  display: {
    family: "Geist Variable",
    fontsource: "@fontsource-variable/geist",
    fallbacks: ["system-ui", "-apple-system", "sans-serif"],
  },
  sans: {
    family: "Geist Variable",
    fontsource: "@fontsource-variable/geist",
    fallbacks: ["system-ui", "-apple-system", "sans-serif"],
  },
  pixel: {
    family: "Geist Pixel",
    fontsource: "@fontsource/geist-pixel",
    fallbacks: ["sans-serif"],
  },
  mono: {
    family: "Geist Mono Variable",
    fontsource: "@fontsource-variable/geist-mono",
    fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  },
} as const satisfies Record<string, FontDef>

export type FontRole = keyof typeof fonts

/** CSS custom-property names the font faces are published under. */
export const fontVariables = Object.fromEntries(
  Object.keys(fonts).map((role) => [role, `--font-family-${role}`]),
) as { [K in FontRole]: `--font-family-${K}` }

/**
 * Resolved family stacks. Exported so a component can read a stack in JS
 * (e.g. a canvas `ctx.font`) without hardcoding it.
 */
export const fontStacks = Object.fromEntries(
  Object.entries(fonts).map(([role, def]) => [role, fontStack(def)]),
) as { [K in FontRole]: string }
