import { createFileRoute } from '@tanstack/react-router'
import MatchupView from '#/components/MatchupView'
import classes from './index.module.css'

export const Route = createFileRoute('/matchup/')({
  component: MatchupPage,
})

function MatchupPage() {
  return (
    <main className={classes.page}>
      <MatchupView />
    </main>
  )
}
