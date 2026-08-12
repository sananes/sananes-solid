# www

SolidStart (v2) static site — pure SSG, Bun, Biome, Tailwind CSS v4.

## Stack

- **SolidStart 2** with Nitro `static` preset + link crawling prerender
- **Bun** as package manager / runtime
- **Biome** for lint + format
- **Tailwind CSS v4** via `@tailwindcss/vite`

## Scripts

```bash
bun install
bun run dev        # local dev server
bun run build      # pure SSG → .output/public
bun run serve      # serve the static build
bun run preview    # vite preview
bun run check      # biome lint/format check
bun run check:fix  # auto-fix with biome
bun run format     # format with biome
```

## Deploy

After `bun run build`, deploy `.output/public` to any static host.
