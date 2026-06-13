import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useMemo, useEffect } from 'react'
import { useStableQuery } from '#/hooks/useStableQuery'
import { Center, Loader, useMantineTheme } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
import { api } from '../../convex/_generated/api'
import { gsap, SplitText, useGSAP, scheduleScrollTriggerRefresh } from '#/lib/gsap'
import type { Doc } from '../../convex/_generated/dataModel'
import type { Gender } from '#/lib/weightClasses'
import { useStaleSync } from '#/hooks/useStaleSync'
import FighterSpotlight from '#/components/experience/FighterSpotlight'
import classes from '#/components/experience/DivisionTimeline.module.css'

function isValidGender(value: string): value is Gender {
  return value === 'mens' || value === 'womens'
}

export const Route = createFileRoute('/divisions/$gender/$weightClass')({
  component: DivisionRouteComponent,
  errorComponent: () => (
    <Center
      h="100vh"
      style={{
        background: 'var(--mantine-color-body)',
        color: 'var(--mantine-color-text)',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p style={{ fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
        Division not found
      </p>
      <Link to="/" style={{ color: 'var(--mantine-color-ufcRed-6)', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Back to Rankings
      </Link>
    </Center>
  ),
})

const SCROLL_PER_UNIT_VH = 50
const ENTRY_UNITS = 0.5
const CHAMPION_UNITS = 2.0
const CONTENDER_UNITS = 1.0

interface Beat {
  fighter: Doc<'fighters'>
  isChampion: boolean
  rank: number
  timelineStart: number
  duration: number
}

function DivisionRouteComponent() {
  const { gender, weightClass } = Route.useParams()

  if (!isValidGender(gender)) {
    throw new Error(`Invalid gender: ${gender}`)
  }

  const photoSide = gender === 'mens' ? 'right' : 'left'
  const macroLabel = gender === 'mens' ? "MEN'S" : "WOMEN'S"

  const prefersReduced = useReducedMotion()
  const theme = useMantineTheme()
  const chapterRef = useRef<HTMLElement>(null)
  const spotlightRefs = useRef<(HTMLDivElement | null)[]>([])
  const divisionEntryRef = useRef<HTMLDivElement>(null)

  const fighters = useStableQuery(api.fighters.getByWeightClass, {
    weightClass,
    division: gender,
  })

  const allLoaded = fighters !== undefined

  useStaleSync(fighters, `${gender}-${weightClass}`)

  const beats = useMemo<Beat[]>(() => {
    if (!allLoaded || !fighters) return []

    const result: Beat[] = []
    const champion = fighters.find(f => f.ranking === 0)
    const contenders = fighters
      .filter(f => f.ranking !== undefined && f.ranking >= 1 && f.ranking <= 5)
      .sort((a, b) => (a.ranking ?? 99) - (b.ranking ?? 99))
      .slice(0, 5)

    if (!champion) return result

    result.push({
      fighter: champion,
      isChampion: true,
      rank: 0,
      timelineStart: ENTRY_UNITS,
      duration: CHAMPION_UNITS,
    })

    contenders.forEach((contender, ci) => {
      result.push({
        fighter: contender,
        isChampion: false,
        rank: contender.ranking ?? (ci + 1),
        timelineStart: ENTRY_UNITS + CHAMPION_UNITS + ci * CONTENDER_UNITS,
        duration: CONTENDER_UNITS,
      })
    })

    return result
  }, [allLoaded, fighters])

  useEffect(() => {
    if (!allLoaded) return
    requestAnimationFrame(() => {
      scheduleScrollTriggerRefresh()
      if (chapterRef.current) {
        chapterRef.current.style.opacity = '1'
      }
    })
  }, [allLoaded])

  const beatsFingerprint = useMemo(
    () => beats.map(b => `${b.fighter._id}:${b.rank}`).join('|'),
    [beats],
  )

  const totalUnits = beats.length > 0 ? ENTRY_UNITS + CHAMPION_UNITS + (beats.length - 1) * CONTENDER_UNITS : 1
  const scrollEnd = `+=${totalUnits * SCROLL_PER_UNIT_VH}%`

  useGSAP(() => {
    if (!beats.length) return

    const mm = gsap.matchMedia()

    mm.add(`(min-width: ${theme.breakpoints.sm})`, () => {
      spotlightRefs.current.forEach(el => {
        if (el) gsap.set(el, { opacity: 0 })
      })

      const split = divisionEntryRef.current ? SplitText.create(divisionEntryRef.current, { type: 'chars', mask: 'chars' }) : null
      if (split) gsap.set(split.chars, { yPercent: 115 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: chapterRef.current,
          start: 'top top',
          end: scrollEnd,
          pin: true,
          scrub: 0.8,
          fastScrollEnd: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      beats.forEach((beat, i) => {
        const el = spotlightRefs.current[i]
        if (!el) return

        const fadeInStart = beat.timelineStart
        const fadeOutStart = beat.timelineStart + beat.duration - 0.3
        const xIn = photoSide === 'right' ? 60 : -60
        const xOut = photoSide === 'right' ? -60 : 60

        if (!prefersReduced) {
          tl.fromTo(el, { opacity: 0, x: xIn }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, fadeInStart)
          tl.to(el, { opacity: 0, x: xOut, duration: 0.3, ease: 'power2.in' }, fadeOutStart)
        } else {
          tl.set(el, { opacity: 1, x: 0 }, fadeInStart)
          tl.set(el, { opacity: 0 }, fadeOutStart)
        }
      })

      if (split && divisionEntryRef.current) {
        if (!prefersReduced) {
          tl.set(divisionEntryRef.current, { opacity: 1 }, 0)
          tl.to(split.chars, { yPercent: 0, stagger: 0.03, ease: 'expo.out', duration: 0.35 }, 0)
          tl.to(divisionEntryRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, ENTRY_UNITS - 0.2)
        } else {
          tl.set(divisionEntryRef.current, { opacity: 1 }, 0)
          tl.set(divisionEntryRef.current, { opacity: 0 }, ENTRY_UNITS)
        }
      }

      tl.to({}, {}, totalUnits)

      return () => {
        split?.revert()
        tl.scrollTrigger?.kill()
      }
    })

    return () => mm.revert()
  }, { scope: chapterRef, dependencies: [beatsFingerprint, prefersReduced], revertOnUpdate: true })

  return (
    <section ref={chapterRef} className={classes.chapter} style={{ opacity: 0 }}>
      <Link
        to="/"
        aria-label="Back to rankings"
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 20,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 24,
          textDecoration: 'none',
          lineHeight: 1,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
      >
        &#x2190;
      </Link>

      <span className={classes.macroLabel}>{macroLabel}</span>

      <div className={classes.spotlights}>
        {!allLoaded && (
          <Center h="100%">
            <Loader color="ufcRed" size="sm" />
          </Center>
        )}
        {allLoaded && beats.length === 0 && (
          <Center h="100%">
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
              <p style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Awaiting Intelligence...
              </p>
              <p style={{ fontSize: '10px', marginTop: '8px' }}>
                Scraping live UFC rankings data
              </p>
            </div>
          </Center>
        )}
        {beats.map((beat, i) => (
          <FighterSpotlight
            key={`${beat.rank}`}
            ref={el => { spotlightRefs.current[i] = el }}
            fighter={beat.fighter}
            isChampion={beat.isChampion}
            rank={beat.rank}
            photoSide={photoSide}
          />
        ))}
      </div>

      <div className={classes.divisionEntries}>
        <div ref={divisionEntryRef} className={classes.divisionEntry}>
          {weightClass.toUpperCase()}
        </div>
      </div>
    </section>
  )
}
