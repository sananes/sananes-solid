import clsx from "clsx"
import type { JSX } from "solid-js"

/**
 * A list that dims every row except the one under the cursor.
 *
 * The effect needs two named Tailwind groups: the list dims all of its items on
 * its own hover, and each item lifts its own opacity back. Both class strings
 * live here so the pair can never drift apart, and `DIM_MEDIA` lets an image
 * inside a row desaturate on the same hover.
 */
const LIST = "group/dim"
const ITEM =
  "group/dim-item py-2 opacity-100 transition-opacity duration-200 ease-in-out group-hover/dim:opacity-50 hover:!opacity-100"

/** Greyscale until its `DimItem` is hovered. */
export const DIM_MEDIA =
  "saturate-0 transition-all duration-200 ease-in-out group-hover/dim-item:saturate-100"

export interface DimListProps {
  children: JSX.Element
  class?: string
}

export function DimList(props: DimListProps) {
  return <ul class={clsx(LIST, props.class)}>{props.children}</ul>
}

export interface DimItemProps {
  children: JSX.Element
  class?: string
}

export function DimItem(props: DimItemProps) {
  return <li class={clsx(ITEM, props.class)}>{props.children}</li>
}
