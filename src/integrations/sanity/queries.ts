import { defineQuery } from "groq"

/**
 * The GROQ itself. No router and no client, so this is importable from a build
 * script or a test without dragging either in.
 *
 * Every query is wrapped in `defineQuery`. It is a no-op at runtime, but it is
 * what lets Sanity TypeGen find the query by static analysis and generate a
 * result type for it — an unwrapped template string is invisible to it.
 *
 * Two conventions that matter for a static build:
 *
 * - Project only the fields the page renders. Every extra field is bytes in the
 *   prerendered HTML, because the result is serialised into the page.
 * - Always ask for `metadata.dimensions` and `metadata.lqip` alongside an image.
 *   Without the dimensions the markup cannot set `width`/`height`, and the image
 *   shifts the layout when it loads.
 */

/**
 * What an image projection has to include for the markup to avoid layout shift.
 * Asserted against every image query in `sanity.test.ts`, so a projection cannot
 * quietly drop one.
 */
export const IMAGE_PROJECTION_FIELDS = [
  "metadata.dimensions.width",
  "metadata.dimensions.height",
  "metadata.lqip",
] as const

const IMAGE_FRAGMENT = `{
    "source": asset,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height,
    "lqip": asset->metadata.lqip
  }`

const SEO_FRAGMENT = `{
    title,
    description,
    "image": image.asset,
    noIndex
  }`

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_type == "siteSettings"][0]{
    title,
    description,
    "ogImage": ogImage.asset,
    navigation[]{ label, href }
  }
`)

export const PAGE_QUERY = defineQuery(`
  *[_type == "page" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    body,
    seo ${SEO_FRAGMENT}
  }
`)

export const PAGE_SLUGS_QUERY = defineQuery(`
  *[_type == "page" && defined(slug.current)].slug.current
`)

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)]|order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    coverImage ${IMAGE_FRAGMENT}
  }
`)

export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    coverImage ${IMAGE_FRAGMENT},
    body,
    seo ${SEO_FRAGMENT}
  }
`)

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)].slug.current
`)
