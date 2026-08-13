import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  fonts as appFonts,
  type FontDef,
  type FontsourceDef,
  type FontWeight,
  fontStack,
  isFontsourceDef,
  isVariableFontsource,
} from "../fonts"
import { typography as appTypography } from "../typography"
import { formatObject } from "./utils"

export type FontsourceMetadata = {
  id: string
  family: string
  defSubset: string
  weights: number[]
}

export type TypographyLike = Record<
  string,
  {
    "font-family": string
    "font-weight": number | string
  }
>

export type GenerateFontsInput = {
  fonts?: Record<string, FontDef>
  fontVariables?: Record<string, string>
  typography?: TypographyLike
  readMetadata?: (pkg: string) => FontsourceMetadata
}

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..")

export function readFontsourceMetadata(pkg: string, root: string = repoRoot): FontsourceMetadata {
  const path = join(root, "node_modules", pkg, "metadata.json")
  let raw: {
    id?: string
    family?: string
    defSubset?: string
    weights?: number[]
  }
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as typeof raw
  } catch {
    throw new Error(`Fontsource package "${pkg}" is not installed. Add it with: bun add ${pkg}`)
  }

  if (!(raw.id && raw.family)) {
    throw new Error(`Fontsource package "${pkg}" is missing id/family in metadata.json`)
  }

  return {
    id: raw.id,
    family: raw.family,
    defSubset: raw.defSubset ?? "latin",
    weights: raw.weights ?? [],
  }
}

export function expectedFontsourceFamily(pkg: string, meta: FontsourceMetadata): string {
  return isVariableFontsource(pkg) ? `${meta.family} Variable` : meta.family
}

function normalizeWeight(weight: number | string): FontWeight | undefined {
  if (typeof weight === "number") {
    return weight as FontWeight
  }
  if (weight === "normal") return 400
  if (weight === "bold") return 700
  return undefined
}

/** Weights a role should load: explicit override, else typography, else 400. */
export function collectRoleWeights(
  _role: string,
  cssVar: string,
  typography: TypographyLike,
  override?: readonly number[],
): FontWeight[] {
  if (override && override.length > 0) {
    return uniqueSorted(override as FontWeight[])
  }

  const found: FontWeight[] = []
  for (const style of Object.values(typography)) {
    if (!style["font-family"].includes(cssVar)) continue
    const weight = normalizeWeight(style["font-weight"])
    if (weight !== undefined) found.push(weight)
  }

  return found.length > 0 ? uniqueSorted(found) : [400]
}

function uniqueSorted(weights: FontWeight[]): FontWeight[] {
  return [...new Set(weights)].sort((a, b) => a - b)
}

function fontVariablesFor(defs: Record<string, FontDef>, explicit?: Record<string, string>) {
  if (explicit) return explicit
  return Object.fromEntries(Object.keys(defs).map((role) => [role, `--font-family-${role}`]))
}

function srcFormat(url: string, variable: boolean): string {
  const clean = url.split("?")[0]?.toLowerCase() ?? ""
  if (clean.endsWith(".woff")) return 'format("woff")'
  if (clean.endsWith(".otf")) return 'format("opentype")'
  if (clean.endsWith(".ttf")) return 'format("truetype")'
  return variable ? 'format("woff2-variations")' : 'format("woff2")'
}

function fontFace(options: {
  family: string
  weight: string
  src: string
  variable: boolean
  display?: string
}): string {
  return `@font-face {
	font-family: "${options.family}";
	font-style: normal;
	font-display: ${options.display ?? "swap"};
	font-weight: ${options.weight};
	src: url("${options.src}") ${srcFormat(options.src, options.variable)};
}`
}

type PreloadEntry = { kind: "fontsource"; specifier: string } | { kind: "url"; href: string }

/**
 * Build `fonts.css` (imports + custom faces + `:root` stacks) and the
 * `font-preloads.ts` module (Vite `?url` imports for Fontsource files).
 */
