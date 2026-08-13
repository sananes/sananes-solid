import clsx from "clsx"
import { For } from "solid-js"
import { DIM_MEDIA, DimItem, DimList, SectionHeading } from "~/components/ui"
import type { CaseStudy } from "~/content/types"

export interface CaseStudiesSectionProps {
  studies: CaseStudy[]
  /** Target of the "View all" link. Omitted while there is no index page. */
  viewAllHref?: string
}

export default function CaseStudiesSection(props: CaseStudiesSectionProps) {
  return (
    <section>
      <SectionHeading
        title="Case studies"
        action={
          props.viewAllHref ? (
            <a href={props.viewAllHref} class="text-sm text-muted">
              View all
            </a>
          ) : undefined
        }
      />
      <DimList class="grid grid-cols-2 gap-4">
        <For each={props.studies}>
          {(study) => (
            <DimItem>
              <div class="flex flex-col gap-2">
                <img
                  src={study.image}
                  alt={study.label}
                  class={clsx("w-full h-auto rounded-lg object-cover", DIM_MEDIA)}
                />
                <div class="flex justify-between">
                  <h3 class="text-foreground">{study.label}</h3>
                  <p class="text-muted text-sm">{study.year}</p>
                </div>
              </div>
            </DimItem>
          )}
        </For>
      </DimList>
    </section>
  )
}
