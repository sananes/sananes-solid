import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  type ParentProps,
  useContext,
} from "solid-js"
import { isServer } from "solid-js/web"

import { type ThemeName, type Themes, themes } from "./config"

/**
 * Theme provider — Solid port of the starter's React `<Theme>` wrapper.
 *
 * Sets `data-theme` on <html> (when `global`) so the `[data-theme=…]` blocks
 * generated into `css/tailwind.css` remap the palette. The role names never
 * change, so components reference them the same way in every theme.
 *
 * For a no-flash initial paint, also render the default `data-theme` on your
 * <html> in the SSR document (see `src/app.tsx`); this provider keeps it in sync
 * on navigation and exposes `setTheme` for runtime switching.
 *
 * @example
 * ```tsx
 * <Theme theme="dark" global>
 *   <App />
 * </Theme>
 *
 * const { name, theme, setTheme } = useTheme()
 * name()            // () => 'dark'
 * theme().contrast  // active contrast color
 * setTheme('evil')
 * ```
 */

export type ThemeContextValue = {
  /** Active theme name (reactive). */
  name: Accessor<ThemeName>
  /** Active theme's color map (reactive). */
  theme: Accessor<Themes[ThemeName]>
  /** Override the theme at runtime. */
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue>()

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a <Theme> provider")
  }
  return context
}

export function Theme(props: ParentProps<{ theme: ThemeName; global?: boolean }>) {
  const [name, setName] = createSignal<ThemeName>(props.theme)

  // Re-sync when the `theme` prop changes (e.g. per-route default on navigation)
  // while still allowing `setTheme` overrides in between.
  createEffect(() => setName(props.theme))

  // Reflect the active theme onto <html> so [data-theme] token overrides apply.
  createEffect(() => {
    if (props.global && !isServer) {
      document.documentElement.setAttribute("data-theme", name())
    }
  })

  const value: ThemeContextValue = {
    name,
    theme: () => themes[name()],
    setTheme: setName,
  }

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
}
