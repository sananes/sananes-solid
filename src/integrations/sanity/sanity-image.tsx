import type { JSX } from "solid-js"
import { splitProps } from "solid-js"

import { src as buildSrc, DEFAULT_WIDTHS, srcSet } from "./image"
import type { SanityImageSource } from "./types"

type ImgProps = Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcset" | "width" | "height">

export interface SanityImageProps extends ImgProps {
  source: SanityImageSource
  /**
   * Required. An empty string is the correct value for a decorative image, but
   * it has to be a decision rather than an omission.
   */
  alt: string
  /** Intrinsic width from `asset->metadata.dimensions.width`. */
  width?: number | null
  /** Intrinsic height from `asset->metadata.dimensions.height`. */
  height?: number | null
  /**
   * The `sizes` attribute. Without it the browser assumes `100vw` and picks a
   * candidate far larger than it needs.
   */
  sizes?: string
  widths?: readonly number[]
  /** Crop to this ratio, as width / height. */
  aspectRatio?: number
  /** `metadata.lqip`, shown behind the image until it decodes. */
  lqip?: string | null
  /**
   * Load eagerly and raise fetch priority. Use for the one image that is the
   * LCP element, and nothing else.
   */
  priority?: boolean
}

/**
 * An `<img>` with a Sanity-generated `srcset`.
 *
 * The defaults exist to protect two metrics:
 *
 * - **CLS.** `width` and `height` are passed through so the browser can reserve
 *   the right box before the bytes arrive. They come from the query projection
 *   (`asset->metadata.dimensions`), which is why the fragments in `queries.ts`
 *   always ask for them.
 * - **LCP.** Everything is `loading="lazy"` and `decoding="async"` unless marked
 *   `priority`, so below-the-fold images cannot compete with the one that
 *   actually matters.
 *
 * @example
 * ```tsx
 * <SanityImage
 *   source={post.coverImage.source}
 *   alt={post.coverImage.alt ?? ""}
 *   width={post.coverImage.width}
 *   height={post.coverImage.height}
 *   lqip={post.coverImage.lqip}
 *   sizes="(min-width: 64rem) 50vw, 100vw"
 *   priority
 * />
 * ```
 */
export function SanityImage(props: SanityImageProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "source",
    "alt",
    "width",
    "height",
    "sizes",
    "widths",
    "aspectRatio",
    "lqip",
    "priority",
    "style",
  ])

  // Honour the crop when one is requested, so the reserved box matches the
  // rendered image rather than the original asset.
  const height = () =>
    local.aspectRatio && local.width
      ? Math.round(local.width / local.aspectRatio)
      : (local.height ?? undefined)

  const widths = () => local.widths ?? DEFAULT_WIDTHS

  // A middle candidate, not the largest: this is only reached by browsers that
  // ignore `srcset`, and handing them a 2560px file would be worse than useless.
  const fallbackWidth = () => {
    const list = widths()
    return list[Math.floor(list.length / 2)] ?? 1080
  }

  const style = (): JSX.CSSProperties | undefined => {
    if (!local.lqip) return local.style as JSX.CSSProperties | undefined
    return {
      "background-image": `url(${local.lqip})`,
      "background-size": "cover",
      "background-position": "center",
      ...(local.style as JSX.CSSProperties | undefined),
    }
  }

  return (
    <img
      {...rest}
      src={buildSrc(local.source, fallbackWidth())}
      srcset={srcSet(local.source, {
        widths: widths(),
        aspectRatio: local.aspectRatio,
      })}
      sizes={local.sizes ?? "100vw"}
      alt={local.alt}
      width={local.width ?? undefined}
      height={height()}
      loading={local.priority ? "eager" : "lazy"}
      // `async` lets the browser decode off the main thread; `sync` on the LCP
      // image avoids a frame where the box is reserved but empty.
      decoding={local.priority ? "sync" : "async"}
      fetchpriority={local.priority ? "high" : undefined}
      style={style()}
    />
  )
}
