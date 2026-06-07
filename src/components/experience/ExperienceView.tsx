// Root scroll container. Hero → Toggle → Grid → End state.
import { useLayoutEffect, useState } from 'react'
import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core'
import { Sun, Moon } from 'lucide-react'
import classes from './ExperienceView.module.css'
import HeroChapter from './HeroChapter'
import DivisionToggle, { type Gender } from './DivisionToggle'
import WeightClassGrid from './WeightClassGrid'
import ExperienceEndState from './ExperienceEndState'
import BackToTopChevron from './BackToTopChevron'

export default function ExperienceView() {
  const [gender, setGender] = useState<Gender>('mens')
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true })

  useLayoutEffect(() => {
    // Runs before paint — prevents router scroll restoration from briefly revealing
    // chapters below the fold before the hero chapter is visible.
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => { history.scrollRestoration = 'auto' }
  }, [])

  return (
    <div className={classes.root}>
      {/* Floating Theme Toggle (Chrome-free version) */}
      <ActionIcon
        onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
        variant="subtle"
        size="xl"
        radius="xl"
        aria-label="Toggle color scheme"
        className={classes.themeToggle}
      >
        {computedColorScheme === 'light' ? (
          <Moon strokeWidth={1.5} size={24} />
        ) : (
          <Sun strokeWidth={1.5} size={24} />
        )}
      </ActionIcon>

      <HeroChapter />
      <DivisionToggle value={gender} onChange={setGender} />
      <WeightClassGrid gender={gender} />
      <ExperienceEndState />
      <BackToTopChevron />
    </div>
  )
}
