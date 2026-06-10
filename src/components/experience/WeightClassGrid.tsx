import { useRef } from 'react'
import { useStableQuery } from '#/hooks/useStableQuery'
import { api } from '../../../convex/_generated/api'
import { MENS_DIVISIONS, WOMENS_DIVISIONS, type Gender } from '#/lib/weightClasses'
import WeightClassCard from './WeightClassCard'
import classes from './WeightClassGrid.module.css'
import { gsap, useGSAP } from '#/lib/gsap'

interface WeightClassGridProps {
  gender: Gender
}

/**
 * Maps a division slug to its bento `grid-template-areas` cell. Names are shared
 * across genders where the slug repeats (e.g. featherweight -> `fw`); each name
 * only resolves within the template that declares it.
 */
const GRID_AREA: Record<string, string> = {
  heavyweight: 'hw',
  lightheavyweight: 'lhw',
  middleweight: 'mw',
  welterweight: 'ww',
  lightweight: 'lw',
  featherweight: 'fw',
  bantamweight: 'bw',
  flyweight: 'fly',
  strawweight: 'stw',
}

/** The flanking sentinel cards differ by gender, so they're resolved per slug. */
function sentinelFor(gender: Gender, slug: string): 'left' | 'right' | undefined {
  if (gender === 'mens') {
    if (slug === 'heavyweight') return 'left'
    if (slug === 'lightheavyweight') return 'right'
  } else {
    if (slug === 'bantamweight') return 'left'
    if (slug === 'featherweight') return 'right'
  }
  return undefined
}

/**
 * Cell shape drives photo framing. `tall` sentinels show the full body+belt with a
 * top-anchored crop; `wide` landscape bands centre the subject and zoom slightly so
 * the headshots' baked-in black margins crop out; `square` cells keep the default.
 */
type CellFormat = 'tall' | 'wide' | 'square'
const WIDE_CELLS = new Set([
  'middleweight', 'welterweight', 'lightweight', // men's centre bands
  'strawweight',                                  // women's centre band (flyweight resolves via gender below)
])
function formatFor(gender: Gender, slug: string): CellFormat {
  if (sentinelFor(gender, slug)) return 'tall'
  if (gender === 'womens' && slug === 'flyweight') return 'wide'
  if (WIDE_CELLS.has(slug)) return 'wide'
  return 'square'
}

export default function WeightClassGrid({ gender }: WeightClassGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const divisions = gender === 'mens' ? MENS_DIVISIONS : WOMENS_DIVISIONS

  const champions = useStableQuery(api.fighters.getChampionsByGender, { division: gender })

  useGSAP(() => {
    if (!gridRef.current) return

    const cards = gridRef.current.children

    gsap.fromTo(
      cards,
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.out',
        // Scope to animated props only — `clearProps: 'all'` does `style.cssText = ''`,
        // which would wipe each card's inline `grid-area` and collapse the bento.
        clearProps: 'transform,opacity',
      }
    )
  }, { scope: gridRef, dependencies: [gender], revertOnUpdate: true })

  return (
    <div className={classes.container}>
      <div
        ref={gridRef}
        className={`${classes.grid} ${gender === 'mens' ? classes.mens : classes.womens}`}
      >
        {divisions.map((division) => {
          const slug = division.key.replace(/^(mens|womens)-/, '')
          const champion = champions?.find(c => c.weightClass === slug)

          return (
            <WeightClassCard
              key={division.key}
              division={division}
              championImageUrl={champion?.photoUrl}
              gridArea={GRID_AREA[slug]}
              sentinel={sentinelFor(gender, slug)}
              format={formatFor(gender, slug)}
            />
          )
        })}
      </div>
    </div>
  )
}
