import clsx from "clsx"
import { children, type JSX } from "solid-js"
import { ScrambleText } from "~/components/text"

/**
 * A section title whose first letter scrambles on a loop. Only the initial is
 * scrambled — cycling the whole word reflows the line and pulls the eye away
 * from the content underneath.
 */
export interface SectionHeadingProps {
  title: string
  /** Rendered opposite the title, e.g. a "View all" link. */
  action?: JSX.Element
  class?: string
}

export default function SectionHeading(props: SectionHeadingProps) {
  const initial = () => props.title.slice(0, 1)
  const remainder = () => props.title.slice(1)
  // Resolved once: reading a JSX prop twice mounts it twice. See two-column.tsx.
  const action = children(() => props.action)

  return (
    <h2 class={clsx("font-overline py-2", action() && "flex justify-between", props.class)}>
      <span>
        <ScrambleText text={initial()} interval={4000} scrambleSpeed={300} cyclesPerChar={5} />
        {remainder()}
      </span>
      {action()}
    </h2>
  )
}
