import type { Profile } from "./types"

export const profile = {
  name: "Aaron Sananes",
  avatar: "/profile.avif",
  roles: ["Designer", "Developer", "Software Engineer"],
  intro: [
    "A design engineer based in the Canary Islands, Spain.",
    "Focused on building identities and product experiences shaped by curiosity and collaboration. Obsessed with what's essential and how it can be expressed with honesty and clarity.",
    "Co-Founder of Conflux and other startups.",
  ],
  current: { label: "Bask Health", href: "https://www.baskhealth.com" },
  previous: [
    { label: "TB Auctions", href: "https://www.tbauctions.com" },
    { label: "Pixel Union", href: "https://www.pixelunion.net" },
    { label: "Adaptia", href: "https://www.adaptia.com" },
    { label: "Anova", href: "https://www.anova.com" },
  ],
} satisfies Profile
