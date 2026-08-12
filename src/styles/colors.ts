const colors = {
  foreground: "oklch(0 0 0 / 0.85)",
  subdued: "oklch(0 0 0 / 0.6)",
  muted: "oklch(0 0 0 / 0.3)",
  black: "oklch(0 0 0)",
  white: "oklch(1 0 0)",
  border: "oklch(0 0 0 / 0.1)",
  borderHover: "oklch(0 0 0 / 0.2)",
  // Lightness is tuned to 0.592 so the red clears WCAG AA (4.5:1) as text on
  // both black and white. A single colour can only do that inside a narrow band
  // peaking at 4.583:1, so this value has almost no slack — check
  // `src/styles/scripts/contrast.test.ts` before changing it.
} as const

/**
 * `light` is the reference theme: its keys are the role set every other theme
 * has to fill. Deriving the contract from it — rather than from a hand-kept
 * list of role names — still errors on the theme that drops or invents a role,
 * with nothing left to keep in sync.
 */
const light = {
  foreground: colors.foreground,
  subdued: colors.subdued,
  muted: colors.muted,
  black: colors.black,
  white: colors.white,
  border: colors.border,
  borderHover: colors.borderHover,
} as const

const dark = {
  foreground: colors.foreground,
  subdued: colors.subdued,
  muted: colors.muted,
  black: colors.black,
  white: colors.white,
  border: colors.border,
  borderHover: colors.borderHover,
} as const satisfies Record<ColorName, string>

const themes = { light, dark } as const

/** Runtime list of theme names. `Object.keys` widens to `string[]`, hence the cast. */
const themeNames = Object.keys(themes) as ThemeName[]

export { colors, themeNames, themes }

// UTIL TYPES
export type ColorName = keyof typeof light
export type ThemeName = keyof typeof themes
export type Themes = typeof themes
