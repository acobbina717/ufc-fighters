// Chapter 02/03 — shared template for Men's and Women's divisions.
// Loads all fighters upfront (9 fixed hooks, skip unused), builds a flat beats array,
// then drives a single scrubbed GSAP timeline. 8 units per division × 50vh per unit.
import { useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useQuery } from 'convex/react'
import { Center, Loader, useMantineTheme } from '@mantine/core'
import { useReducedMotion, useWindowScroll } from '@mantine/hooks'
import { api } from '../../../convex/_generated/api'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '#/lib/gsap'
import { MENS_DIVISIONS, WOMENS_DIVISIONS } from '#/lib/weightClasses'
import type { Doc } from '../../../convex/_generated/dataModel'
import { useStaleSync } from '#/hooks/useStaleSync'
import FighterSpotlight from './FighterSpotlight'
import classes from './DivisionsChapter.module.css'

// Scroll budget: 50vh per unit, 8 units per division
const SCROLL_PER_UNIT_VH = 50
const UNITS_PER_DIV = 8
const ENTRY_UNITS = 0.5
const CHAMPION_UNITS = 2.0
const CONTENDER_UNITS = 1.0

interface Beat {
  fighter: Doc<'fighters'>
  divisionIndex: number
  divisionName: string
  weightLimit: string
  isChampion: boolean
  rank: number
  timelineStart: number
  duration: number
}

interface Props {
  gender: 'mens' | 'womens'
  onScrollReady?: (start: number) => void
}

export interface DivisionsChapterHandle {
  scrollToDiv: (divIndex: number) => void
}

