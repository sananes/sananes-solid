import { createSignal, type JSX, onCleanup, onMount, splitProps } from "solid-js"

const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"

export interface ScrambleTextProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  text: string
  /** How often the scramble restarts after the text is revealed (ms) */
  interval?: number
  /** Delay between scramble ticks (ms) */
  scrambleSpeed?: number
  /** How many ticks a character cycles before locking in */
  cyclesPerChar?: number
  /** Glyph pool used while scrambling */
  chars?: string
}

export default function ScrambleText(props: ScrambleTextProps) {
  const [local, rest] = splitProps(props, [
    "text",
    "interval",
    "scrambleSpeed",
    "cyclesPerChar",
    "chars",
    "class",
  ])

  const interval = () => local.interval ?? 4000
  const scrambleSpeed = () => local.scrambleSpeed ?? 40
  const cyclesPerChar = () => local.cyclesPerChar ?? 3
  const chars = () => local.chars ?? DEFAULT_CHARS

  const [displayed, setDisplayed] = createSignal(local.text)

  onMount(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const randomChar = () => {
      const pool = chars()
      return pool[Math.floor(Math.random() * pool.length)] ?? "?"
    }

    const scramble = () => {
      if (cancelled) return

      const target = local.text
      let step = 0

      const tick = () => {
        if (cancelled) return

        const revealCount = Math.floor(step / cyclesPerChar())
        let next = ""

        for (let i = 0; i < target.length; i++) {
          const char = target[i] ?? ""
          if (char === " ") {
            next += " "
            continue
          }
          next += i < revealCount ? char : randomChar()
        }

        setDisplayed(next)
        step += 1

        if (revealCount < target.length) {
          timeoutId = setTimeout(tick, scrambleSpeed())
          return
        }

        setDisplayed(target)
        timeoutId = setTimeout(scramble, interval())
      }

      tick()
    }

    scramble()

    onCleanup(() => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    })
  })

  return (
    <span class={local.class} {...rest}>
      {displayed()}
    </span>
  )
}
