import clsx from "clsx"
import { type JSX, splitProps } from "solid-js"

export interface ExternalLinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

/**
 * An outbound link. `target` and `rel` are applied after the caller's props so
 * a new tab can never be opened without `noopener`.
 */
export default function ExternalLink(props: ExternalLinkProps) {
  const [local, rest] = splitProps(props, ["class", "children"])

  return (
    <a
      {...rest}
      class={clsx("!text-foreground", local.class)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {local.children}
    </a>
  )
}
