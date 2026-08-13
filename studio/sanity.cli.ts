import { defineCliConfig } from "sanity/cli"

/**
 * Studio CLI config, and the source of truth for TypeGen.
 *
 * The `path` glob points *out* of this workspace at the Solid app, because that is
 * where the GROQ queries live. TypeGen finds them there and types `client.fetch()`
 * from the query it was given.
 *
 * Both `enabled` flags are off, which only turns off the automatic runs during
 * `sanity dev` and `sanity build` — every other option here still applies to
 * `bun run sanity:typegen`, which is how types are generated. The reason is that
 * automatic extraction cannot work under Bun: it runs in a worker whose teardown
 * shim reassigns a property Bun makes read-only, so `sanity dev` would report a
 * failed extraction on every start (see studio/README.md). Leaving typegen on
 * without it would be worse than useless — it would regenerate types from a stale
 * `schema.json` and look like it had succeeded.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  },
  schemaExtraction: {
    enabled: false,
  },
  typegen: {
    enabled: false,
    path: "../src/**/*.{ts,tsx}",
    // Written by scripts/extract-schema.ts, into this workspace. Not committed.
    schema: "./schema.json",
    generates: "../src/integrations/sanity/sanity.types.ts",
    overloadClientMethods: true,
  },
  deployment: {
    autoUpdates: true,
  },
})
