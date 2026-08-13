import type { JSX } from "solid-js"
import { onCleanup, onMount } from "solid-js"
import { isServer } from "solid-js/web"

import { destroySmoothScroll, initSmoothScroll } from "./smooth-scroll"
import type { SmoothScrollOptions } from "./types"

export type SmoothScrollProps = SmoothScrollOptions

/**
 * Mounts the document-wide Lenis instance for as long as it is rendered, and
 * tears it down on unmount. Renders nothing.
 *
 * Lenis scrolls the window, so this does not need to wrap anything — put it in
 * the router root beside the rest of the app.
 *
 * @example
 * ```tsx
 * <Router root={(props) => (
 *   <>
 *     <SmoothScroll lerp={0.1} />
 *     {props.children}
 *   </>
 * )} />
 * ```
 */
export function SmoothScroll(props: SmoothScrollProps): JSX.Element {
  onMount(() => {
    if (isServer) return
    // Options are read once. Lenis is a single instance for the document, and
    // reacting to prop changes would mean rebuilding it mid-scroll.
    void initSmoothScroll({ ...props })
    onCleanup(destroySmoothScroll)
  })

  return null
}
