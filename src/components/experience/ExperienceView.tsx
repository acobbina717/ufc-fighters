// Root scroll container. Hero → Card (unpinned ledger, #30) → Grid (owns its
// toggle header) → End state.
// Color-scheme switching lives in the site-wide Floating Dock (ADR 0007) —
// the former standalone Sun/Moon toggle here was absorbed by it.
import { useLayoutEffect } from 'react'
import type { HeroLoaderData } from '#/lib/heroLoader'
import classes from './ExperienceView.module.css'
import HeroChapter from './HeroChapter'
import CardChapter from './CardChapter'
import WeightClassGrid from './WeightClassGrid'
import ExperienceEndState from './ExperienceEndState'
import BackToTopChevron from './BackToTopChevron'

interface ExperienceViewProps {
  // Server-loaded hero seed from the route loader (issue #25).
  heroData: HeroLoaderData
}

export default function ExperienceView({ heroData }: ExperienceViewProps) {
  useLayoutEffect(() => {
    // Runs before paint — prevents router scroll restoration from briefly revealing
    // chapters below the fold before the hero chapter is visible.
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => { history.scrollRestoration = 'auto' }
  }, [])

  return (
    <div className={classes.root}>
      <HeroChapter initialData={heroData} />
      <CardChapter />
      <WeightClassGrid />
      <ExperienceEndState />
      <BackToTopChevron />
    </div>
  )
}
