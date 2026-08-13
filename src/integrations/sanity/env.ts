import { isServer } from "solid-js/web"

/**
 * Sanity configuration, read from the environment.
 *
 * The site is a pure static build, so there is no server at runtime to hold
 * secrets: every value here is inlined at build time. `VITE_`-prefixed vars are
 * therefore *public* — the project id and dataset name end up in the HTML, which
 * is fine and expected, they are not credentials.
 *
 * The read token is the exception. It is read from `process.env` behind an
 * `isServer` guard, which Solid replaces with `false` when compiling the client
 * bundle, so the whole branch is eliminated and the token cannot be inlined.
 * Only needed for a private dataset.
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_SANITY_PROJECT_ID?: string
    readonly VITE_SANITY_DATASET?: string
    readonly VITE_SANITY_API_VERSION?: string
  }
}

/**
 * Pinned so a change to Sanity's API cannot alter a build that used to work.
 * Bump it deliberately, and re-run typegen when you do.
 */
export const DEFAULT_API_VERSION = "2026-08-01"

export const projectId = import.meta.env.VITE_SANITY_PROJECT_ID ?? ""
export const dataset = import.meta.env.VITE_SANITY_DATASET ?? "production"
export const apiVersion = import.meta.env.VITE_SANITY_API_VERSION ?? DEFAULT_API_VERSION

/** Whether Sanity is configured at all. Lets a fork run before wiring a project up. */
export const isConfigured = projectId !== ""

/**
 * Read token for a private dataset. Never reaches the client bundle.
 *
 * A token makes every read authenticated, which also means uncached: leave it
 * unset for a public dataset, which is the right default for a static site.
 */
export function readToken(): string | undefined {
  if (!isServer) return undefined
  return process.env.SANITY_READ_TOKEN || undefined
}

/**
 * Fail loudly, and at build time, rather than prerendering pages with silently
 * missing content.
 */
export function assertConfigured(): void {
  if (isConfigured) return
  throw new Error(
    "Sanity is not configured. Set VITE_SANITY_PROJECT_ID (see .env.example) " +
      "or avoid importing ~/integrations/sanity.",
  )
}
