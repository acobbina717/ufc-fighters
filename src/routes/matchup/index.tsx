import { createFileRoute } from '@tanstack/react-router'
import MatchupView from '#/components/MatchupView'
import { PageShell, Section } from '#/components/PageShell'

export const Route = createFileRoute('/matchup/')({
  component: MatchupPage,
})

function MatchupPage() {
  return (
    <PageShell>
      {/* MatchupView is a full-bleed split-screen stage: full container,
          no rhythm. The shell's full/none section grows to fill the viewport
          (flex: 1 0 auto) giving MatchupView a definite height to fill. */}
      <Section container="full" rhythm="none">
        <MatchupView />
      </Section>
    </PageShell>
  )
}
