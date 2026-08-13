import type { JSX } from "solid-js"
import { createSignal, onCleanup, onMount, Show } from "solid-js"
import { isServer } from "solid-js/web"

import { hasTickerSource } from "~/integrations/motion/ticker"
import { createVitalsCollector, heapUsed, LONG_TASK_MS } from "./observers"
import { createFrameSampler, DROPPED_FRAME_MS, startFrameSampler } from "./sampler"
import { ensureStyles, PANEL_CLASS } from "./styles"

/**
 * A debug overlay that itself drops frames is worse than none, so the split here
 * matters: frame times are recorded on every tick, but the panel only repaints a
 * few times a second, and it does so by writing `textContent` on cached element
 * references. No Solid signal is written per frame, so nothing reconciles at
 * 120Hz.
 *
 * The graph is a canvas rather than DOM bars for the same reason — one draw call
 * per repaint instead of one element per frame.
 */

export type StatsCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export interface StatsOverlayProps {
  /** Panel position. Default `bottom-left`. */
  corner?: StatsCorner
  /** Panel repaints per second. Default 5. */
  hz?: number
  /** Start collapsed to just the fps readout. Default `false`. */
  collapsed?: boolean
  /**
   * Key that toggles the panel, with Ctrl+Alt held. Default `"p"`. Pass `null`
   * to disable the shortcut.
   */
  hotkey?: string | null
  /** Remember the collapsed state across reloads. Default `true`. */
  persist?: boolean
}

const STORAGE_KEY = "stats:collapsed"

const grade = (value: number, warn: number, bad: number) =>
  value >= bad ? "bad" : value >= warn ? "warn" : undefined

const fpsGrade = (fps: number) =>
  fps === 0 ? undefined : fps < 30 ? "bad" : fps < 55 ? "warn" : "good"

const ms = (value: number) => `${value < 10 ? value.toFixed(1) : Math.round(value)}ms`

const bytes = (value: number) => {
  if (value < 1024) return `${value}B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)}kB`
  return `${(value / (1024 * 1024)).toFixed(1)}MB`
}

