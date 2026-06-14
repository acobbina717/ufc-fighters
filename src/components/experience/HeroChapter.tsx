// Chapter 01 — Hero. The "Face-off" poster (issue #60, ADR 0012).
//
// Two headliners of the next Event, bottom-anchored in opposite corners with
// mirrored masks fading toward the centre, a central red VS between them, a
// gold champion "C" badge beside any titleholder's name, the next-event Press
// Pass strip top-centre and a centred scroll hint along the bottom. When the opponent is
// TBA / has no photo, it degrades to a single-fighter composition with the VS
// omitted. No slash anywhere (ADR 0012). The central VS is a static mark — no
// interaction scales a raster (memory/no_fullscreen_flip_transition.md).
import { useRef } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useMediaQuery, useReducedMotion } from '@mantine/hooks'
import { api } from '../../../convex/_generated/api'
import { useStableQuery } from '#/hooks/useStableQuery'
import { cornerName, derivePressPass } from '#/lib/heroLoader'
import type { HeroLoaderData, NextEventData } from '#/lib/heroLoader'
import { gsap, useGSAP } from '#/lib/gsap'
import classes from './HeroChapter.module.css'

interface HeroChapterProps {
  // Server-loaded seed (issue #25). Used until the live Convex subscription
  // resolves, so the first paint never shows loading placeholders.
  initialData: HeroLoaderData
}

type Corner = NonNullable<NextEventData>['fighterA']

// A corner is "renderable" as a real fighter when it carries a photo. A corner
// fighter with no photo, or a genuinely unannounced (null) corner, is treated as
// TBA — it collapses the Face-off into the single-fighter fallback (no VS).
function isRenderable(fighter: Corner): boolean {
  return Boolean(fighter?.photoUrl)
}

// Champion when the fighter holds their division (ranking 0). gold-5 "C" badge
// is reserved for titleholders only.
function isChampion(fighter: Corner): boolean {
  return fighter?.ranking === 0
}

interface CornerViewProps {
  fighter: Corner
  side: 'left' | 'right'
  showName: boolean
}

function CornerView({ fighter, side, showName }: CornerViewProps) {
  const renderable = isRenderable(fighter)
  const sideClass = side === 'left' ? classes.cornerLeft : classes.cornerRight
  return (
    <div className={`${classes.corner} ${sideClass}`} aria-hidden="true">
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
            <span className={classes.champBadge} title="Champion">
              C
            </span>
          )}
          <span className={classes.cornerName}>{cornerName(fighter)}</span>
        </div>
      )}
    </div>
  )
}

export default function HeroChapter({ initialData }: HeroChapterProps) {
  const heroRef = useRef<HTMLElement>(null)
  const facestageRef = useRef<HTMLDivElement>(null)
  const vsRef = useRef<HTMLDivElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)
  const pressPassRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const theme = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: calc(${theme.breakpoints.sm} - 0.0625em))`)

  // Loader data seeds the first (server-rendered) paint; once the live Convex
  // subscription resolves (anything but undefined) it takes over, so realtime
  // updates still propagate after hydration. getNextEvent already joins the
  // main bout with BOTH full fighter docs (name, photoUrl, ranking) — the same
  // query THE CARD's press pass uses — so no new Convex function is needed for
  // the two-headliner Face-off.
  const liveNextEvent = useStableQuery(api.events.getNextEvent, {})
  const nextEvent = liveNextEvent === undefined ? initialData.nextEvent : liveNextEvent

  const fighterA = nextEvent?.fighterA ?? null
  const fighterB = nextEvent?.fighterB ?? null

  // The Face-off needs two renderable corners. If the opponent is TBA / has no
  // photo, fall back to a single-fighter composition with the VS omitted.
  const isFaceoff = isRenderable(fighterA) && isRenderable(fighterB)

  // null when there is genuinely no upcoming event — the press pass content is
  // simply omitted (never "TBA" placeholders).
  const pressPass = derivePressPass(nextEvent)

  useGSAP(() => {
    // Reduced motion: full static Face-off — everything visible, no transforms.
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
      // Right-sized pin: one fade beat. The interim hero held a +=200% pin for a
      // single chrome fade (logged /code-review finding); the Face-off resolves
      // its chrome in one short scrub, so the pin only needs to cover that beat.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '+=60%',
          pin: true,
          scrub: 0.8,
          fastScrollEnd: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // The Face-off photos + VS hold the frame; the scroll chrome (press pass,
      // scroll hint) fades as the pinned scroll advances, leaving a clean poster
      // before the next chapter.
      tl.to(
        [scrollHintRef.current, pressPassRef.current],
        { opacity: 0, duration: 1, ease: 'none' },
        0
      )

      return () => {
        tl.scrollTrigger?.kill()
        // Scoped clearProps — only the prop the timeline touched. Never 'all':
        // that wipes React inline styles (memory/gsap_clearprops_all_wipes_inline).
        gsap.set([scrollHintRef.current, pressPassRef.current], {
          clearProps: 'opacity',
        })
      }
    })

    return () => mm.revert()
  }, { scope: heroRef, dependencies: [prefersReduced, isMobile, isFaceoff], revertOnUpdate: true })

  return (
    <section ref={heroRef} className={classes.hero} aria-label="UFC Fighter Rankings">
      {!isMobile && (
        // Next-event indicator — top-centre slimmed Press Pass strip. Outer div
        // always renders so the GSAP timeline target (pressPassRef) exists; the
        // info content is omitted when there is no upcoming event.
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

      {/* Face-off stage — two bottom-anchored corners + central VS */}
      <div ref={facestageRef} className={classes.facestage}>
        {isFaceoff ? (
          <>
            <CornerView fighter={fighterA} side="left" showName />
            {/* Central VS — stable Flip target for #62; no Flip built here. */}
            <div ref={vsRef} className={classes.vs} aria-hidden="true">
              VS
            </div>
            <CornerView fighter={fighterB} side="right" showName />
          </>
        ) : (
          // Single-fighter fallback: one corner holds the frame, VS omitted.
          <CornerView fighter={fighterA} side="right" showName={isRenderable(fighterA)} />
        )}
      </div>

      {!isMobile && (
        // Scroll hint — centred along the bottom (was the Press Pass slot).
        <div ref={scrollHintRef} className={classes.scrollHint} aria-hidden="true">
          <span className={classes.scrollLabel}>SCROLL</span>
          <div className={classes.scrollLine} />
        </div>
      )}
    </section>
  )
}
