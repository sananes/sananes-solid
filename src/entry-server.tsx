// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server"

import { fontPreloadHrefs } from "~/styles/font-preloads"

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en" data-theme="dark">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {fontPreloadHrefs.map((href) => (
            <link rel="preload" as="font" type="font/woff2" href={href} crossOrigin="anonymous" />
          ))}
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
))
