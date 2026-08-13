import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import { StatsOverlay } from "~/dev/stats"
import { SmoothScroll } from "~/integrations/motion/lenis"
import { Theme } from "~/styles"
import "./app.css"

export default function App() {
  return (
    <Router
      root={(props) => (
        <Theme theme="dark" global>
          <SmoothScroll />
          {import.meta.env.DEV && <StatsOverlay />}
          <Suspense>{props.children}</Suspense>
        </Theme>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
