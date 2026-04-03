// Home route — chrome-free, no header. Full-screen experience.
import { createFileRoute } from '@tanstack/react-router'
import ExperienceView from '#/components/experience/ExperienceView'

export const Route = createFileRoute('/')({
  component: ExperienceView,
})
