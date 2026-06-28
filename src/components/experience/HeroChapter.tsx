// Chapter 01 — Hero. The "Face-off" poster (issue #60, ADR 0012).
//
// Two headliners of the next Event, bottom-anchored in opposite corners with
// mirrored masks fading toward the centre, a stacked centre text block
// (Fighter A name / VS / Fighter B name), the next-event Press Pass strip
// top-centre and a centred scroll hint along the bottom. When the opponent is
// TBA / has no photo, it degrades to a single-fighter composition with the VS
// omitted. No slash anywhere (ADR 0012).
//
// Issue #27  — data-hero-pin attribute lets FloatingDock watch this section.
// Issue #34  — The Parting: scroll-scrubbed fighter translation + VS dissolve +
//              motion-only slash draw-through between Act 1 and Act 2.
// Issue #35  — Mobile / reduced-motion: ScrollTrigger pin skipped; Act 1 + Act 2
//              stack in normal document flow.
import { forwardRef, useRef } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useMediaQuery, useReducedMotion } from '@mantine/hooks'
import { Link } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { useStableQuery } from '#/hooks/useStableQuery'
import { cornerName, derivePressPass } from '#/lib/heroLoader'
import type { HeroLoaderData, NextEventData } from '#/lib/heroLoader'
import { MENS_DIVISIONS, WOMENS_DIVISIONS } from '#/lib/weightClasses'
import { gsap, useGSAP } from '#/lib/gsap'
import classes from './HeroChapter.module.css'

interface HeroChapterProps {
  initialData: HeroLoaderData
}

type Corner = NonNullable<NextEventData>['fighterA']

function isRenderable(fighter: Corner): boolean {
  return Boolean(fighter?.photoUrl)
}

function isChampion(fighter: Corner): boolean {
  return fighter?.ranking === 0
}

interface CornerViewProps {
  fighter: Corner
  side: 'left' | 'right'
  showName: boolean
}

// forwardRef so HeroChapter can attach GSAP refs to the corner root divs
// for the scrub-linked parting animation (issue #34).
const CornerView = forwardRef<HTMLDivElement, CornerViewProps>(
  function CornerView({ fighter, side, showName }, ref) {
    const renderable = isRenderable(fighter)
    const sideClass = side === 'left' ? classes.cornerLeft : classes.cornerRight
    return (
      <div ref={ref} className={`${classes.corner} ${sideClass}`} aria-hidden="true">
        <div className={classes.photoSlot}>
          {renderable ? (
            <img className={classes.photo} src={fighter!.photoUrl} alt="" />
          ) : (
            <div className={classes.fallback} />
          )}
        </div>
        {showName && (
          <div className={classes.caption}>
            {isChampion(fighter) && (
              <span className={classes.champBadge} title="Champion">C</span>
            )}
            <span className={classes.cornerName}>{cornerName(fighter)}</span>
          </div>
        )}
      </div>
    )
  }
)

