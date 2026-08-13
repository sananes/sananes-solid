import { PAGE_QUERY, POST_QUERY, POSTS_QUERY, SITE_SETTINGS_QUERY } from "./queries"
import { sanityQuery } from "./query"
import type {
  PAGE_QUERY_RESULT,
  POST_QUERY_RESULT,
  POSTS_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from "./types"

/**
 * Cached queries, ready for `createAsync`.
 *
 * The result types come straight from TypeGen, so they are derived from the real
 * schema rather than described by hand — change a projection in `queries.ts` and
 * run `bun run sanity:typegen`, and every consumer either updates or stops
 * compiling.
 *
 * The names passed to `sanityQuery` are cache keys: they are how the serialised
 * prerender payload is found again on the client, so renaming one costs a refetch
 * on first load.
 */

export const getSiteSettings = sanityQuery<SITE_SETTINGS_QUERY_RESULT>(
  "siteSettings",
  SITE_SETTINGS_QUERY,
)

export const getPage = sanityQuery<PAGE_QUERY_RESULT, { slug: string }>("page", PAGE_QUERY)

export const getPosts = sanityQuery<POSTS_QUERY_RESULT>("posts", POSTS_QUERY)

export const getPost = sanityQuery<POST_QUERY_RESULT, { slug: string }>("post", POST_QUERY)
