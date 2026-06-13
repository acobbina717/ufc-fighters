// Home route — chrome-free, no header. Full-screen experience.
// The loader runs server-side during SSR (issue #25): it fetches the next
// event + featured fighter over the Convex HTTP client so the first painted
// HTML already contains real names/date/venue — no "TBA" loading flash.
import { createFileRoute } from '@tanstack/react-router'
import ExperienceView from '#/components/experience/ExperienceView'
import { loadHeroData } from '#/lib/heroLoader'

export const Route = createFileRoute('/')({
  loader: () => loadHeroData(),
  component: Home,
})

function Home() {
  const heroData = Route.useLoaderData()
  return <ExperienceView heroData={heroData} />
}