export function generateFonts({
  fonts = appFonts,
  fontVariables,
  typography = appTypography,
  readMetadata = readFontsourceMetadata,
}: GenerateFontsInput = {}): { css: string; preloads: string } {
  const variables = fontVariablesFor(fonts, fontVariables)
  const cssImports = new Set<string>()
  const faces: string[] = []
  const preloads = new Map<string, PreloadEntry>()

  for (const [role, def] of Object.entries(fonts)) {
    const cssVar = variables[role] ?? `--font-family-${role}`
    const weights = collectRoleWeights(role, cssVar, typography, def.weights)

    if (isFontsourceDef(def)) {
      collectFontsource(def, weights, { cssImports, preloads, readMetadata })
      continue
    }

    collectCustom(role, def, weights, { faces, preloads })
  }

  const importBlock = [...cssImports].map((spec) => `@import "${spec}";`).join("\n")
  const faceBlock = faces.join("\n\n")
  const rootBlock = `:root {
	${formatObject(variables, ([role, cssVar]) => {
    const def = fonts[role]
    if (!def) {
      throw new Error(`Font role "${String(role)}" is missing from the fonts config`)
    }
    return `${cssVar}: ${fontStack(def)};`
  })}
}`

  const css = [importBlock, faceBlock, rootBlock].filter(Boolean).join("\n\n")
  return { css, preloads: generatePreloadModule([...preloads.values()]) }
}

function collectFontsource(
  def: FontsourceDef,
  weights: FontWeight[],
  {
    cssImports,
    preloads,
    readMetadata,
  }: {
    cssImports: Set<string>
    preloads: Map<string, PreloadEntry>
    readMetadata: (pkg: string) => FontsourceMetadata
  },
) {
  const pkg = def.fontsource
  const meta = readMetadata(pkg)
  const expected = expectedFontsourceFamily(pkg, meta)
  if (def.family !== expected) {
    throw new Error(`Font family "${def.family}" does not match ${pkg} (expected "${expected}")`)
  }

  const subset = meta.defSubset
  const variable = isVariableFontsource(pkg)

  if (variable) {
    cssImports.add(`${pkg}/wght.css`)
    const file = `${pkg}/files/${meta.id}-${subset}-wght-normal.woff2`
    preloads.set(file, { kind: "fontsource", specifier: file })
    return
  }

  for (const weight of weights) {
    if (meta.weights.length > 0 && !meta.weights.includes(weight)) {
      throw new Error(`${pkg} has no weight ${weight} (available: ${meta.weights.join(", ")})`)
    }
    cssImports.add(`${pkg}/${weight}.css`)
    const file = `${pkg}/files/${meta.id}-${subset}-${weight}-normal.woff2`
    preloads.set(file, { kind: "fontsource", specifier: file })
  }
}

function collectCustom(
  role: string,
  def: Extract<FontDef, { src: unknown }>,
  weights: FontWeight[],
  {
    faces,
    preloads,
  }: {
    faces: string[]
    preloads: Map<string, PreloadEntry>
  },
) {
  if (typeof def.src === "string") {
    faces.push(
      fontFace({
        family: def.family,
        weight: "100 900",
        src: def.src,
        variable: true,
        display: def.display,
      }),
    )
    preloads.set(def.src, { kind: "url", href: def.src })
    return
  }

  for (const weight of weights) {
    const src = def.src[weight]
    if (!src) {
      const available = Object.keys(def.src).join(", ") || "(none)"
      throw new Error(
        `Font role "${role}" needs weight ${weight} but src has no file for it (available: ${available})`,
      )
    }
    faces.push(
      fontFace({
        family: def.family,
        weight: String(weight),
        src,
        variable: false,
        display: def.display,
      }),
    )
    preloads.set(src, { kind: "url", href: src })
  }
}

function generatePreloadModule(entries: PreloadEntry[]): string {
  const imports: string[] = []
  const hrefs: string[] = []
  let n = 0

  for (const entry of entries) {
    if (entry.kind === "fontsource") {
      const id = `href${n}`
      n += 1
      imports.push(`import ${id} from "${entry.specifier}?url"`)
      hrefs.push(id)
    } else {
      hrefs.push(JSON.stringify(entry.href))
    }
  }

  const body = `export const fontPreloadHrefs = [${hrefs.join(", ")}]`
  return [imports.join("\n"), body].filter(Boolean).join("\n\n")
}
