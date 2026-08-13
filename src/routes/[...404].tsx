import { A } from "@solidjs/router"
import { SectionHeading } from "~/components/ui"

export default function NotFound() {
  return (
    <main class="text-subdued text-sm mx-auto flex min-h-screen max-w-105 flex-col justify-center gap-2 p-12">
      <SectionHeading title="404" class="text-foreground" />
      <p>That page does not exist.</p>
      <p>
        <A href="/" class="!text-foreground">
          Back home
        </A>
      </p>
    </main>
  )
}
