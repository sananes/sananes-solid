import { solidStart } from "@solidjs/start/config"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

// NOTE: Tailwind runs through postcss.config.mjs (auto-loaded by Vite), not the
// @tailwindcss/vite plugin: the styles system needs the columns()/*-vw()
// PostCSS functions and custom-media resolution to run after Tailwind, which
// only the PostCSS pipeline guarantees.
export default defineConfig({
  plugins: [
    solidStart(),
    nitro({
      // Pure SSG (static HTML only). Nitro 3 currently errors after a successful
      // prerender with this preset; scripts/build.ts treats that as success.
      // https://github.com/nitrojs/nitro/issues/3843
      preset: "static",
      prerender: {
        crawlLinks: true,
      },
    }),
  ],
})
