import { For, Index } from "solid-js"
import { ScrambleText, Typewriter } from "~/components/text"
import { Avatar, ExternalLink } from "~/components/ui"
import type { Profile } from "~/content/types"

export interface IntroProps {
  profile: Profile
}

export default function Intro(props: IntroProps) {
  const previous = () => props.profile.previous

  return (
    <div class="space-y-24">
      <div class="space-y-0">
        <Avatar src={props.profile.avatar} alt={props.profile.name} class="size-10 mb-6" />
        <h1 class="font-body text-foreground">
          <ScrambleText text={props.profile.name} interval={5000} />
        </h1>
        <small class="text-sm font-overline">
          <Typewriter texts={props.profile.roles} />
        </small>
      </div>

      <div class="space-y-4">
        <Index each={props.profile.intro}>{(paragraph) => <p>{paragraph()}</p>}</Index>
        <p>
          Currently working at{" "}
          <ExternalLink href={props.profile.current.href}>
            {props.profile.current.label}
          </ExternalLink>
          .
        </p>
        <p>
          Previously worked at{" "}
          <For each={previous()}>
            {(link, index) => (
              <>
                <ExternalLink href={link.href}>{link.label}</ExternalLink>
                {index() < previous().length - 1 ? ", " : " "}
              </>
            )}
          </For>
          and many others.
        </p>
      </div>
    </div>
  )
}
