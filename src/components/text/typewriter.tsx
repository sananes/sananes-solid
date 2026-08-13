import { createSignal, type JSX, onCleanup, onMount, splitProps } from "solid-js"

export interface TypewriterProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  texts: string[]
  /** Delay between each typed character (ms) */
  typeSpeed?: number
  /** Delay between each deleted character (ms) */
  deleteSpeed?: number
  /** Pause after a word is fully typed (ms) */
  pause?: number
  /** Character shown as the blinking cursor */
  cursor?: string
  /** Blink interval for the cursor (ms) */
  blinkSpeed?: number
}

export default function Typewriter(props: TypewriterProps) {
  const [local, rest] = splitProps(props, [
    "texts",
    "typeSpeed",
    "deleteSpeed",
    "pause",
    "cursor",
    "blinkSpeed",
    "class",
  ])

  const typeSpeed = () => local.typeSpeed ?? 80
  const deleteSpeed = () => local.deleteSpeed ?? 40
  const pause = () => local.pause ?? 1800
  const cursor = () => local.cursor ?? "_"
  const blinkSpeed = () => local.blinkSpeed ?? 530

  const [displayed, setDisplayed] = createSignal("")
  const [showCursor, setShowCursor] = createSignal(true)

  onMount(() => {
    const texts = () => local.texts.filter(Boolean)
    if (texts().length === 0) return

    let textIndex = 0
    let charIndex = 0
    let deleting = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let blinkId: ReturnType<typeof setInterval> | undefined
    let cancelled = false

    blinkId = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, blinkSpeed())

    const tick = () => {
      if (cancelled) return

      const current = texts()[textIndex] ?? ""

      if (!deleting) {
        charIndex += 1
        setDisplayed(current.slice(0, charIndex))

        if (charIndex >= current.length) {
          timeoutId = setTimeout(() => {
            deleting = true
            tick()
          }, pause())
          return
        }

        timeoutId = setTimeout(tick, typeSpeed())
        return
      }

      charIndex -= 1
      setDisplayed(current.slice(0, Math.max(charIndex, 0)))

      if (charIndex <= 0) {
        deleting = false
        textIndex = (textIndex + 1) % texts().length
        timeoutId = setTimeout(tick, typeSpeed())
        return
      }

      timeoutId = setTimeout(tick, deleteSpeed())
    }

    timeoutId = setTimeout(tick, typeSpeed())

    onCleanup(() => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      if (blinkId !== undefined) clearInterval(blinkId)
    })
  })

  return (
    <span class={local.class} {...rest}>
      {displayed()}
      <span style={{ visibility: showCursor() ? "visible" : "hidden" }} aria-hidden="true">
        {cursor()}
      </span>
    </span>
  )
}
