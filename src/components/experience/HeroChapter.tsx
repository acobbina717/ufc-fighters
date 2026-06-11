// Chapter 01 — Hero. Pinned 200vh scroll on desktop, entrance animation on mobile.
// Red slash cuts in first, then title chars reveal via SplitText mask, then eyebrow/subtitle/hint.
// Slash uses CSS rotate on wrapper + GSAP scaleX on inner div to avoid transform conflicts.
import { useRef } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useMediaQuery, useReducedMotion } from '@mantine/hooks'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { useStableQuery } from '#/hooks/useStableQuery'
import { formatEventDate } from '#/lib/formatEventDate'
import { gsap, SplitText, useGSAP } from '#/lib/gsap'
import classes from './HeroChapter.module.css'

// Last name (final whitespace-delimited token), uppercased; "TBA" when absent.
function cornerName(fighter: Doc<'fighters'> | null | undefined): string {
  const last = fighter?.name?.trim().split(/\s+/).pop()
  return last ? last.toUpperCase() : 'TBA'
}

export default function HeroChapter() {
  const heroRef = useRef<HTMLElement>(null)
  const slashRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLParagraphElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)
  const pressPassRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const theme = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: calc(${theme.breakpoints.sm} - 0.0625em))`)
  const featuredFighter = useStableQuery(api.fighters.getFeaturedFighter, {})
  const nextEvent = useStableQuery(api.events.getNextEvent, {})

  // Defaults keep the press pass populated while the query loads or returns null,
  // so the GSAP timeline target (pressPassRef) always has content to fade.
  const eventName = nextEvent?.name ?? 'TBA'
  const matchup = nextEvent
    ? `${cornerName(nextEvent.fighterA)} vs ${cornerName(nextEvent.fighterB)}`
    : 'TO BE ANNOUNCED'
  const eventDate = nextEvent ? formatEventDate(nextEvent.date) : 'DATE TBA'

  useGSAP(() => {
    if (prefersReduced) {
      const targets = [slashRef.current, eyebrowRef.current, titleRef.current, subtitleRef.current]
      if (scrollHintRef.current) targets.push(scrollHintRef.current)
      gsap.set(targets, { opacity: 1, x: 0, y: 0, scaleX: 1, yPercent: 0 })
      return
    }

    const bp = theme.breakpoints.sm
    const mm = gsap.matchMedia()

    mm.add(`(min-width: ${bp})`, () => {
      const split = SplitText.create(titleRef.current, { type: 'chars', mask: 'chars' })

      // CSS handles flash-before-JS. gsap.set registers the starting state in GSAP's
      // transform matrix — required for scaleX animation to start from 0, not 1.
      gsap.set(slashRef.current, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(eyebrowRef.current, { x: -28 })
      gsap.set(subtitleRef.current, { y: 14 })
      // Title container: visible so chars (masked) can animate in
      gsap.set(titleRef.current, { opacity: 1 })
      gsap.set(split.chars, { yPercent: 115 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.8,
          fastScrollEnd: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      tl.to([scrollHintRef.current, pressPassRef.current], { opacity: 0, duration: 0.15 }, 0)
        .to(slashRef.current, { scaleX: 1, ease: 'power3.inOut' }, 0)
        .to(split.chars, { yPercent: 0, stagger: 0.04, ease: 'expo.out' }, 0.2)
        .to(eyebrowRef.current, { opacity: 1, x: 0, ease: 'power2.out' }, 0.45)
        .to(subtitleRef.current, { opacity: 1, y: 0 }, 0.55)
        .to({}, {}, 1)

      return () => {
        split.revert()
        tl.scrollTrigger?.kill()
      }
    })

    mm.add(`(max-width: calc(${bp} - 0.0625em))`, () => {
      // CSS handles opacity: 0 for all text. Slash resets scaleX via CSS, so just fade it in.
      // Set y offset for entrance animation on text elements.
      gsap.set([eyebrowRef.current, titleRef.current, subtitleRef.current], { y: 20 })

      gsap.to(slashRef.current, { opacity: 1, duration: 0.8, ease: 'power2.out' })
      gsap.to(
        [eyebrowRef.current, titleRef.current, subtitleRef.current],
        { opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: 'power2.out' },
      )
    })

    return () => mm.revert()
  }, { scope: heroRef, dependencies: [prefersReduced, isMobile], revertOnUpdate: true })

  return (
    <section ref={heroRef} className={classes.hero} aria-label="UFC Fighter Rankings">
      {featuredFighter?.photoUrl && (
        <div className={classes.silhouette} aria-hidden="true">
          <img src={featuredFighter.photoUrl} alt="" />
        </div>
      )}
      <div className={classes.slashWrapper}>
        <div ref={slashRef} className={classes.slash} />
      </div>

      <div className={classes.content}>
        <p ref={eyebrowRef} className={classes.eyebrow}>UFC · FIGHTER RANKINGS</p>
        <h1 ref={titleRef} className={classes.title}>
          THE<br />RANKINGS
        </h1>
        <p ref={subtitleRef} className={classes.subtitle}>Men's · Women's · All Divisions</p>
      </div>

      {!isMobile && (
        <div ref={pressPassRef} className={classes.pressPass} aria-label="Next UFC event">
          <div className={classes.pressPassInfo}>
            <span className={classes.pressPassLabel}>Next Event</span>
            <span className={classes.pressPassName}>{eventName}</span>
            <span className={classes.pressPassMatchup}>{matchup}</span>
            <span className={classes.pressPassDate}>
              <span className={classes.pressPassDot} aria-hidden="true" />
              {eventDate}
            </span>
          </div>
        </div>
      )}

      {!isMobile && (
        <div ref={scrollHintRef} className={classes.scrollHint} aria-hidden="true">
          <span className={classes.scrollLabel}>SCROLL</span>
          <div className={classes.scrollLine} />
        </div>
      )}
    </section>
  )
}
