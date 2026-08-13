# Studio

Sanity Studio for the site, as its own workspace.

It is separate on purpose. The Studio is a React application that needs React 19
and styled-components; keeping it out of the Solid app means none of that can
leak into the site's bundle, and the site stays a pure static build with no
client-side CMS code in it.

## Setup

```sh
cd studio
bun install
cp .env.example .env   # then fill in SANITY_STUDIO_PROJECT_ID
bun run dev            # http://localhost:3333
```

No project yet? `bunx sanity init` in this folder creates one and prints the id.

The frontend needs the same project id and dataset in the repo-root `.env` — see
`../src/integrations/sanity/README.md`.

## Types

The Studio schema is the source of truth for the frontend's types. From the repo
root, after changing anything in `schemaTypes/` or any GROQ query:

```sh
bun run sanity:typegen
```

That writes `schema.json` here, then scans `../src/**/*.{ts,tsx}` for GROQ queries
and writes `../src/integrations/sanity/sanity.types.ts`. Because `overloadClientMethods` is on,
`client.fetch(someDefinedQuery)` returns the right type with no annotation — as
long as the query was written with `defineQuery`.

Nothing in `../src/integrations/sanity` describes content by hand: `types.ts` there only gives
friendly names to the generated result types, so a schema change either updates
the frontend's types or stops it compiling.

`schema.json` is an intermediate artifact and gitignored. `sanity.types.ts` is
committed, so a fresh checkout typechecks without needing Studio credentials.

## Running under Bun

The Sanity CLI targets Node — its `bin` refuses anything below 22.12 — and this
repo has no Node in it. Most of the CLI runs under Bun anyway, but not all of it,
so it is worth knowing which parts are load-bearing:

| Command | Under Bun | |
|---|---|---|
| `bun run sanity:typegen` | works | Schema extraction is done by `scripts/extract-schema.ts` |
| `bun run dev` | works | Needs `scripts/bun-compat.mjs`, preloaded via `bunfig.toml` |
| `bun run build` | **fails** | Needs Node — and `bun run` is not enough, see below |
| `bun run deploy` | **fails** | Builds first, so the same applies |

Installing Node is necessary but not sufficient for those two: `bun run build`
still fails afterwards, because Bun substitutes itself for the `node` in the CLI's
shebang. Node has to be the thing invoking it — `npm run build`, or
`node node_modules/.bin/sanity build`.

Three separate incompatibilities are involved, all of them in the toolchain rather
than in anything here:

1. **Schema extraction** runs in a worker whose teardown shim reassigns
   `parentPort.postMessage`. Bun defines that property as non-writable *and*
   non-configurable, so it can be neither assigned nor redefined, and
   `sanity schema extract` dies with "Attempted to assign to readonly property"
   before reading a single type. `scripts/extract-schema.ts` sidesteps the worker
   entirely — see the comment there for why it is safe to.
2. **Importing Vite** throws "First argument must be an Error object" from
   `Error.captureStackTrace`, deep in Vite's bundled `follow-redirects`. That is a
   V8/JSC difference, and it takes down `dev`, `build` and `deploy` alike.
   `scripts/bun-compat.mjs` makes the call tolerant, which is enough for `dev`.
3. **Building** fails with `renderToStaticMarkup is not a function`. The build
   renders the Studio's HTML shell through Vite's SSR pipeline, and the CJS interop
   for `react-dom/server` yields `undefined` there under Bun — the same named
   import resolves correctly in plain `bun`, so this one is not ours to fix.

Auto-updates are enabled in `sanity.cli.ts` but their version check does not work
under Bun either: it asks for `maxRedirects: 0` to read `x-resolved-version` off a
302, and Bun follows the redirect anyway, losing the header. Harmless for `dev`,
which logs a warning and continues.

## Deploying

```sh
npm run deploy   # not bun — see "Running under Bun" above
```

Puts the studio on `<name>.sanity.studio`, hosted by Sanity. There is nothing to
deploy alongside the site, which is the point: the site itself remains static
files.

This is the only workflow that needs Node, and CI is a better home for it than a
laptop anyway. Content editing does not need it: `bun run dev` gives a fully
functional Studio against the real dataset, so the deployed Studio is a
convenience for editors rather than a prerequisite for publishing.

## Schema

| Type | Kind | Notes |
|---|---|---|
| `siteSettings` | singleton | Pinned in `structure.ts`; one document only |
| `page` | document | `title`, `slug`, `body`, `seo` |
| `post` | document | Adds `publishedAt`, `excerpt`, `coverImage` |
| `blockContent` | array | Rich text, rendered by `<PortableText />` |
| `seo` | object | Per-document metadata overrides |

Two conventions worth keeping:

- **Slugs are required.** The site prerenders one static file per slug, so a
  document without one can never be reached.
- **`blockContent` has no H1 style.** The page title owns the H1; a second one in
  the body breaks the document outline.

Every block style, list and mark added to `blockContent` needs a matching
component in `../src/integrations/sanity/portable-text.tsx`, or it renders as a plain
paragraph.

## Publishing does not update the site

The site is statically generated, so content is frozen at build time. Publishing
in the Studio changes nothing until the site is rebuilt — wire a Sanity webhook to
your host's build hook. See `../src/integrations/sanity/README.md`.
