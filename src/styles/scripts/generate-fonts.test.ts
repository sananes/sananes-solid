/**
 * Unit tests for the font CSS / preload generator.
 *
 * Run with: bun test src/styles/scripts/generate-fonts.test.ts
 */

import { describe, expect, it } from "bun:test"

import { isVariableFontsource } from "../fonts"
import {
  collectRoleWeights,
  expectedFontsourceFamily,
  type FontsourceMetadata,
  generateFonts,
} from "./generate-fonts"

const geistVariable: FontsourceMetadata = {
  id: "geist",
  family: "Geist",
  defSubset: "latin",
  weights: [100, 400, 700, 900],
}

const geistPixel: FontsourceMetadata = {
  id: "geist-pixel",
  family: "Geist Pixel",
  defSubset: "latin",
  weights: [400],
}

const metadata: Record<string, FontsourceMetadata> = {
  "@fontsource-variable/geist": geistVariable,
  "@fontsource/geist-pixel": geistPixel,
}

function readMetadata(pkg: string): FontsourceMetadata {
  const meta = metadata[pkg]
  if (!meta) throw new Error(`unexpected package ${pkg}`)
  return meta
}

describe("variable vs static detection", () => {
  it("treats @fontsource-variable as variable even when metadata has axes", () => {
    expect(isVariableFontsource("@fontsource-variable/geist")).toBe(true)
    expect(isVariableFontsource("@fontsource/geist-pixel")).toBe(false)
    expect(isVariableFontsource("@fontsource/geist-mono")).toBe(false)
  })

  it("derives the Fontsource CSS family name from the package scope", () => {
    expect(expectedFontsourceFamily("@fontsource-variable/geist", geistVariable)).toBe(
      "Geist Variable",
    )
    expect(expectedFontsourceFamily("@fontsource/geist-pixel", geistPixel)).toBe("Geist Pixel")
  })
})

describe("weight collection", () => {
  const typography = {
    h1: { "font-family": "var(--font-family-display)", "font-weight": 700 },
    p: { "font-family": "var(--font-family-mono)", "font-weight": "normal" },
  }

  it("collects numeric and keyword weights from typography for a role", () => {
    expect(collectRoleWeights("display", "--font-family-display", typography)).toEqual([700])
    expect(collectRoleWeights("mono", "--font-family-mono", typography)).toEqual([400])
  })

  it("defaults to 400 when a role is unused", () => {
    expect(collectRoleWeights("pixel", "--font-family-pixel", typography)).toEqual([400])
  })

  it("prefers an explicit weights override", () => {
    expect(collectRoleWeights("display", "--font-family-display", typography, [400, 700])).toEqual([
      400, 700,
    ])
  })
})

