import { For } from "solid-js"
import ScrambleText from "~/components/scramble-text"
import Typewriter from "~/components/typewriter"
import UnicornStudio from "~/integrations/unicorn-studio"

const CAREER = [
  {
    company: "Bask Health",
    title: "Designer",
    image: "https://github.com/bask-health.png",
    startDate: "2025-08-01",
    endDate: null,
    current: true,
    description: "Designed and built the Bask Health platform.",
  },
  {
    company: "TB Auctions",
    title: "Designer",
    image: "/tbauctions.avif",
    startDate: "2020-01-01",
    endDate: "2022-01-01",
    description: "Designed and built the TB Auctions platform.",
  },
  {
    company: "Pixel Union",
    title: "Designer",
    image: "/pixelunion.avif",
    startDate: "2022-01-01",
    endDate: "2024-01-01",
    description: "Designed and built the Pixel Union platform.",
  },
  {
    company: "Anova",
    title: "Designer",
    image: "/anova.avif",
    startDate: "2022-01-01",
    endDate: "2024-01-01",
    description: "Designed and built the Anova platform.",
  },
]

export default function Home() {
  return (
    <main class="text-subdued text-sm w-full lg:grid lg:grid-cols-[1fr_1fr] max-w-7xl mx-auto">
      <div class="mx-auto">
        <div class="relative z-10 p-12 mx-auto max-w-105 space-y-24 md:m-24 md:p-0 w-full">
          <div class="space-y-0">
            <img
              src="/profile.avif"
              alt="Aaron Sananes"
              class="rounded-lg size-10 object-cover mb-6"
            />
            <h2 class="font-body text-foreground">
              <ScrambleText text="Aaron Sananes" interval={5000} />
            </h2>
            <small class="text-sm font-overline">
              <Typewriter texts={["Designer", "Developer", "Software Engineer"]} />
            </small>
          </div>
          <div class="space-y-4">
            <p>A design engineer based in the Canary Islands, Spain.</p>
            <p>
              Focused on building identities and product experiences shaped by curiosity and
              collaboration. Obsessed with what's essential and how it can be expressed with honesty
              and clarity.
            </p>
            <p>Co-Founder of Conflux and other startups.</p>
            <p>
              {" "}
              Currently working at{" "}
              <a
                href="https://www.baskhealth.com"
                class="!text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bask Health
              </a>
              .
            </p>
            <p>
              Previously worked at{" "}
              <a
                href="https://www.tbauctions.com"
                class="!text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                TB Auctions
              </a>
              ,{" "}
              <a
                href="https://www.pixelunion.net"
                class="!text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pixel Union
              </a>
              ,{" "}
              <a
                href="https://www.adaptia.com"
                class="!text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Adaptia
              </a>
              ,{" "}
              <a
                href="https://www.anova.com"
                class="!text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anova
              </a>{" "}
              and many others.
            </p>
          </div>

          <section>
            <h2 class="font-overline py-2">
              <ScrambleText text="C" interval={4000} scrambleSpeed={300} cyclesPerChar={5} />
              areer
            </h2>
            <ul class="group/career">
              <For each={CAREER}>
                {(item) => (
                  <li class="py-2 opacity-100 group/item transition-opacity duration-200 ease-in-out group-hover/career:opacity-50 hover:!opacity-100">
                    <div class="flex items-center gap-4 ">
                      <img
                        src={item.image}
                        alt={item.company}
                        class="border border-border rounded-lg size-10 object-cover saturate-0 group-hover/item:saturate-100 transition-all duration-200 ease-in-out"
                      />
                      <div class="space-y-0.5 w-full">
                        <h2 class="text-foreground">{item.company}</h2>
                        <div class="flex justify-between gap-2 text-muted">
                          <small class="text-sm">{item.title}</small>
                          <small class="text-sm">
                            {item.current
                              ? "Current"
                              : item.endDate
                                ? new Date(item.endDate).toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  })
                                : ""}
                          </small>
                        </div>
                      </div>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>

          <section>
            <h2 class="font-overline py-2 flex justify-between">
              <span>
                <ScrambleText text="C" interval={4000} scrambleSpeed={300} cyclesPerChar={5} />
                ase studies
              </span>
              <a href="#" class="text-sm text-muted">
                View all
              </a>
            </h2>
            <ul class="group/career grid grid-cols-2 gap-4">
              <For
                each={[
                  { label: "TB Auctions", image: "/tbauctions-case-study.avif" },
                  { label: "TB Auctions", image: "/tbauctions-case-study.avif" },
                  { label: "TB Auctions", image: "/tbauctions-case-study.avif" },
                  { label: "TB Auctions", image: "/tbauctions-case-study.avif" },
                ]}
              >
                {(item) => (
                  <li class="py-2 opacity-100 group/item transition-opacity duration-200 ease-in-out group-hover/career:opacity-50 hover:!opacity-100">
                    <div class="flex flex-col gap-2">
                      <img
                        src={item.image}
                        alt={item.label}
                        class="w-full h-auto rounded-lg object-cover saturate-0 group-hover/item:saturate-100 transition-all duration-200 ease-in-out"
                      />
                      <div class="flex justify-between">
                        <h2 class="text-foreground">{item.label}</h2>
                        <p class="text-muted text-sm">2025</p>
                      </div>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
          <section>
            <h2 class="font-overline py-2">
              <ScrambleText text="S" interval={4000} scrambleSpeed={300} cyclesPerChar={5} />
              tack
            </h2>
            <ul class="group/career flex flex-wrap gap-2">
              <For
                each={[
                  { label: "Figma", image: "/figma.avif" },
                  { label: "Photos", image: "/photos.avif" },
                  { label: "Claude", image: "/claude.avif" },
                  { label: "Zed", image: "/zed.avif" },
                  { label: "Mail", image: "/mail.avif" },
                  { label: "Spotify", image: "/spotify.avif" },
                  { label: "Slack", image: "/slack.avif" },
                ]}
              >
                {(item) => (
                  <li class="py-2 opacity-100 group/item transition-opacity duration-200 ease-in-out group-hover/career:opacity-50 hover:!opacity-100">
                    <div class="flex items-center gap-4 ">
                      <img
                        src={item.image}
                        alt={item.label}
                        class="size-6 object-cover saturate-0 group-hover/item:saturate-100 transition-all duration-200 ease-in-out"
                      />
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </div>
      </div>
      <aside class="sticky top-0 -z-10 hidden h-screen w-full items-center justify-center lg:flex mix-blend-multiply">
        <UnicornStudio projectId="l1FpXfL6flfJbjbReoVS" width="100%" height="100%" />
      </aside>
    </main>
  )
}
