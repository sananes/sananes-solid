import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import { Theme } from "~/styles"
import "@fontsource-variable/geist/wght.css"
import "@fontsource/geist-pixel"
import "@fontsource-variable/geist-mono/wght.css"
import "./app.css"

export default function App() {
  return (
    <Router
      root={(props) => (
        <Theme theme="dark" global>
          <Suspense>{props.children}</Suspense>
        </Theme>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