describe("generateFonts", () => {
  it("emits one wght.css import and latin variable preload for a variable package", () => {
    const { css, preloads } = generateFonts({
      fonts: {
        display: {
          family: "Geist Variable",
          fontsource: "@fontsource-variable/geist",
          fallbacks: ["sans-serif"],
        },
      },
      typography: {
        h1: { "font-family": "var(--font-family-display)", "font-weight": 700 },
      },
      readMetadata,
    })

    expect(css).toContain('@import "@fontsource-variable/geist/wght.css";')
    expect(css).not.toContain("@fontsource-variable/geist/700.css")
    expect(css).toContain('--font-family-display: "Geist Variable", sans-serif;')
    expect(preloads).toContain("@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url")
  })

  it("emits per-weight CSS and preloads for a static package", () => {
    const { css, preloads } = generateFonts({
      fonts: {
        pixel: {
          family: "Geist Pixel",
          fontsource: "@fontsource/geist-pixel",
          fallbacks: ["sans-serif"],
        },
      },
      typography: {
        label: { "font-family": "var(--font-family-pixel)", "font-weight": 400 },
      },
      readMetadata,
    })

    expect(css).toContain('@import "@fontsource/geist-pixel/400.css";')
    expect(css).not.toContain("wght.css")
    expect(preloads).toContain(
      "@fontsource/geist-pixel/files/geist-pixel-latin-400-normal.woff2?url",
    )
  })

  it("loads only typography weights for a static font, defaulting unused roles to 400", () => {
    metadata["@fontsource/roboto"] = {
      id: "roboto",
      family: "Roboto",
      defSubset: "latin",
      weights: [400, 700],
    }

    const { css, preloads } = generateFonts({
      fonts: {
        display: {
          family: "Roboto",
          fontsource: "@fontsource/roboto",
          fallbacks: ["sans-serif"],
        },
        pixel: {
          family: "Geist Pixel",
          fontsource: "@fontsource/geist-pixel",
          fallbacks: ["sans-serif"],
        },
      },
      typography: {
        h1: { "font-family": "var(--font-family-display)", "font-weight": 700 },
      },
      readMetadata,
    })

    expect(css).toContain('@import "@fontsource/roboto/700.css";')
    expect(css).not.toContain('@import "@fontsource/roboto/400.css";')
    expect(css).toContain('@import "@fontsource/geist-pixel/400.css";')
    expect(preloads).toContain("@fontsource/roboto/files/roboto-latin-700-normal.woff2?url")
    expect(preloads).not.toContain("@fontsource/roboto/files/roboto-latin-400-normal.woff2?url")
  })

  it("dedupes the same Fontsource package used by two roles", () => {
    const { css, preloads } = generateFonts({
      fonts: {
        display: {
          family: "Geist Variable",
          fontsource: "@fontsource-variable/geist",
          fallbacks: ["sans-serif"],
        },
        sans: {
          family: "Geist Variable",
          fontsource: "@fontsource-variable/geist",
          fallbacks: ["sans-serif"],
        },
      },
      typography: {},
      readMetadata,
    })

    expect(css.match(/@import "@fontsource-variable\/geist\/wght\.css";/g)).toHaveLength(1)
    expect(preloads.match(/geist-latin-wght-normal\.woff2\?url/g)).toHaveLength(1)
  })

  it("emits a variable @font-face and preload for a custom string src", () => {
    const { css, preloads } = generateFonts({
      fonts: {
        display: {
          family: "Editorial New",
          src: "/fonts/editorial.woff2",
          fallbacks: ["Georgia", "serif"],
        },
      },
      typography: {
        h1: { "font-family": "var(--font-family-display)", "font-weight": 700 },
      },
    })

    expect(css).toContain('font-family: "Editorial New";')
    expect(css).toContain("font-weight: 100 900;")
    expect(css).toContain('url("/fonts/editorial.woff2") format("woff2-variations");')
    expect(css).toContain('--font-family-display: "Editorial New", Georgia, serif;')
    expect(preloads).toContain('"/fonts/editorial.woff2"')
    expect(preloads).not.toContain("import href")
  })

  it("emits one @font-face per used weight for a custom static src map", () => {
    const { css, preloads } = generateFonts({
      fonts: {
        display: {
          family: "Editorial New",
          src: {
            400: "/fonts/editorial-400.woff2",
            700: "/fonts/editorial-700.woff2",
          },
          fallbacks: ["serif"],
        },
      },
      typography: {
        h1: { "font-family": "var(--font-family-display)", "font-weight": 700 },
      },
    })

    expect(css).toContain("font-weight: 700;")
    expect(css).toContain('url("/fonts/editorial-700.woff2") format("woff2");')
    expect(css).not.toContain("editorial-400")
    expect(preloads).toContain('"/fonts/editorial-700.woff2"')
    expect(preloads).not.toContain("editorial-400")
  })

  it("throws when the declared family does not match the Fontsource package", () => {
    expect(() =>
      generateFonts({
        fonts: {
          display: {
            family: "Comic Sans",
            fontsource: "@fontsource-variable/geist",
            fallbacks: ["sans-serif"],
          },
        },
        typography: {},
        readMetadata,
      }),
    ).toThrow(/expected "Geist Variable"/)
  })

  it("throws when a static custom src map is missing a used weight", () => {
    expect(() =>
      generateFonts({
        fonts: {
          display: {
            family: "Editorial New",
            src: { 400: "/fonts/editorial-400.woff2" },
            fallbacks: ["serif"],
          },
        },
        typography: {
          h1: { "font-family": "var(--font-family-display)", "font-weight": 700 },
        },
      }),
    ).toThrow(/needs weight 700/)
  })
})