export function StatsOverlay(props: StatsOverlayProps): JSX.Element {
  // Runs during render rather than in an effect so the rules are in place
  // before the browser paints the panel.
  ensureStyles()

  // Initialised from props only: reading storage during render would make the
  // markup differ from what the server produced and break hydration. The stored
  // preference is applied on mount instead.
  const [collapsed, setCollapsed] = createSignal(props.collapsed ?? false)

  let fpsEl: HTMLSpanElement | undefined
  let loopEl: HTMLSpanElement | undefined
  let canvas: HTMLCanvasElement | undefined
  const cells: Record<string, HTMLElement | undefined> = {}

  const sampler = createFrameSampler()
  const vitals = createVitalsCollector()

  const setCell = (key: string, text: string, quality?: "warn" | "bad") => {
    const cell = cells[key]
    if (!cell) return
    // Writing only on change keeps the panel out of the browser's style and
    // layout work on most repaints.
    if (cell.textContent !== text) cell.textContent = text
    if (quality) {
      if (cell.dataset.grade !== quality) cell.dataset.grade = quality
    } else if (cell.dataset.grade) {
      delete cell.dataset.grade
    }
  }

  const paint = () => {
    const frames = sampler.snapshot()
    const web = vitals.snapshot()

    if (fpsEl) {
      const text = String(frames.fps)
      if (fpsEl.textContent !== text) fpsEl.textContent = text
      const quality = fpsGrade(frames.fps)
      if (quality && fpsEl.dataset.grade !== quality) fpsEl.dataset.grade = quality
    }

    if (loopEl) {
      const text = hasTickerSource() ? "gsap.ticker" : "raf"
      if (loopEl.textContent !== text) loopEl.textContent = text
    }

    // Nothing below is visible while collapsed, so nothing below is computed.
    if (collapsed()) return

    setCell("fpsMin", String(frames.fpsMin), fpsGrade(frames.fpsMin) === "bad" ? "bad" : undefined)
    setCell("p50", ms(frames.p50), grade(frames.p50, DROPPED_FRAME_MS, 33))
    setCell("p95", ms(frames.p95), grade(frames.p95, DROPPED_FRAME_MS, 33))
    setCell("worst", ms(frames.worst), grade(frames.worst, 33, 100))
    setCell(
      "dropped",
      `${frames.dropped}/${frames.frames}`,
      frames.frames > 0 && frames.dropped / frames.frames > 0.05 ? "warn" : undefined,
    )
    setCell(
      "longTasks",
      web.longTasks === 0 ? "0" : `${web.longTasks} · ${web.longTaskMs}ms`,
      web.longTasks === 0 ? undefined : web.longTaskMs > 500 ? "bad" : "warn",
    )
    setCell("lcp", web.lcp === 0 ? "—" : ms(web.lcp), grade(web.lcp, 2500, 4000))
    setCell("cls", web.cls.toFixed(3), grade(web.cls, 0.1, 0.25))
    setCell("inp", web.inp === 0 ? "—" : ms(web.inp), grade(web.inp, 200, 500))
    setCell("weight", bytes(web.transferred.total))

    const heap = heapUsed()
    setCell("heap", heap === null ? "n/a" : bytes(heap))

    drawGraph(canvas, frames.history)
  }

  const toggle = () => {
    const next = !collapsed()
    setCollapsed(next)
    if (props.persist ?? true) {
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        // Private mode, or storage disabled. The panel still works.
      }
    }
    if (!next) paint()
  }

  onMount(() => {
    if (isServer) return

    const stored = readStoredCollapsed(props.persist ?? true)
    if (stored !== undefined) setCollapsed(stored)

    vitals.start()
    const stopSampling = startFrameSampler(sampler)
    const interval = setInterval(paint, 1000 / (props.hz ?? 5))

    const hotkey = props.hotkey === undefined ? "p" : props.hotkey
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hotkey || !event.ctrlKey || !event.altKey) return
      if (event.key.toLowerCase() !== hotkey.toLowerCase()) return
      event.preventDefault()
      toggle()
    }
    if (hotkey) window.addEventListener("keydown", onKeyDown)

    onCleanup(() => {
      clearInterval(interval)
      stopSampling()
      vitals.stop()
      if (hotkey) window.removeEventListener("keydown", onKeyDown)
    })
  })

  const row = (key: string, label: string) => (
    <>
      <dt>{label}</dt>
      <dd
        ref={(el) => {
          cells[key] = el
        }}
      >
        —
      </dd>
    </>
  )

  return (
    <aside
      class={PANEL_CLASS}
      data-corner={props.corner ?? "bottom-left"}
      data-collapsed={collapsed() ? "" : undefined}
      aria-label="Performance overlay"
    >
      <button
        type="button"
        class={`${PANEL_CLASS}-head`}
        aria-expanded={!collapsed()}
        onClick={toggle}
      >
        <span
          class={`${PANEL_CLASS}-fps`}
          ref={(el) => {
            fpsEl = el
          }}
        >
          0
        </span>
        <span
          class={`${PANEL_CLASS}-loop`}
          ref={(el) => {
            loopEl = el
          }}
        >
          raf
        </span>
      </button>

      <canvas
        class={`${PANEL_CLASS}-graph`}
        width={240}
        height={64}
        ref={(el) => {
          canvas = el
        }}
      />

      <dl class={`${PANEL_CLASS}-rows`}>
        {row("fpsMin", "fps min")}
        {row("p50", "frame p50")}
        {row("p95", "frame p95")}
        {row("worst", "frame worst")}
        {row("dropped", "dropped")}
        {row("longTasks", `tasks >${LONG_TASK_MS}ms`)}
        {row("lcp", "LCP")}
        {row("cls", "CLS")}
        {row("inp", "INP")}
        {row("weight", "transferred")}
        {row("heap", "JS heap")}
      </dl>

      <Show when={props.hotkey !== null}>
        <span class={`${PANEL_CLASS}-hint`}>ctrl+alt+{props.hotkey ?? "p"} to collapse</span>
      </Show>
    </aside>
  )
}

const BAD_FRAME_MS = 33
/** Full graph height. 50ms, so a 16ms frame sits low and jank is unmissable. */
const GRAPH_CEILING_MS = 50

/** One draw call per repaint: a bar per frame, coloured by budget. */
function drawGraph(canvas: HTMLCanvasElement | undefined, history: number[]): void {
  const context = canvas?.getContext("2d")
  if (!canvas || !context) return

  const { width, height } = canvas
  context.clearRect(0, 0, width, height)
  if (history.length === 0) return

  const barWidth = width / history.length

  for (let i = 0; i < history.length; i++) {
    const value = history[i] ?? 0
    const barHeight = Math.max(1, Math.min(1, value / GRAPH_CEILING_MS) * height)
    context.fillStyle =
      value > BAD_FRAME_MS
        ? "oklch(0.72 0.19 25)"
        : value > DROPPED_FRAME_MS
          ? "oklch(0.85 0.17 85)"
          : "oklch(0.82 0.17 150)"
    context.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth - 0.5), barHeight)
  }

  // The 60Hz budget, for reference.
  context.fillStyle = "oklch(1 0 0 / 0.25)"
  context.fillRect(0, height - (1000 / 60 / GRAPH_CEILING_MS) * height, width, 1)
}

function readStoredCollapsed(persist: boolean): boolean | undefined {
  if (!persist || typeof localStorage === "undefined") return undefined
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? undefined : stored === "1"
  } catch {
    return undefined
  }
}
