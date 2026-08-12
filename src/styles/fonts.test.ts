/**
 * Fonts contract (SolidStart / Vite).
 *
 * The Next starter tested that `fonts.ts` passed no explicit `weight` to the
 * `next/font/google` loaders (so variable-axis loading stays intact). On Vite
 * there is no loader to introspect; the equivalent risk here is the three
 * places that name the font families drifting apart:
 *   - `fonts.ts`            — JS-side stacks + the CSS var names
 *   - `css/fonts.css`       — the actual `:root` var registration
 *   - `typography.ts`       — which CSS vars the type scale points at
 *
 * These assertions fail loudly if a rename lands in one place but not the others.
 *
 * Run with: bun test src/styles/fonts.test.ts
 */

import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { fontStacks, fontVariables } from "./fonts"
import { fonts as typographyFonts } from "./typography"

const fontsCss = readFileSync(join(import.meta.dirname, "css/fonts.css"), "utf8")

describe("font family wiring", () => {
  it("typography points at the same CSS vars fonts.ts declares", () => {
    expect(typographyFonts.display).toBe(fontVariables.display)
    expect(typographyFonts.mono).toBe(fontVariables.mono)
  })

  it("registers every declared font var in css/fonts.css", () => {
    for (const cssVar of Object.values(fontVariables)) {
      expect(fontsCss).toContain(`${cssVar}:`)
    }
  })

  it("keeps the primary family of each stack in sync with the CSS", () => {
    for (const role of ["display", "mono"] as const) {
      const primary = fontStacks[role].split(",")[0].trim()
      expect(fontsCss).toContain(primary)
    }
  })

  it("loads variable-axis families (single file per family, no pinned weights)", () => {
    for (const stack of Object.values(fontStacks)) {
      expect(stack).toContain("Variable")
    }
  })
})
