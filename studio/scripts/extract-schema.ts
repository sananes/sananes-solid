import { writeFileSync } from "node:fs"
import { Schema } from "@sanity/schema"
import {
  builtinTypes,
  extractSchema,
  groupProblems,
  validateSchema,
} from "@sanity/schema/_internal"

import { schemaTypes } from "../schemaTypes"

/**
 * Schema extraction, without the Sanity CLI.
 *
 * `sanity schema extract` cannot run under Bun. It spawns a worker that boots a
 * Vite server to load `sanity.config.ts`, and the worker's teardown shim reassigns
 * `parentPort.postMessage` — a property Bun defines as non-writable *and*
 * non-configurable, so it can be neither assigned nor redefined. The command fails
 * with "Attempted to assign to readonly property" before reading a single type.
 *
 * None of that machinery is needed here. It exists so a Studio config can import
 * CSS, images and React components; this schema is plain TypeScript, so the types
 * can be compiled and extracted directly. `sanity typegen generate` reads the
 * `schema.json` this writes and is unaffected by the same bug.
 *
 * If Bun ever gains a writable `parentPort.postMessage`, or the CLI stops
 * monkey-patching it, `sanity schema extract` can take over again — the output is
 * the same shape.
 */

const OUTPUT = new URL("../schema.json", import.meta.url)

// Validation takes the types as authored. `builtinTypes` must be kept out of it:
// they are registered under names the validator treats as reserved, so including
// them reports `slug` and `geopoint` as errors against our own schema.
const problems = groupProblems(validateSchema(schemaTypes).getTypes()).flatMap((group) => {
  const path = (group.path ?? [])
    .map((segment) => (segment.kind === "property" ? segment.name : (segment.name ?? segment.type)))
    .join(".")
  return (group.problems ?? [])
    .filter((problem) => problem.severity === "error")
    .map((problem) => `${path}: ${problem.message}`)
})

if (problems.length > 0) {
  console.error(`✖ Schema has ${problems.length} error(s):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

// Compilation, unlike validation, does need the builtins: they supply the
// primitives the schema references but never declares — `slug`, `image`, `file`,
// `block`, `geopoint`, `reference`. The CLI merges them via `createSchema`; doing
// it by hand is the whole difference.
const extracted = extractSchema(
  Schema.compile({ name: "default", types: [...builtinTypes, ...schemaTypes] }),
)

writeFileSync(OUTPUT, `${JSON.stringify(extracted, null, 2)}\n`)

console.log(`✓ Extracted ${extracted.length} schema types to studio/schema.json`)
