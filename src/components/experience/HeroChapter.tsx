// Chapter 01 — Hero. Pinned 200vh scroll on desktop, entrance animation on mobile.
// Act 1 face-off dissolves as the red slash draws through the empty frame in Act 2.
// Act 2 has no title or text — the slash drawing through the empty frame is its sole beat.
// Slash uses CSS rotate on wrapper + GSAP scaleX on inner div to avoid transform conflicts.
import { useRef } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useMediaQuery, useReducedMotion } from '@mantine/hooks'
import { api } from '../../../convex/_generated/api'
import { useStableQuery } from '#/hooks/useStableQuery'
import { derivePressPass } from '#/lib/heroLoader'
import type { HeroLoaderData } from '#/lib/heroLoader'
import { gsap, useGSAP } from '#/lib/gsap'
import classes from './HeroChapter.module.css'

interface HeroChapterProps {
  // Server-loaded seed (issue #25). Used until the live Convex subscriptions
  // resolve, so the first paint never shows loading placeholders.
  initialData: HeroLoaderData
}

export default function HeroChapter({ initialData }: HeroChapterProps) {
  const heroRef = useRef<HTMLElement>(null)
  const silhouetteRef = useRef<HTMLDivElement>(null)
  const slashRef = useRef<HTMLDivElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)
  const pressPassRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const theme = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: calc(${theme.breakpoints.sm} - 0.0625em))`)
  // Loader data seeds the first (server-rendered) paint; once the live Convex
  // subscription resolves (anything but undefined) it takes over, so realtime
  // updates still propagate after hydration.
  const liveFeaturedFighter = useStableQuery(api.fighters.getFeaturedFighter, {})
  const liveNextEvent = useStableQuery(api.events.getNextEvent, {})
  const featuredFighter =
    liveFeaturedFighter === undefined ? initialData.featuredFighter : liveFeaturedFighter
  const nextEvent = liveNextEvent === undefined ? initialData.nextEvent : liveNextEvent

  // null when there is genuinely no upcoming event — the press pass content is
  // simply omitted (never "TBA" placeholders). "TBA" can only appear inside a
  // real bout whose corner is unannounced.
  const pressPass = derivePressPass(nextEvent)

  useGSAP(() => {
    if (prefersReduced) {
      const targets = [slashRef.current]
      if (scrollHintRef.current) targets.push(scrollHintRef.current)
      if (silhouetteRef.current) targets.push(silhouetteRef.current)
      gsap.set(targets, { opacity: 1, x: 0, y: 0, scaleX: 1, yPercent: 0 })
      return
    }

    const bp = theme.breakpoints.sm
    const mm = gsap.matchMedia()

    mm.add(`(min-width: ${bp})`, () => {
      // CSS handles flash-before-JS. gsap.set registers the starting state in GSAP's
      // transform matrix — required for scaleX animation to start from 0, not 1.
      gsap.set(slashRef.current, { scaleX: 0, transformOrigin: 'left center' })

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

      // Act 2 has no title or text — the slash drawing through the now-empty
      // frame is the sole cinematic beat. The silhouette joins the scroll-hint /
      // press-pass fade so the slash cuts through a clean, empty frame.
      tl.to([scrollHintRef.current, pressPassRef.current, silhouetteRef.current], { opacity: 0, duration: 0.15 }, 0)
        .to(slashRef.current, { scaleX: 1, ease: 'power3.inOut' }, 0)
        .to({}, {}, 1)

      return () => {
        tl.scrollTrigger?.kill()
      }
    })

    mm.add(`(max-width: calc(${bp} - 0.0625em))`, () => {
      // Act 2 stacks below Act 1 with no pin. Slash resets scaleX via CSS, so just fade it in.
      gsap.to(slashRef.current, { opacity: 1, duration: 0.8, ease: 'power2.out' })
    })

    return () => mm.revert()
  }, { scope: heroRef, dependencies: [prefersReduced, isMobile], revertOnUpdate: true })

  return (
    <section ref={heroRef} className={classes.hero} aria-label="UFC Fighter Rankings">
      {featuredFighter?.photoUrl && (
        <div ref={silhouetteRef} className={classes.silhouette} aria-hidden="true">
          <img src={featuredFighter.photoUrl} alt="" />
        </div>
      )}
      <div className={classes.slashWrapper}>
        <div ref={slashRef} className={classes.slash} />
      </div>

      {!isMobile && (
        // Outer div always renders so the GSAP timeline target (pressPassRef)
        // exists; the info content is omitted when there is no upcoming event.
        <div ref={pressPassRef} className={classes.pressPass} aria-label="Next UFC event">
          {pressPass && (
            <div className={classes.pressPassInfo}>
              <span className={classes.pressPassLabel}>Next Event</span>
              <span className={classes.pressPassName}>{pressPass.eventName}</span>
              <span className={classes.pressPassMatchup}>{pressPass.matchup}</span>
              <span className={classes.pressPassDate}>
                <span className={classes.pressPassDot} aria-hidden="true" />
                {pressPass.eventDate}
              </span>
            </div>
          )}
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
