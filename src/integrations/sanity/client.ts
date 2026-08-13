import { createClient, type SanityClient } from "@sanity/client"

import { apiVersion, assertConfigured, dataset, projectId, readToken } from "./env"

/**
 * The Sanity client, configured for a static build.
 *
 * Three choices worth explaining:
 *
 * - `useCdn: !import.meta.env.SSR`. During prerender, `useCdn: false` reads
 *   straight from the API so a build always ships what was just published; the
 *   CDN can lag by a few seconds and a stale build is not fixable after the
 *   fact. In the browser the CDN is the right answer, since latency matters more
 *   than a few seconds of freshness.
 * - `perspective: "published"`. Drafts must never reach a static build. This is
 *   explicit rather than inherited, because the default has changed between
 *   client majors.
 * - `stega: false`. Content Source Maps embed invisible metadata for visual
 *   editing, which needs a live server. Off keeps the HTML clean.
 */

let client: SanityClient | null = null

export function getSanityClient(): SanityClient {
  if (client) return client

  assertConfigured()

  client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: !import.meta.env.SSR,
    perspective: "published",
    stega: false,
    token: readToken(),
  })

  return client
}

/**
 * Replace the client, for tests or for pointing part of an app at another
 * dataset. Pass `null` to restore the default.
 */
export function setSanityClient(next: SanityClient | null): void {
  client = next
}
