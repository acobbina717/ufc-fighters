import { createFileRoute } from '@tanstack/react-router'
import DivisionSplitView from '#/components/DivisionSplitView'
import classes from './index.module.css'

export const Route = createFileRoute('/_app/fighters/')({
  component: FightersPage,
})

function FightersPage() {
  return (
    <main className={classes.page}>
      <DivisionSplitView />
    </main>
  )
}
