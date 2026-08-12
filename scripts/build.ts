import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"

const result = spawnSync("bunx", ["vite", "build"], {
  stdio: "inherit",
  shell: true,
})

const hasStaticOutput = existsSync(".output/public/index.html")

if (result.status === 0 || hasStaticOutput) {
  if (result.status !== 0 && hasStaticOutput) {
    console.log(
      "\n[build] Nitro static preset exited non-zero after prerender (known upstream issue).",
    )
    console.log("[build] Static site is ready in .output/public\n")
  }
  process.exit(0)
}

process.exit(result.status ?? 1)
