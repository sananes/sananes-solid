export { getSanityClient, setSanityClient } from "./client"
export {
  apiVersion,
  assertConfigured,
  DEFAULT_API_VERSION,
  dataset,
  isConfigured,
  projectId,
} from "./env"
export type { SanityFetcher } from "./fetch"
export { sanityFetch, setSanityFetcher } from "./fetch"
export type { SrcSetOptions } from "./image"
export { DEFAULT_WIDTHS, src, srcSet, urlFor } from "./image"
export { getPage, getPost, getPosts, getSiteSettings } from "./loaders"
export type { PortableTextProps } from "./portable-text"
export {
  defaultPortableTextComponents,
  PortableText,
  renderPortableText,
  toPlainText,
} from "./portable-text"
export {
  IMAGE_PROJECTION_FIELDS,
  PAGE_QUERY,
  PAGE_SLUGS_QUERY,
  POST_QUERY,
  POST_SLUGS_QUERY,
  POSTS_QUERY,
  SITE_SETTINGS_QUERY,
} from "./queries"
export { sanityQuery } from "./query"
export type { SanityImageProps } from "./sanity-image"
export { SanityImage } from "./sanity-image"
export type {
  ContentImage,
  NavItem,
  Page,
  PortableTextBlock,
  Post,
  PostSummary,
  SanityImageSource,
  Seo,
  SiteSettings,
} from "./types"