const DivisionsChapter = forwardRef<DivisionsChapterHandle, Props>(function DivisionsChapter({ gender, onScrollReady }, ref) {
  const divisions = gender === 'mens' ? MENS_DIVISIONS : WOMENS_DIVISIONS
  const photoSide = gender === 'mens' ? 'right' : 'left'
  const macroLabel = gender === 'mens' ? "MEN'S" : "WOMEN'S"

  const prefersReduced = useReducedMotion()
  const theme = useMantineTheme()
  const [, scrollTo] = useWindowScroll()
  const chapterRef = useRef<HTMLElement>(null)
  const spotlightRefs = useRef<(HTMLDivElement | null)[]>([])
  const divisionEntryRefs = useRef<(HTMLDivElement | null)[]>([])
  const stStartRef = useRef<number>(0)

  // Always call 9 hooks — skip indices beyond this chapter's division count.
  // Strip the gender prefix — DB stores 'heavyweight', not 'mens-heavyweight'.
  const d = divisions
  const wc = (i: number) => d[i]?.key.replace(/^(mens|womens)-/, '')
  const f0 = useQuery(api.fighters.getByWeightClass, d[0] ? { weightClass: wc(0)!, division: gender } : 'skip')
  const f1 = useQuery(api.fighters.getByWeightClass, d[1] ? { weightClass: wc(1)!, division: gender } : 'skip')
  const f2 = useQuery(api.fighters.getByWeightClass, d[2] ? { weightClass: wc(2)!, division: gender } : 'skip')
  const f3 = useQuery(api.fighters.getByWeightClass, d[3] ? { weightClass: wc(3)!, division: gender } : 'skip')
  const f4 = useQuery(api.fighters.getByWeightClass, d[4] ? { weightClass: wc(4)!, division: gender } : 'skip')
  const f5 = useQuery(api.fighters.getByWeightClass, d[5] ? { weightClass: wc(5)!, division: gender } : 'skip')
  const f6 = useQuery(api.fighters.getByWeightClass, d[6] ? { weightClass: wc(6)!, division: gender } : 'skip')
  const f7 = useQuery(api.fighters.getByWeightClass, d[7] ? { weightClass: wc(7)!, division: gender } : 'skip')
  const f8 = useQuery(api.fighters.getByWeightClass, d[8] ? { weightClass: wc(8)!, division: gender } : 'skip')

  const allFightersData = useMemo(() => [f0, f1, f2, f3, f4, f5, f6, f7, f8].slice(0, divisions.length), [f0, f1, f2, f3, f4, f5, f6, f7, f8, divisions.length])
  const allLoaded = allFightersData.every(f => f !== undefined)

  // One stale-sync check per division slot (fixed count matches fixed query count above)
  useStaleSync(f0, d[0]?.key ?? null)
  useStaleSync(f1, d[1]?.key ?? null)
  useStaleSync(f2, d[2]?.key ?? null)
  useStaleSync(f3, d[3]?.key ?? null)
  useStaleSync(f4, d[4]?.key ?? null)
  useStaleSync(f5, d[5]?.key ?? null)
  useStaleSync(f6, d[6]?.key ?? null)
  useStaleSync(f7, d[7]?.key ?? null)
  useStaleSync(f8, d[8]?.key ?? null)

  // Build flat beats array once all data is loaded
  const beats = useMemo<Beat[]>(() => {
    if (!allLoaded) return []

    const result: Beat[] = []

    divisions.forEach((div, divIndex) => {
      const fighters = allFightersData[divIndex] ?? []
      const champion = fighters.find(f => f.ranking === 0)
      const contenders = fighters
        .filter(f => f.ranking !== undefined && f.ranking >= 1 && f.ranking <= 5)
        .sort((a, b) => (a.ranking ?? 99) - (b.ranking ?? 99))
        .slice(0, 5)

      if (!champion) return

      const divisionName = div.shortLabel.toUpperCase()
      const divStart = divIndex * UNITS_PER_DIV

      // Champion beat
      result.push({
        fighter: champion,
        divisionIndex: divIndex,
        divisionName,
        weightLimit: div.weightLimit,
        isChampion: true,
        rank: 0,
        timelineStart: divStart + ENTRY_UNITS,
        duration: CHAMPION_UNITS,
      })

      // Contender beats
      contenders.forEach((contender, ci) => {
        result.push({
          fighter: contender,
          divisionIndex: divIndex,
          divisionName,
          weightLimit: div.weightLimit,
          isChampion: false,
          rank: contender.ranking ?? (ci + 1),
          timelineStart: divStart + ENTRY_UNITS + CHAMPION_UNITS + ci * CONTENDER_UNITS,
          duration: CONTENDER_UNITS,
        })
      })
    })

    return result
  }, [allLoaded, allFightersData, divisions])

  // Refresh ScrollTrigger after data settles in DOM, then reveal the chapter.
  useEffect(() => {
    if (!allLoaded) return
    requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      if (chapterRef.current) {
        chapterRef.current.style.opacity = '1'
      }
    })
  }, [allLoaded])

  // Calculate actual divisions that have data to avoid "dead air"
  const activeDivisionIndices = useMemo(() => {
    const indices = new Set<number>()
    beats.forEach(b => indices.add(b.divisionIndex))
    return Array.from(indices).sort((a, b) => a - b)
  }, [beats])

  // Total scroll length: Only divisions with data. 
  // If no data, provide 1 division worth of space so the loader/empty state is visible.
  const totalUnits = activeDivisionIndices.length > 0
    ? (activeDivisionIndices[activeDivisionIndices.length - 1] + 1) * UNITS_PER_DIV
    : UNITS_PER_DIV 
  const scrollEnd = `+=${totalUnits * SCROLL_PER_UNIT_VH}%`

  function scrollToDiv(divIndex: number) {
    const unitHeight = (SCROLL_PER_UNIT_VH / 100) * window.innerHeight
    // Land at unit 1.0 from division start — past entry (0.5) and past champion fade-in (0.4)
    // so the champion is fully visible when the scrub settles
    const target = (divIndex * UNITS_PER_DIV + ENTRY_UNITS + 0.5) * unitHeight
    scrollTo({ y: stStartRef.current + target })
  }

  useImperativeHandle(ref, () => ({ scrollToDiv }))

  useGSAP(() => {
    if (!beats.length) return

    const mm = gsap.matchMedia()

    mm.add(`(min-width: ${theme.breakpoints.sm})`, () => {
      // All spotlights start invisible
      spotlightRefs.current.forEach(el => {
        if (el) gsap.set(el, { opacity: 0 })
      })


      // Create SplitText for each division entry and hide chars below mask
      const divisionSplits = divisions.map((_, i) => {
        const el = divisionEntryRefs.current[i]
        if (!el) return null
        return SplitText.create(el, { type: 'chars', mask: 'chars' })
      })
      divisionSplits.forEach(split => {
        if (split) gsap.set(split.chars, { yPercent: 115 })
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: chapterRef.current,
          start: 'top top',
          end: scrollEnd,
          pin: true,
          scrub: 1.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            stStartRef.current = self.start
            onScrollReady?.(self.start)
          },
        },
      })
      // Capture start immediately after creation
      stStartRef.current = tl.scrollTrigger?.start ?? 0
      onScrollReady?.(stStartRef.current)

      // Animate each beat in/out
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

      // Division entry crash-in per division
      divisions.forEach((_, divIndex) => {
        const split = divisionSplits[divIndex]
        const entryEl = divisionEntryRefs.current[divIndex]
        if (!split || !entryEl) return

        const divStart = divIndex * UNITS_PER_DIV
        // Overlap with previous division's exit for cinematic transition
        const entryStart = divIndex === 0 ? divStart : divStart - 0.3

        if (!prefersReduced) {
          tl.set(entryEl, { opacity: 1 }, entryStart)
          tl.to(split.chars, { yPercent: 0, stagger: 0.03, ease: 'expo.out', duration: 0.35 }, entryStart)
          tl.to(entryEl, { opacity: 0, duration: 0.2, ease: 'power2.in' }, divStart + ENTRY_UNITS - 0.2)
        } else {
          tl.set(entryEl, { opacity: 1 }, divStart)
          tl.set(entryEl, { opacity: 0 }, divStart + ENTRY_UNITS)
        }
      })

      // Sentinel tween to set total timeline duration
      tl.to({}, {}, totalUnits)

      return () => {
        divisionSplits.forEach(split => split?.revert())
        tl.scrollTrigger?.kill()
      }
    })

    // Mobile: spotlights are visible via CSS (opacity: 1, position: relative).
    // No ScrollTrigger per-card — too many triggers on a long list causes performance issues.

    return () => mm.revert()
  }, { scope: chapterRef, dependencies: [beats.length, prefersReduced] })

  return (
    <section ref={chapterRef} className={classes.chapter}>
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
            key={`${beat.divisionIndex}-${beat.rank}`}
            ref={el => { spotlightRefs.current[i] = el }}
            fighter={beat.fighter}
            isChampion={beat.isChampion}
            rank={beat.rank}
            photoSide={photoSide}
          />
        ))}
      </div>

      {/* Division name crash-in overlay — one element per division, stacked above spotlights */}
      <div className={classes.divisionEntries}>
        {divisions.map((div, i) => (
          <div
            key={div.key}
            ref={el => { divisionEntryRefs.current[i] = el }}
            className={classes.divisionEntry}
          >
            {div.shortLabel.toUpperCase()}
          </div>
        ))}
      </div>

    </section>
  )
})

DivisionsChapter.displayName = 'DivisionsChapter'
export default DivisionsChapter
