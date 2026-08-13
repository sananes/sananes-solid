import type { StructureResolver } from "sanity/structure"

/**
 * Singletons are pinned to the top as single documents rather than lists —
 * there is only ever one `siteSettings`, and letting an editor create a second
 * one produces content the frontend silently ignores.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("page").title("Pages"),
      S.documentTypeListItem("post").title("Posts"),
    ])
