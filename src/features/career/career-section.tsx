import clsx from "clsx"
import { For } from "solid-js"
import { Avatar, DIM_MEDIA, DimItem, DimList, SectionHeading } from "~/components/ui"
import type { CareerEntry } from "~/content/types"
import { formatMonthYear } from "~/lib/format-date"

export interface CareerSectionProps {
  entries: CareerEntry[]
}

function periodLabel(entry: CareerEntry): string {
  return entry.current ? "Current" : formatMonthYear(entry.endDate)
}

export default function CareerSection(props: CareerSectionProps) {
  return (
    <section>
      <SectionHeading title="Career" />
      <DimList>
        <For each={props.entries}>
          {(entry) => (
            <DimItem>
              <div class="flex items-center gap-4">
                <Avatar
                  src={entry.image}
                  alt={entry.company}
                  bordered
                  class={clsx("size-10", DIM_MEDIA)}
                />
                <div class="space-y-0.5 w-full">
                  <h3 class="text-foreground">{entry.company}</h3>
                  <div class="flex justify-between gap-2 text-muted">
                    <small class="text-sm">{entry.title}</small>
                    <small class="text-sm">{periodLabel(entry)}</small>
                  </div>
                </div>
              </div>
            </DimItem>
          )}
        </For>
      </DimList>
    </section>
  )
}
