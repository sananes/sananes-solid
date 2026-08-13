import { TwoColumn } from "~/components/layout"
import { career, caseStudies, profile, stack } from "~/content"
import { CareerSection } from "~/features/career"
import { CaseStudiesSection } from "~/features/case-studies"
import { Intro } from "~/features/profile"
import { StackSection } from "~/features/stack"
import UnicornStudio from "~/integrations/unicorn-studio"

const SCENE_PROJECT_ID = "l1FpXfL6flfJbjbReoVS"

export default function Home() {
  return (
    <TwoColumn aside={<UnicornStudio projectId={SCENE_PROJECT_ID} width="100%" height="100%" />}>
      <Intro profile={profile} />
      <CareerSection entries={career} />
      <CaseStudiesSection studies={caseStudies} />
      <StackSection items={stack} />
    </TwoColumn>
  )
}
