// Root scroll container. Chapters render in order — Hero → Men's → Women's → End state.
import { useRef, useState, useLayoutEffect } from 'react'
import { useWindowScroll } from '@mantine/hooks'
import classes from './ExperienceView.module.css'
import HeroChapter from './HeroChapter'
import DivisionsChapter from './DivisionsChapter'
import type { DivisionsChapterHandle } from './DivisionsChapter'
import ExperienceEndState from './ExperienceEndState'
import BackToTopChevron from './BackToTopChevron'
import ExperienceNav from './ExperienceNav'

export default function ExperienceView() {
  const [scroll] = useWindowScroll()
  const mensRef = useRef<DivisionsChapterHandle>(null)
  const womensRef = useRef<DivisionsChapterHandle>(null)
  const [mensScrollStart, setMensScrollStart] = useState<number | null>(null)
  const [womensScrollStart, setWomensScrollStart] = useState<number | null>(null)

  useLayoutEffect(() => {
    // Runs before paint — prevents router scroll restoration from briefly revealing
    // chapters below the fold before the hero chapter is visible.
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => { history.scrollRestoration = 'auto' }
  }, [])

  return (
    <div className={classes.root}>
      <HeroChapter />
      <DivisionsChapter
        ref={mensRef}
        gender="mens"
        onScrollReady={setMensScrollStart}
      />
      <DivisionsChapter
        ref={womensRef}
        gender="womens"
        onScrollReady={setWomensScrollStart}
      />
      <ExperienceEndState />
      <BackToTopChevron />
      <ExperienceNav
        scrollY={scroll.y}
        mensScrollStart={mensScrollStart}
        womensScrollStart={womensScrollStart}
        onMensDivClick={(i) => mensRef.current?.scrollToDiv(i)}
        onWomensDivClick={(i) => womensRef.current?.scrollToDiv(i)}
      />
    </div>
  )
}
