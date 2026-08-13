import { children, type JSX, Show } from "solid-js"

export interface TwoColumnProps {
  children: JSX.Element
  /**
   * Fills the right half on large screens and is dropped below it. Sits behind
   * the content column, so a full-bleed scene can run under the text.
   */
  aside?: JSX.Element
}

/** The page shell: a measure-limited content column beside a sticky aside. */
export default function TwoColumn(props: TwoColumnProps) {
  // Resolved once. A JSX prop is a getter, so reading `props.aside` for the
  // Show condition and again for the body would mount the aside twice and
  // hydrate against a tree the server never rendered.
  const aside = children(() => props.aside)

  return (
    <main class="text-subdued text-sm w-full lg:grid lg:grid-cols-[1fr_1fr] max-w-7xl mx-auto">
      <div class="mx-auto">
        <div class="relative z-10 p-12 mx-auto max-w-105 space-y-24 md:m-24 md:p-0 w-full">
          {props.children}
        </div>
      </div>
      <Show when={aside()}>
        <aside class="sticky top-0 -z-10 hidden h-screen w-full items-center justify-center lg:flex mix-blend-multiply">
          {aside()}
        </aside>
      </Show>
    </main>
  )
}
