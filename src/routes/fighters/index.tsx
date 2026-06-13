import { createFileRoute } from '@tanstack/react-router'
import DivisionSplitView from '#/components/DivisionSplitView'
import { PageShell, Section } from '#/components/PageShell'

export const Route = createFileRoute('/fighters/')({
  component: FightersPage,
})

function FightersPage() {
  return (
    <PageShell>
      {/* DivisionSplitView is a full-bleed GSAP-pinned stage: full container,
          no rhythm. The shell's full/none section is layout-neutral so the
          pinned scroll is unaffected. */}
      <Section container="full" rhythm="none">
        <DivisionSplitView />
      </Section>
    </PageShell>
  )
}
