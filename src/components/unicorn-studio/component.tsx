import type { JSX } from "solid-js"
import { createEffect, createSignal, on, onCleanup, Show, splitProps } from "solid-js"

import { loadUnicornStudio } from "./loader"
import { CONTAINER_CLASS, ensureStyles } from "./styles"
import type { UnicornAddSceneOptions, UnicornInteractivity, UnicornScene } from "./types"

type ContainerProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "onError" | "style" | "ref">

export interface UnicornStudioProps extends ContainerProps {
  /** Published Unicorn Studio embed id. Mutually exclusive with `filePath`. */
  projectId?: string
  /** Path to a self-hosted exported scene JSON. Mutually exclusive with `projectId`. */
  filePath?: string
  width?: number | string
  height?: number | string
  /** Canvas rendering scale, 0.25–1. Lower is cheaper. */
  scale?: number
  /** Scene resolution, typically 1–1.5. */
  dpi?: number
  /** Render loop target, 0–120. */
  fps?: number
  /** SEO text placed inside the canvas. */
  altText?: string
  /** aria-label applied to the canvas. */
  ariaLabel?: string
  /** Defer scene initialization until it scrolls into view. */
  lazyLoad?: boolean
  /** Serve scene data from the production edge CDN. */
  production?: boolean
  /** Make the scene behave like a fixed element. */
  fixed?: boolean
  interactivity?: UnicornInteractivity
  /** Scene variables. Updates are applied live, without rebuilding the scene. */
  variables?: Record<string, unknown>
  /** Named preset to start from. Changing this rebuilds the scene. */
  preset?: string
  /** Tag of hiunicornstudio/unicornstudio.js to load from the jsDelivr CDN. */
  version?: string
  /** Full URL to the UMD bundle. Overrides `version`; use this to self-host. */
  scriptUrl?: string
  /** Opacity once the scene is ready. */
  opacity?: number
  /** Fade-in duration in milliseconds. */
  fadeDuration?: number
  /** Rendered in place of the scene when it fails to load. */
  fallback?: JSX.Element
  style?: JSX.CSSProperties
  ref?: (el: HTMLDivElement) => void
  onSceneReady?: (scene: UnicornScene) => void
  onError?: (error: Error) => void
  onDestroy?: () => void
}

const toCssSize = (value: number | string | undefined, fallback: string) => {
  if (value === undefined) return fallback
  return typeof value === "number" ? `${value}px` : value
}

export default function UnicornStudio(props: UnicornStudioProps): JSX.Element {
  // Runs during render rather than in an effect so the rules are in place before
  // the browser paints the container.
  ensureStyles()

  const [local, rest] = splitProps(props, [
    "projectId",
    "filePath",
    "width",
    "height",
    "scale",
    "dpi",
    "fps",
    "altText",
    "ariaLabel",
    "lazyLoad",
    "production",
    "fixed",
    "interactivity",
    "variables",
    "preset",
    "version",
    "scriptUrl",
    "opacity",
    "fadeDuration",
    "fallback",
    "class",
    "style",
    "ref",
    "onSceneReady",
    "onError",
    "onDestroy",
  ])

  const [isReady, setIsReady] = createSignal(false)
  const [error, setError] = createSignal<Error | null>(null)

  let element: HTMLDivElement | undefined
  let scene: UnicornScene | undefined
  // Bumped on every rebuild and on unmount so that in-flight async work can tell
  // whether it is still the current attempt before touching component state.
  let generation = 0

  const fail = (err: Error) => {
    setError(err)
    // Reporting to the console only when unhandled keeps failures visible in
    // development without forcing noise on consumers that handle them.
    if (local.onError) local.onError(err)
    else console.error(err)
  }

  const teardown = () => {
    if (!scene) return
    try {
      scene.destroy()
    } catch (err) {
      console.error("UnicornStudio: failed to destroy scene", err)
    }
    scene = undefined
  }

  const build = async () => {
    const target = element
    if (!target) return

    const attempt = ++generation
    teardown()
    setIsReady(false)
    setError(null)

    if (!(local.projectId || local.filePath)) {
      fail(new Error("UnicornStudio: pass either `projectId` or `filePath`"))
      return
    }

    // `projectId` and `filePath` are mutually exclusive upstream, so only ever
    // send the one that was provided.
    const options: UnicornAddSceneOptions = {
      element: target,
      ...(local.filePath ? { filePath: local.filePath } : { projectId: local.projectId }),
      scale: local.scale,
      dpi: local.dpi,
      fps: local.fps,
      lazyLoad: local.lazyLoad,
      fixed: local.fixed,
      production: local.production,
      altText: local.altText,
      ariaLabel: local.ariaLabel,
      interactivity: local.interactivity,
      initialVariables: local.variables,
      initialPreset: local.preset,
    }

    try {
      const runtime = await loadUnicornStudio({
        version: local.version,
        scriptUrl: local.scriptUrl,
      })
      if (attempt !== generation) return

      const next = await runtime.addScene(options)
      if (attempt !== generation) {
        next.destroy()
        return
      }

      scene = next
      setIsReady(true)
      local.onSceneReady?.(next)
    } catch (err) {
      if (attempt !== generation) return
      fail(err instanceof Error ? err : new Error(String(err)))
    }
  }

  // `on` runs its callback untracked, so only these props rebuild the scene.
  createEffect(
    on(
      () => [
        local.projectId,
        local.filePath,
        local.scale,
        local.dpi,
        local.fps,
        local.lazyLoad,
        local.production,
        local.fixed,
        local.preset,
        local.version,
        local.scriptUrl,
      ],
      () => void build(),
    ),
  )

  createEffect(
    on(
      () => [local.variables, isReady()] as const,
      ([variables, ready]) => {
        if (ready && variables && typeof scene?.setVariables === "function") {
          scene.setVariables(variables)
        }
      },
    ),
  )

  onCleanup(() => {
    generation++
    teardown()
    local.onDestroy?.()
  })

  const visible = () => isReady() || error() !== null

  const containerClass = () => [CONTAINER_CLASS, local.class].filter(Boolean).join(" ")

  const containerStyle = (): JSX.CSSProperties => ({
    width: toCssSize(local.width, "100%"),
    height: toCssSize(local.height, "100%"),
    "--us-fade-duration": `${local.fadeDuration ?? 1000}ms`,
    opacity: visible() ? (local.opacity ?? 1) : 0,
    visibility: visible() ? "visible" : "hidden",
    ...local.style,
  })

  return (
    <div
      {...rest}
      ref={(el) => {
        element = el
        local.ref?.(el)
      }}
      class={containerClass()}
      style={containerStyle()}
      data-ready={isReady() ? "" : undefined}
      data-error={error() ? "" : undefined}
    >
      <Show when={error()}>{local.fallback}</Show>
    </div>
  )
}
