import { type JSX, splitProps } from "solid-js"

import { muted, toggle } from "./runtime"
import { ensureStyles, TOGGLE_CLASS } from "./styles"

type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "type">

/**
 * Unstyled mute toggle. Renders nothing audio-related on its own — you have
 * to mount it. State is exposed as `data-howl="muted" | "on"` so it can be
 * styled without importing anything.
 */
export function HowlToggle(props: ButtonProps): JSX.Element {
  ensureStyles()

  const [local, rest] = splitProps(props, ["class", "onClick", "children", "aria-label"])

  const on = () => !muted()

  return (
    <button
      {...rest}
      type="button"
      class={[TOGGLE_CLASS, local.class].filter(Boolean).join(" ")}
      data-howl={on() ? "on" : "muted"}
      aria-pressed={on()}
      aria-label={local["aria-label"] ?? (on() ? "Mute sounds" : "Unmute sounds")}
      onClick={(event) => {
        if (typeof local.onClick === "function") local.onClick(event)
        if (!event.defaultPrevented) void toggle()
      }}
    >
      {local.children}
    </button>
  )
}
