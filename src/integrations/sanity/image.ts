import type { ImageUrlBuilder, SanityImageSource } from "@sanity/image-url"
import { createImageUrlBuilder } from "@sanity/image-url"

import { dataset, projectId } from "./env"

/**
 * Image URLs, built against Sanity's image pipeline.
 *
 * `auto("format")` is doing the heavy lifting: the CDN negotiates AVIF or WebP
 * from the request's `Accept` header, which is both smaller and less work than
 * pinning a format and generating variants. `quality(80)` is the point where the
 * next few percent of file size stops being visible.
 *
 * Crops are respected automatically when the projection includes them, so an
 * editor's hotspot choice survives being resized.
 */

/** Widths offered in `srcset`. Covers 1x and 2x for common layout widths. */
export const DEFAULT_WIDTHS = [360, 640, 828, 1080, 1440, 1920, 2560] as const

const QUALITY = 80

let builder: ImageUrlBuilder | null = null

function getBuilder(): ImageUrlBuilder {
  builder ??= createImageUrlBuilder({ projectId, dataset })
  return builder
}

/** Chainable builder for one image. Call `.url()` at the end. */
export function urlFor(source: SanityImageSource): ImageUrlBuilder {
  return getBuilder().image(source).auto("format").quality(QUALITY)
}

export interface SrcSetOptions {
  widths?: readonly number[]
  /** Aspect ratio to crop to, as width / height. Omit to keep the original. */
  aspectRatio?: number
}

/** A `srcset` string: one candidate per width, each with its `w` descriptor. */
export function srcSet(source: SanityImageSource, options: SrcSetOptions = {}): string {
  const widths = options.widths ?? DEFAULT_WIDTHS

  return widths
    .map((width) => {
      let image = urlFor(source).width(width)
      if (options.aspectRatio) {
        image = image.height(Math.round(width / options.aspectRatio)).fit("crop")
      }
      return `${image.url()} ${width}w`
    })
    .join(", ")
}

/** The `src` fallback, for browsers that ignore `srcset`. */
export function src(source: SanityImageSource, width = 1080): string {
  return urlFor(source).width(width).url()
}
