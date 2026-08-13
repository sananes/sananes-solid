import { colors, themeNames, themes } from "./colors"
import { fontVariables } from "./fonts"
import { breakpoints, customSizes, layout, screens } from "./layout.mjs"
import { typography } from "./typography"

const fonts = fontVariables

const config = {
  colors,
  fonts,
  themeNames,
  themes,
  breakpoints,
  customSizes,
  layout,
  screens,
  typography,
} as const

export type { ColorName, ThemeName, Themes } from "./colors"
export { breakpoints, colors, customSizes, fonts, layout, screens, themeNames, themes, typography }
export type Config = typeof config
