import clsx from "clsx"

export interface AvatarProps {
  src: string
  alt: string
  /** Hairline border, for logos that would otherwise bleed into the page. */
  bordered?: boolean
  class?: string
}

export default function Avatar(props: AvatarProps) {
  return (
    <img
      src={props.src}
      alt={props.alt}
      class={clsx("rounded-lg object-cover", props.bordered && "border border-border", props.class)}
    />
  )
}
