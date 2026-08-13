/**
 * The layering in ARCHITECTURE.md, enforced.
 *
 * Boundaries only hold if something checks them, and Biome has no rule that can
 * express "a component may not know about a feature". So this walks every
 * source file, reads its `~/` imports, and fails on any edge the matrix below
 * does not allow. Two rules that predate the layers are checked here too: no
 * barrel at `src/integrations/index.ts`, and no integration reaching into
 * another integration.
 *
 * Run with: bun test src/architecture.test.ts
 */

import { describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { Glob } from "bun"

const SRC = import.meta.dir

type Layer =
  | "components"
  | "content"
  | "dev"
  | "features"
  | "integrations"
  | "lib"
  | "routes"
  | "shell"
  | "styles"

/**
 * Who may import whom. Same-layer edges are listed explicitly because two of
 * them are narrower than they look: `features` and `integrations` may only
 * import themselves within one slice, checked separately below.
 */
const ALLOWED: Record<Layer, Layer[]> = {
  // app.tsx and the entry points wire everything together, so they see it all.
  shell: ["components", "content", "dev", "features", "integrations", "lib", "routes", "styles"],
  routes: ["components", "content", "features", "integrations", "lib", "routes", "styles"],
  features: ["components", "content", "features", "integrations", "lib", "styles"],
  components: ["components", "integrations", "lib", "styles"],
  content: ["content", "lib"],
  lib: ["lib"],
  dev: ["dev", "integrations", "lib", "styles"],
  integrations: ["integrations"],
  styles: ["styles"],
}

const LAYERS = new Set<string>(Object.keys(ALLOWED))

/** `from "~/x"`, `import("~/x")` and bare `import "~/x"`. */
const IMPORT_RE =
  /\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|\bimport\s+["']([^"']+)["']/g

function layerOf(path: string): Layer {
  const head = path.split("/")[0] ?? ""
  return LAYERS.has(head) ? (head as Layer) : "shell"
}

/** The slice a path sits in: the feature name, or the top-level integration. */
function sliceOf(path: string): string {
  return path.split("/")[1] ?? ""
}

interface Edge {
  file: string
  specifier: string
}

function readAliasImports(file: string, source: string): Edge[] {
  const edges: Edge[] = []

  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2] ?? match[3]
    if (specifier?.startsWith("~/")) edges.push({ file, specifier: specifier.slice(2) })
  }

  return edges
}

const SELF = "architecture.test.ts"

const edges: Edge[] = []
for (const file of new Glob("**/*.{ts,tsx}").scanSync(SRC)) {
  // Skipped: the examples in this file's own comments read as imports.
  if (file === SELF) continue
  edges.push(...readAliasImports(file, await Bun.file(join(SRC, file)).text()))
}

/** Formats a violation so the failure names the file and the offending import. */
const describeEdge = (edge: Edge) => `${edge.file} -> ~/${edge.specifier}`

describe("layer boundaries", () => {
  it("has at least one alias import to check", () => {
    expect(edges.length).toBeGreaterThan(0)
  })

  it("only imports downwards", () => {
    const violations = edges
      .filter((edge) => !ALLOWED[layerOf(edge.file)].includes(layerOf(edge.specifier)))
      .map(describeEdge)

    expect(violations).toEqual([])
  })

  it("keeps features from importing each other", () => {
    const violations = edges
      .filter(
        (edge) =>
          layerOf(edge.file) === "features" &&
          layerOf(edge.specifier) === "features" &&
          sliceOf(edge.file) !== sliceOf(edge.specifier),
      )
      .map(describeEdge)

    expect(violations).toEqual([])
  })

  it("keeps components ignorant of features and content values", () => {
    const violations = edges
      .filter(
        (edge) =>
          layerOf(edge.file) === "components" &&
          (layerOf(edge.specifier) === "features" || layerOf(edge.specifier) === "content"),
      )
      .map(describeEdge)

    expect(violations).toEqual([])
  })
})

describe("integration boundaries", () => {
  it("has no src/integrations barrel", () => {
    // A barrel there would pull the Sanity client, GSAP, Lenis and Howler into
    // any file that touched it, defeating the point of opt-in modules.
    expect(existsSync(join(SRC, "integrations/index.ts"))).toBe(false)
  })

  it("keeps integrations from importing one another", () => {
    const violations = edges
      .filter(
        (edge) =>
          layerOf(edge.file) === "integrations" &&
          layerOf(edge.specifier) === "integrations" &&
          sliceOf(edge.file) !== sliceOf(edge.specifier),
      )
      .map(describeEdge)

    expect(violations).toEqual([])
  })

  it("keeps app code out of integrations", () => {
    const appLayers = new Set(["components", "content", "features", "routes"])
    const violations = edges
      .filter(
        (edge) => layerOf(edge.file) === "integrations" && appLayers.has(layerOf(edge.specifier)),
      )
      .map(describeEdge)

    expect(violations).toEqual([])
  })
})
