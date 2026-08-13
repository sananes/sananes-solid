/**
 * Fonts contract (SolidStart / Vite).
 *
 * `fonts.ts` is the only place families are named. `setup:styles` generates
 * `css/fonts.css` and `font-preloads.ts` from that config plus the weights
 * `typography.ts` actually uses. These assertions fail if a role, stack, or
 * Fontsource package drifts out of that pipeline.
 *
 * Run with: bun test src/styles/fonts.test.ts
 */

import { describe, expect, it } from "bun:test"

import { fontStacks, fonts, fontVariables, isFontsourceDef, isVariableFontsource } from "./fonts"
import {
  expectedFontsourceFamily,
  generateFonts,
  readFontsourceMetadata,
} from "./scripts/generate-fonts"
import { typography } from "./typography"

const generated = generateFonts()

describe("font family wiring", () => {
  it("typography points at CSS vars fonts.ts declares", () => {
    const vars = Object.values(fontVariables)
    for (const style of Object.values(typography)) {
      expect(vars.some((cssVar) => style["font-family"].includes(cssVar))).toBe(true)
    }
  })

  it("registers every declared font var and stack in generated CSS", () => {
    for (const role of Object.keys(fonts) as (keyof typeof fonts)[]) {
      expect(generated.css).toContain(`${fontVariables[role]}:`)
      expect(generated.css).toContain(fontStacks[role])
    }
  })

  it("imports Fontsource CSS by variable vs static, and preloads latin once per file", () => {
    const fontsourceImports = generated.css.match(/@import "[^"]+";/g) ?? []
    expect(new Set(fontsourceImports).size).toBe(fontsourceImports.length)

    for (const def of Object.values(fonts)) {
      if (!isFontsourceDef(def)) continue
      const meta = readFontsourceMetadata(def.fontsource)
      expect(def.family).toBe(expectedFontsourceFamily(def.fontsource, meta))

      if (isVariableFontsource(def.fontsource)) {
        expect(generated.css).toContain(`@import "${def.fontsource}/wght.css";`)
        expect(generated.preloads).toContain(
          `${def.fontsource}/files/${meta.id}-${meta.defSubset}-wght-normal.woff2?url`,
        )
        expect(generated.css).not.toMatch(new RegExp(`${def.fontsource}/\\d+\\.css`))
      } else {
        expect(generated.css).toMatch(new RegExp(`@import "${def.fontsource}/\\d+\\.css";`))
        expect(generated.preloads).toContain(
          `${def.fontsource}/files/${meta.id}-${meta.defSubset}-`,
        )
      }
    }
  })

  it("dedupes a shared Fontsource package across roles", () => {
    const wght = generated.css.match(/@import "@fontsource-variable\/geist\/wght\.css";/g) ?? []
    expect(wght).toHaveLength(1)

    const geistPreloads =
      generated.preloads.match(/@fontsource-variable\/geist\/files\/[^"]+\?url/g) ?? []
    expect(geistPreloads).toHaveLength(1)
  })
})
