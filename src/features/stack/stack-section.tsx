import clsx from "clsx"
import { For } from "solid-js"
import { DIM_MEDIA, DimItem, DimList, SectionHeading } from "~/components/ui"
import type { StackItem } from "~/content/types"

export interface StackSectionProps {
  items: StackItem[]
}

export default function StackSection(props: StackSectionProps) {
  return (
    <section>
      <SectionHeading title="Stack" />
      <DimList class="flex flex-wrap gap-2">
        <For each={props.items}>
          {(item) => (
            <DimItem>
              <div class="flex items-center gap-4">
                <img
                  src={item.image}
                  alt={item.label}
                  title={item.label}
                  class={clsx("size-6 object-cover", DIM_MEDIA)}
                />
              </div>
            </DimItem>
          )}
        </For>
      </DimList>
    </section>
  )
}
