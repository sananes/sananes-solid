import { defineField, defineType } from "sanity"

/**
 * The one document of its kind. Pinned as a singleton in `structure.ts` so an
 * editor cannot create a second one that the frontend would silently ignore.
 */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Site title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "Default meta description, used where a page does not set its own.",
    }),
    defineField({
      name: "ogImage",
      title: "Default social share image",
      type: "image",
      description: "1200x630 or larger.",
    }),
    defineField({
      name: "navigation",
      title: "Navigation",
      type: "array",
      of: [
        {
          type: "object",
          name: "navItem",
          fields: [
            defineField({
              name: "label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "href",
              type: "string",
              description: "A path such as /work, or a full URL.",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site settings" }),
  },
})
