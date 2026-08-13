import type { PortableTextComponents, PortableTextOptions } from "@portabletext/to-html"
import { toHTML } from "@portabletext/to-html"
import type { JSX } from "solid-js"
import { createMemo, splitProps } from "solid-js"

import { src as buildSrc, srcSet } from "./image"
import type { PortableTextBlock } from "./types"

/**
 * Rich text, rendered to a string.
 *
 * `@portabletext/to-html` is framework-agnostic: it turns the block array into
 * HTML which is set via `innerHTML`. On a static build that means the markup is
 * produced once, on the build machine, and the client does no rendering work at
 * all — no per-node components, no reconciliation. The alternative, a Solid
 * component tree per block type, costs bundle size and hydration time for output
 * that can never change after the build.
 *
 * The HTML comes from your own CMS and the serialisers escape text, so
 * `innerHTML` here is not the injection risk it usually signals. Do not point
 * this at untrusted input.
 *
 * Every style, list and mark in the Studio's `blockContent` needs a serialiser
 * here or it falls back to a plain paragraph. The two have to be kept in step.
 */

const externalHref = (href: string) => /^https?:\/\//.test(href)

export const defaultPortableTextComponents: PortableTextComponents = {
  block: {
    blockquote: ({ children }) => `<blockquote>${children}</blockquote>`,
  },
  marks: {
    code: ({ children }) => `<code>${children}</code>`,
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : ""
      if (!href) return children
      // Third-party links get the usual protections; internal ones do not need
      // them and `noreferrer` would break same-site analytics.
      const attrs = externalHref(href) ? ' target="_blank" rel="noopener noreferrer"' : ""
      return `<a href="${escapeAttribute(href)}"${attrs}>${children}</a>`
    },
  },
  types: {
    // Images inside the body get the same srcset treatment as `<SanityImage />`,
    // including the intrinsic size so they cannot shift the layout.
    image: ({ value }) => {
      const alt = typeof value?.alt === "string" ? value.alt : ""
      const caption = typeof value?.caption === "string" ? value.caption : ""
      const dimensions = value?.asset?.metadata?.dimensions as
        | { width?: number; height?: number }
        | undefined

      const size = dimensions?.width
        ? ` width="${dimensions.width}" height="${dimensions.height ?? ""}"`
        : ""

      const img =
        `<img src="${escapeAttribute(buildSrc(value, 1080))}"` +
        ` srcset="${escapeAttribute(srcSet(value))}"` +
        ` sizes="100vw" alt="${escapeAttribute(alt)}"${size}` +
        ` loading="lazy" decoding="async" />`

      return caption
        ? `<figure>${img}<figcaption>${escapeText(caption)}</figcaption></figure>`
        : img
    },
  },
}

export interface PortableTextProps {
  value: PortableTextBlock[] | null | undefined
  /** Overrides merged over the defaults above. */
  components?: PortableTextComponents
  /** Wrapper element. Default `div`. */
  as?: "div" | "article" | "section"
  class?: string
}

export function PortableText(props: PortableTextProps): JSX.Element {
  const [local] = splitProps(props, ["value", "components", "as", "class"])

  const html = createMemo(() => {
    const value = local.value
    if (!value || value.length === 0) return ""
    return renderPortableText(value, { components: local.components })
  })

  const Tag = (local.as ?? "div") as "div"

  return <Tag class={local.class} innerHTML={html()} />
}

/** The same rendering, for metadata or anywhere outside a component. */
export function renderPortableText(
  value: PortableTextBlock[],
  options: { components?: PortableTextComponents } = {},
): string {
  const components: PortableTextComponents = {
    ...defaultPortableTextComponents,
    ...options.components,
    block: { ...defaultPortableTextComponents.block, ...options.components?.block },
    marks: { ...defaultPortableTextComponents.marks, ...options.components?.marks },
    types: { ...defaultPortableTextComponents.types, ...options.components?.types },
  }

  return toHTML(value, { components } satisfies PortableTextOptions)
}

/** Plain text, for meta descriptions and excerpts. */
export function toPlainText(value: PortableTextBlock[] | null | undefined): string {
  if (!value) return ""
  return value
    .filter((block) => block._type === "block" && Array.isArray(block.children))
    .map((block) =>
      (block.children as Array<{ text?: string }>).map((child) => child.text ?? "").join(""),
    )
    .join("\n\n")
    .trim()
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
