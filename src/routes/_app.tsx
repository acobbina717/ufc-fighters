// Pathless layout route — wraps /fighters and /matchup with the Header.
// _app prefix means it doesn't add a URL segment.
// / (home) sits outside this layout intentionally — it's the chrome-free experience.
import { createFileRoute, Outlet } from '@tanstack/react-router'
import Header from '#/components/Header'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
