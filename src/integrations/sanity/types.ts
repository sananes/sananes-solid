import type { PortableTextBlock } from "@portabletext/types"
import type { SanityImageSource } from "@sanity/image-url"

import type {
  PAGE_QUERY_RESULT,
  POST_QUERY_RESULT,
  POSTS_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from "./sanity.types"

/**
 * Friendly names for the generated query result types.
 *
 * Everything here is derived from `./sanity.types.ts`, which
 * `bun run sanity:typegen` generates from the real schema and the GROQ in
 * `queries.ts`. Nothing is hand-written, so nothing can drift: change a
 * projection or a schema field and these change with it — or stop compiling,
 * which is the point.
 *
 * The generated types are nullable almost everywhere, including on fields the
 * schema marks `required()`. That is deliberate on Sanity's part: validation runs
 * in the Studio at publish time, but a document written through the API can skip
 * it, so the type tells the truth about what may arrive. Pass
 * `enforceRequiredFields` in `studio/scripts/extract-schema.ts` if you would
 * rather trade that safety for fewer null checks.
 */

/** A page, as `PAGE_QUERY` projects it. */
export type Page = NonNullable<PAGE_QUERY_RESULT>

/** A post with its body, as `POST_QUERY` projects it. */
export type Post = NonNullable<POST_QUERY_RESULT>

/** A post in a listing: enough for a card, without the body. */
export type PostSummary = POSTS_QUERY_RESULT[number]

export type SiteSettings = NonNullable<SITE_SETTINGS_QUERY_RESULT>

/** An image with the metadata needed to render it without layout shift. */
export type ContentImage = NonNullable<Post["coverImage"]>

/** Per-document metadata overrides. */
export type Seo = NonNullable<Post["seo"]>

export type NavItem = NonNullable<SiteSettings["navigation"]>[number]

export type {
  PAGE_QUERY_RESULT,
  PAGE_SLUGS_QUERY_RESULT,
  POST_QUERY_RESULT,
  POST_SLUGS_QUERY_RESULT,
  POSTS_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from "./sanity.types"
export type { PortableTextBlock, SanityImageSource }
