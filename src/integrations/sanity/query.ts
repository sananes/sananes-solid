import type { QueryParams } from "@sanity/client"
import { query } from "@solidjs/router"

import { sanityFetch } from "./fetch"

/**
 * Content fetching for a statically generated site.
 *
 * Wrapping each query in Solid Router's `query()` is what makes SSG work here.
 * During prerender the fetcher runs on the build machine and the result is
 * serialised into the static HTML under a cache key derived from the query name
 * and its arguments; on hydration the router finds that serialised value and
 * reuses it instead of calling the fetcher again. So a prerendered page shows CMS
 * content with no client-side request at all.
 *
 * There is one case where the fetcher does run in the browser: a client-side
 * navigation to a route whose data was not part of the page the visitor landed
 * on. That request goes to Sanity's CDN, which is fast and cached, and needs the
 * dataset to be readable without a token. If you would rather that never happen,
 * see `setSanityFetcher` in `fetch.ts`.
 *
 * Nothing here uses `"use server"`. The `static` Nitro preset produces no server
 * runtime, so a server function would compile to an endpoint that does not exist.
 */

/**
 * Define a cached, prerender-friendly query.
 *
 * `name` becomes part of the cache key, so it must be unique and stable — it is
 * the handle the serialised payload is looked up by on the client. Arguments are
 * part of the key too, so one query serves every slug.
 *
 * @example
 * ```ts
 * const getPost = sanityQuery<Post | null, { slug: string }>("post", POST_QUERY)
 *
 * // In a route:
 * const post = createAsync(() => getPost({ slug: params.slug }))
 * ```
 */
export function sanityQuery<Result, Params extends QueryParams = QueryParams>(
  name: string,
  groqQuery: string,
) {
  return query((params?: Params) => sanityFetch<Result>(groqQuery, params ?? {}), `sanity:${name}`)
}
