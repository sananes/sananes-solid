import { defineField, defineType } from "sanity"

/** Per-document metadata overrides. Falls back to the document's own fields. */
export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "title",
      title: "Meta title",
      type: "string",
      description: "Overrides the document title in search results and tabs.",
      validation: (rule) => rule.max(60).warning("Longer titles get truncated in search results."),
    }),
    defineField({
      name: "description",
      title: "Meta description",
      type: "text",
      rows: 3,
      validation: (rule) =>
        rule.max(160).warning("Longer descriptions get truncated in search results."),
    }),
    defineField({
      name: "image",
      title: "Social share image",
      type: "image",
      description: "1200x630 or larger. Falls back to the site-wide image.",
    }),
    defineField({
      name: "noIndex",
      title: "Hide from search engines",
      type: "boolean",
      initialValue: false,
    }),
  ],
})
