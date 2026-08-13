/**
 * Shape of everything under `~/content`.
 *
 * These describe the site's content, not its markup: a field belongs here when
 * changing it is an editorial decision. Prose structure — which sentence a link
 * sits in, how a list is punctuated — stays in the feature that renders it.
 */

export interface ContentLink {
  label: string
  href: string
}

export interface Profile {
  name: string
  /** Path under `public/`. */
  avatar: string
  /** Cycled by the typewriter under the name. */
  roles: string[]
  /** Standalone paragraphs, rendered in order above the employment sentences. */
  intro: string[]
  current: ContentLink
  previous: ContentLink[]
}

export interface CareerEntry {
  company: string
  title: string
  /** Path under `public/`, or an absolute URL for a remote avatar. */
  image: string
  /** ISO date. */
  startDate: string
  /** ISO date, or `null` while the role is ongoing. */
  endDate: string | null
  /** Renders as "Current" instead of an end date. */
  current?: boolean
  description: string
}

export interface CaseStudy {
  label: string
  image: string
  year: string
}

export interface StackItem {
  label: string
  image: string
}