// Act 2 mobile teaser — surfaces the weight-class categories that desktop users
// see after scrolling through the pinned hero. Shown only on mobile/reduced-motion.
function MobileAct2() {
  const allMens = MENS_DIVISIONS.slice().reverse()
  const allWomens = WOMENS_DIVISIONS.slice().reverse()

  return (
    <div className={classes.mobileAct2} aria-label="Weight class divisions">
      <div className={classes.act2Eyebrow}>Explore Divisions</div>
      <div className={classes.act2Columns}>
        <div className={classes.act2Group}>
          <div className={classes.act2GroupLabel}>Men&apos;s</div>
          <ul className={classes.act2List} role="list">
            {allMens.map((div) => {
              const slug = div.key.replace(/^mens-/, '')
              return (
                <li key={div.key}>
                  <Link
                    to="/divisions/$gender/$weightClass"
                    params={{ gender: 'mens', weightClass: slug }}
                    className={classes.act2Link}
                  >
                    <span className={classes.act2Abbr}>{div.abbr}</span>
                    <span className={classes.act2Label}>{div.shortLabel}</span>
                    <span className={classes.act2Weight}>{div.weightLimit}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className={classes.act2Group}>
          <div className={classes.act2GroupLabel}>Women&apos;s</div>
          <ul className={classes.act2List} role="list">
            {allWomens.map((div) => {
              const slug = div.key.replace(/^womens-/, '')
              return (
                <li key={div.key}>
                  <Link
                    to="/divisions/$gender/$weightClass"
                    params={{ gender: 'womens', weightClass: slug }}
                    className={classes.act2Link}
                  >
                    <span className={classes.act2Abbr}>{div.abbr}</span>
                    <span className={classes.act2Label}>{div.shortLabel}</span>
                    <span className={classes.act2Weight}>{div.weightLimit}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className={classes.act2Divider} aria-hidden="true" />
    </div>
  )
}

export default function HeroChapter({ initialData }: HeroChapterProps) {
  const heroRef = useRef<HTMLElement>(null)
  const facestageRef = useRef<HTMLDivElement>(null)
  const vsRef = useRef<HTMLDivElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)
  const pressPassRef = useRef<HTMLDivElement>(null)
  const cornerLeftRef = useRef<HTMLDivElement>(null)
  const cornerRightRef = useRef<HTMLDivElement>(null)
  const slashRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const theme = useMantineTheme()
  // Raw 47.99em matches mobile below Mantine's sm breakpoint (48em).
  // Defaults to false during SSR to avoid hydration mismatches.
  const isMobile = useMediaQuery('(max-width: 47.99em)') ?? false

  // Stacked layout on mobile OR when the user prefers reduced motion.
  const isStacked = isMobile || Boolean(prefersReduced)

  const liveNextEvent = useStableQuery(api.events.getNextEvent, {})
  const nextEvent = liveNextEvent === undefined ? initialData.nextEvent : liveNextEvent

  const fighterA = nextEvent?.fighterA ?? null
  const fighterB = nextEvent?.fighterB ?? null

  const isFaceoff = isRenderable(fighterA) && isRenderable(fighterB)
  const pressPass = derivePressPass(nextEvent)

  useGSAP(() => {
    if (prefersReduced) {
      const targets: HTMLElement[] = []
      if (vsRef.current) targets.push(vsRef.current)
      if (scrollHintRef.current) targets.push(scrollHintRef.current)
      if (pressPassRef.current) targets.push(pressPassRef.current)
      if (facestageRef.current) targets.push(facestageRef.current)
      if (targets.length) gsap.set(targets, { opacity: 1, x: 0, y: 0, yPercent: 0 })
      return
    }

    const bp = theme.breakpoints.sm
    const mm = gsap.matchMedia()

    mm.add(`(min-width: ${bp})`, () => {
      // Extended pin: covers the chrome fade beat AND the parting beat (#34).
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 0.8,
          fastScrollEnd: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // Beat 1 (0 → 0.2): Chrome fade
      tl.to(
        [scrollHintRef.current, pressPassRef.current],
        { opacity: 0, duration: 0.2, ease: 'power1.in' },
        0
      )

      // Beat 2 (0.2 → 0.7): Fighter parting + VS/name stack dissolve
      if (isFaceoff) {
        tl.to(cornerLeftRef.current, { xPercent: -100, duration: 0.5, ease: 'power2.inOut' }, 0.2)
        tl.to(cornerRightRef.current, { xPercent: 100, duration: 0.5, ease: 'power2.inOut' }, 0.2)
        tl.to(vsRef.current, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.2)

        // Beat 3 (0.55 → 0.9): Motion-only slash wipe — draws in then erases
        tl.fromTo(
          slashRef.current,
          { scaleX: 0, opacity: 1 },
          { scaleX: 1, duration: 0.2, ease: 'power3.out' },
          0.55
        )
        tl.to(
          slashRef.current,
          { scaleX: 0, duration: 0.15, ease: 'power3.in', transformOrigin: 'right center' },
          0.75
        )
      }

      return () => {
        tl.scrollTrigger?.kill()
        gsap.set([scrollHintRef.current, pressPassRef.current], { clearProps: 'opacity' })
        if (isFaceoff) {
          gsap.set([cornerLeftRef.current, cornerRightRef.current], { clearProps: 'xPercent' })
          gsap.set(vsRef.current, { clearProps: 'opacity' })
          gsap.set(slashRef.current, { clearProps: 'scaleX,opacity' })
        }
      }
    })

    return () => mm.revert()
  }, { scope: heroRef, dependencies: [prefersReduced, isMobile, isFaceoff], revertOnUpdate: true })

  return (
    <section
      ref={heroRef}
      className={`${classes.hero} ${isStacked ? classes.heroStacked : ''}`}
      aria-label="UFC Fighter Rankings"
      data-hero-pin
    >
      {!isStacked && (
        <div ref={pressPassRef} className={classes.pressPass} aria-label="Next UFC event">
          {pressPass && (
            <div className={classes.pressPassInfo}>
              <span className={classes.pressPassLabel}>Next Event</span>
              <span className={classes.pressPassName}>{pressPass.eventName}</span>
              <span className={classes.pressPassDate}>
                <span className={classes.pressPassDot} aria-hidden="true" />
                {pressPass.eventDate}
              </span>
            </div>
          )}
        </div>
      )}

      <div
        ref={facestageRef}
        className={`${classes.facestage} ${isStacked ? classes.facestageStacked : ''}`}
      >
        {isFaceoff ? (
          <>
            <CornerView ref={cornerLeftRef} fighter={fighterA} side="left" showName={false} />
            {/* Stacked centre: Fighter A name → VS → Fighter B name */}
            <div ref={vsRef} className={classes.vsStack} aria-hidden="true">
              <span className={classes.cornerName}>
                {isChampion(fighterA) && <span className={classes.champBadge}>C</span>}
                {cornerName(fighterA)}
              </span>
              <span className={classes.vs}>VS</span>
              <span className={classes.cornerName}>
                {isChampion(fighterB) && <span className={classes.champBadge}>C</span>}
                {cornerName(fighterB)}
              </span>
            </div>
            <CornerView ref={cornerRightRef} fighter={fighterB} side="right" showName={false} />
          </>
        ) : (
          <CornerView fighter={fighterA} side="right" showName={isRenderable(fighterA)} />
        )}
      </div>

      {/* Motion-only slash wipe (#34). Invisible at rest (scaleX: 0); only
          appears during the scroll-scrubbed Act 1→Act 2 transition. */}
      {isFaceoff && !isStacked && (
        <div ref={slashRef} className={classes.slashWipe} aria-hidden="true" />
      )}

      {!isStacked && (
        <div ref={scrollHintRef} className={classes.scrollHint} aria-hidden="true">
          <span className={classes.scrollLabel}>SCROLL</span>
          <div className={classes.scrollLine} />
        </div>
      )}

      {/* Act 2 — stacked below Act 1 on mobile/reduced-motion only. */}
      {isStacked && <MobileAct2 />}
    </section>
  )
}
