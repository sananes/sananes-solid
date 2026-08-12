/**
 * Styling System
 *
 * Import from barrel:
 *   import { colors, themes, breakpoints } from '@/styles'
 *   import { Theme, useTheme } from '@/styles'
 *   import { createReveal } from '@/styles'
 */

export { colors, type Themes, themeNames, themes } from "./colors"
export type { ThemeName } from "./config"
export { breakpoints, customSizes, layout, screens } from "./config"
export { type FontRole, fontStacks, fontVariables } from "./fonts"
export { createReveal } from "./reveal"
export { Theme, type ThemeContextValue, useTheme } from "./theme"
export { typography } from "./typography"
