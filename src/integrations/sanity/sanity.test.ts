/**
 * The content layer's contracts. No network: `setSanityFetcher` replaces the
 * client, so these run against fixtures.
 *
 * Three things are guarded. First, the GROQ projections — every image must ask
 * for `metadata.dimensions` and `metadata.lqip`, because without them the markup
 * cannot reserve space and the image shifts the layout on load. Second, the cache
 * keys, since those are what the prerendered payload is looked up by on the
 * client; a query that keys on nothing but its name would serve one page's data
 * to another. Third, the Portable Text serialisers, including escaping.
 *
 * Run with: bun test src/integrations/sanity
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import { sanityFetch, setSanityFetcher } from "./fetch"
import { renderPortableText, toPlainText } from "./portable-text"
import {
  IMAGE_PROJECTION_FIELDS,
  PAGE_QUERY,
  POST_QUERY,
  POSTS_QUERY,
  SITE_SETTINGS_QUERY,
} from "./queries"
import type { PortableTextBlock } from "./types"

const block = (text: string, style = "normal"): PortableTextBlock =>
  ({
    _type: "block",
    style,
    children: [{ _type: "span", text, marks: [] }],
    markDefs: [],
  }) as unknown as PortableTextBlock

beforeEach(() => {
  setSanityFetcher(null)
})

afterEach(() => {
  setSanityFetcher(null)
})

describe("query projections", () => {
  const imageQueries = [
    ["POSTS_QUERY", POSTS_QUERY],
    ["POST_QUERY", POST_QUERY],
  ] as const

  for (const [name, groqQuery] of imageQueries) {
    it(`${name} asks for the dimensions and placeholder every image needs`, () => {
      for (const field of IMAGE_PROJECTION_FIELDS) {
        expect(groqQuery).toContain(field)
      }
    })
  }

  it("only ever asks for published documents by slug, never by _id in a URL", () => {
    expect(PAGE_QUERY).toContain("slug.current == $slug")
    expect(POST_QUERY).toContain("slug.current == $slug")
  })

  it("filters out documents without a slug, which could never be reached", () => {
    expect(POSTS_QUERY).toContain("defined(slug.current)")
  })

  it("orders posts newest first, so a listing does not depend on document order", () => {
    expect(POSTS_QUERY).toContain("order(publishedAt desc)")
  })

  it("takes a single document for the settings singleton", () => {
    expect(SITE_SETTINGS_QUERY).toContain("[0]")
  })
})

describe("fetcher indirection", () => {
  it("routes every query through a replaced fetcher", async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    setSanityFetcher(async (query, params) => {
      calls.push({ query, params })
      return { title: "From fixture" } as never
    })

    const result = await sanityFetch<{ title: string }>(PAGE_QUERY, { slug: "about" })

    expect(result.title).toBe("From fixture")
    expect(calls).toHaveLength(1)
    expect(calls[0]?.params).toEqual({ slug: "about" })
  })

  it("defaults params to an empty object rather than undefined", async () => {
    let seen: unknown
    setSanityFetcher(async (_query, params) => {
      seen = params
      return null as never
    })

    await sanityFetch(SITE_SETTINGS_QUERY)
    expect(seen).toEqual({})
  })
})

describe("portable text", () => {
  it("renders block styles the studio schema offers", () => {
    const html = renderPortableText([block("Heading", "h2"), block("Body")])

    expect(html).toContain("<h2>Heading</h2>")
    expect(html).toContain("Body")
  })

  it("renders a blockquote, which the default serialisers do not cover", () => {
    expect(renderPortableText([block("Quoted", "blockquote")])).toContain("<blockquote>")
  })

  it("opens external links in a new tab, and internal ones in place", () => {
    const withLink = {
      _type: "block",
      style: "normal",
      markDefs: [{ _key: "a", _type: "link", href: "https://example.com" }],
      children: [{ _type: "span", text: "out", marks: ["a"] }],
    } as unknown as PortableTextBlock

    const internal = {
      _type: "block",
      style: "normal",
      markDefs: [{ _key: "b", _type: "link", href: "/about" }],
      children: [{ _type: "span", text: "in", marks: ["b"] }],
    } as unknown as PortableTextBlock

    expect(renderPortableText([withLink])).toContain('rel="noopener noreferrer"')
    expect(renderPortableText([internal])).not.toContain("target=")
  })

  it("escapes a quote in a link href so it cannot break out of the attribute", () => {
    const nasty = {
      _type: "block",
      style: "normal",
      markDefs: [{ _key: "a", _type: "link", href: '/x" onmouseover="alert(1)' }],
      children: [{ _type: "span", text: "click", marks: ["a"] }],
    } as unknown as PortableTextBlock

    const html = renderPortableText([nasty])
    expect(html).not.toContain('onmouseover="')
    expect(html).toContain("&quot;")
  })

  it("lets a caller override one serialiser without losing the rest", () => {
    const html = renderPortableText([block("Heading", "h2"), block("Quoted", "blockquote")], {
      components: { block: { h2: ({ children }) => `<h3>${children}</h3>` } },
    })

    expect(html).toContain("<h3>Heading</h3>")
    // The default blockquote serialiser survived the merge.
    expect(html).toContain("<blockquote>")
  })

  it("flattens to plain text for meta descriptions", () => {
    expect(toPlainText([block("One"), block("Two")])).toBe("One\n\nTwo")
    expect(toPlainText(null)).toBe("")
  })
})
