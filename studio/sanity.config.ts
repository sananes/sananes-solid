import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

import { schemaTypes } from "./schemaTypes"
import { structure } from "./structure"

/**
 * Project id and dataset come from the environment so the same studio can point
 * at a fork's own project without editing tracked files. Copy
 * `.env.example` to `.env` and fill it in.
 */
const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET ?? "production"

if (!projectId) {
  throw new Error(
    "Missing SANITY_STUDIO_PROJECT_ID. Copy studio/.env.example to studio/.env and set it.",
  )
}

export default defineConfig({
  name: "default",
  title: "Studio",
  projectId,
  dataset,
  plugins: [structureTool({ structure }), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
