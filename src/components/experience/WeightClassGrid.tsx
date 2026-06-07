import { useRef } from 'react'
import { useStableQuery } from '#/hooks/useStableQuery'
import { api } from '../../../convex/_generated/api'
import { MENS_DIVISIONS, WOMENS_DIVISIONS, type Gender } from '#/lib/weightClasses'
import WeightClassCard from './WeightClassCard'
import WeightClassFrame from './WeightClassFrame'
import classes from './WeightClassGrid.module.css'
import { gsap, useGSAP } from '#/lib/gsap'

interface WeightClassGridProps {
  gender: Gender
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
        clearProps: 'all',
      }
    )
  }, { scope: gridRef, dependencies: [gender], revertOnUpdate: true })

  return (
    <div className={classes.container}>
      {/* 
        The "One Skeleton" Structural Frame. 
        Renders the entire 8px vertical spine and all the circular sprouts 
        as a single visual layer above the background but below the cards.
      */}
      <WeightClassFrame gender={gender} count={divisions.length} />

      <div ref={gridRef} className={classes.grid}>
        {divisions.map((division, index) => {
          const slug = division.key.replace(/^(mens|womens)-/, '')
          const champion = champions?.find(c => c.weightClass === slug)

          return (
            <WeightClassCard
              key={division.key}
              weightClass={division.shortLabel}
              weightClassSlug={slug}
              gender={gender}
              variant={index % 2 === 0 ? 'left' : 'right'}
              championImageUrl={champion?.photoUrl}
            />
          )
        })}
      </div>
    </div>
  )
}
