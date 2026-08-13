# www

SolidStart (v2) static site — pure SSG, Bun, Biome, Tailwind CSS v4.

## Stack

- **SolidStart 2** with Nitro `static` preset + link crawling prerender
- **Bun** as package manager / runtime
- **Biome** for lint + format
- **Tailwind CSS v4** via PostCSS, not the Vite plugin — the `columns()` and
  `*-vw()` functions have to run after Tailwind (see `vite.config.ts`)

## Scripts

```bash
bun install
bun run dev        # local dev server
bun run build      # pure SSG → .output/public
bun run serve      # serve the static build
bun run preview    # vite preview
bun run test       # bun:test
bun run check      # biome lint/format check
bun run check:fix  # auto-fix with biome
bun run format     # format with biome
```

## Opt-in modules

Everything below ships **nothing** until you import it. Every external library is
dynamically imported on mount, and each module carries its own README, tests, and
CSP escape hatch. Delete any of them and the rest still builds.

This site opts into three of them: `app.tsx` mounts `SmoothScroll` and, behind
`import.meta.env.DEV`, the stats overlay; the homepage mounts a Unicorn Studio
scene. The rest are unreferenced.

| Module | What it gives you | Docs |
|---|---|---|
| `~/integrations/motion/gsap` | GSAP with scoped setup and automatic cleanup | [README](src/integrations/motion/gsap/README.md) |
| `~/integrations/motion/lenis` | Smooth scroll, wired to GSAP ScrollTrigger | [README](src/integrations/motion/lenis/README.md) |
| `~/integrations/sanity` | Sanity content, resolved at build time | [README](src/integrations/sanity/README.md) |
| `~/integrations/howler` | Sound effects behind a mute gate | [README](src/integrations/howler/README.md) |
| `~/integrations/unicorn-studio` | Unicorn Studio WebGL scenes | [README](src/integrations/unicorn-studio/README.md) |
| `~/dev/stats` | Performance overlay: fps, frame times, web vitals | [README](src/dev/stats/README.md) |
| `~/styles` | The design system (not optional — it generates the CSS) | [README](src/styles/README.md) |

`studio/` is a separate workspace holding the Sanity Studio, so React never
enters this bundle — see [its README](studio/README.md).

## Layout

```
src/
  routes/           file routes — containers, compose sections
  features/         one folder per section of the site
  components/       layout shells, ui primitives, text effects
  content/          the site's copy and lists, typed
  lib/              pure helpers
  styles/           the design system
  dev/              tooling that never ships to a visitor
  integrations/     one folder per third-party SDK
```

The import rules between those, and where a new file belongs, are in
[ARCHITECTURE.md](ARCHITECTURE.md). They are enforced by
[src/architecture.test.ts](src/architecture.test.ts) rather than by convention.

`dev/` is for instrumentation and debugging aids, which are guarded by
`import.meta.env.DEV` at the call site and dead-code-eliminated from production.
`dev/stats` is the performance overlay.

`integrations/` holds a folder per external service, and the rule is that its
`index.ts` is the only entry point and no integration imports another. When two
vendors have to be wired together the pair becomes one module rather than two —
which is what `integrations/motion` is: GSAP, Lenis and the shared ticker they
both run on.

There is deliberately no `src/integrations/index.ts`. A barrel there would pull
the Sanity client, GSAP, Lenis and Howler into any file that touched it, which is
the opposite of what the section above promises.

### One animation loop

The motion and stats modules share a single `requestAnimationFrame` through
`src/integrations/motion/ticker.ts`. Two loops fighting each other is the most common cause of
janky scroll sites and cannot be fixed by optimising assets, so Lenis runs with
`autoRaf: false`, the performance sampler never opens its own loop, and GSAP's
ticker takes over as the master clock as soon as GSAP loads. See
[src/integrations/motion/README.md](src/integrations/motion/README.md).

### Content, on a static site

There is no server at runtime. Sanity content is fetched during Nitro's prerender
and serialised into the static HTML, so a prerendered page renders CMS content
with no client-side request. Two consequences: publishing requires a rebuild
(point a webhook at your host's build hook), and dynamic routes have to be
reachable by link for `crawlLinks` to find them. Details in
[src/integrations/sanity/README.md](src/integrations/sanity/README.md).

## Environment

```bash
cp .env.example .env          # only needed for ~/integrations/sanity
cp studio/.env.example studio/.env
```

## Deploy

After `bun run build`, deploy `.output/public` to any static host.
