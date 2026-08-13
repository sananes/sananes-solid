import type { QueryParams } from "@sanity/client"

import { getSanityClient } from "./client"

/**
 * The single place a GROQ query turns into a result.
 *
 * Kept apart from `query.ts` so that fetching does not depend on the router.
 * That keeps this importable from a build script, and keeps the tests free of a
 * DOM.
 */

export type SanityFetcher = <Result>(groqQuery: string, params: QueryParams) => Promise<Result>

let fetcher: SanityFetcher | null = null

/**
 * Replace the fetcher for every query in the app.
 *
 * Two uses: fixtures in tests, and pointing the browser at build-time content
 * instead of the API — read a snapshot committed to the repo, or a JSON file
 * emitted next to the static output, and no visitor ever talks to Sanity. Must
 * be set before the first fetch.
 *
 * Pass `null` to restore the default client.
 */
export function setSanityFetcher(next: SanityFetcher | null): void {
  fetcher = next
}

/** One-off fetch, outside the router's cache. For scripts and imperative code. */
export function sanityFetch<Result>(groqQuery: string, params: QueryParams = {}): Promise<Result> {
  if (fetcher) return fetcher<Result>(groqQuery, params)
  return getSanityClient().fetch<Result>(groqQuery, params)
}
