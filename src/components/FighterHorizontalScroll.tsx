import { useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '#/lib/gsap'
import FighterCard from './FighterCard'
import FighterDetailOverlay from './FighterDetailOverlay'
import type { Doc } from '../../convex/_generated/dataModel'
import classes from './FighterHorizontalScroll.module.css'
import cardClasses from './FighterCard.module.css'

interface FighterHorizontalScrollProps {
  fighters: Doc<'fighters'>[]
  weightClassKey: string
}

export default function FighterHorizontalScroll({ fighters, weightClassKey }: FighterHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [selectedFighter, setSelectedFighter] = useState<Doc<'fighters'> | null>(null)
  const [selectedCardEl, setSelectedCardEl] = useState<HTMLDivElement | null>(null)
  const stRef = useRef<ScrollTrigger | null>(null)

  function handleCardClick(fighter: Doc<'fighters'>, cardEl: HTMLDivElement) {
    setSelectedFighter(fighter)
    setSelectedCardEl(cardEl)
  }

  function handleOverlayClose() {
    setSelectedFighter(null)
    setSelectedCardEl(null)
  }

  useGSAP(
    () => {
      const container = containerRef.current
      const track = trackRef.current
      if (!container || !track) return

      const cardSelector = `.${cardClasses.card}`
      const cards = gsap.utils.toArray<HTMLElement>(cardSelector, track)
      if (!cards.length) return

      gsap.from(cards, {
        opacity: 0,
        y: 40,
        stagger: 0.06,
        duration: 0.55,
        ease: 'power2.out',
        clearProps: 'all',
      })

      if (stRef.current) {
        stRef.current.kill()
        stRef.current = null
      }

      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px)', () => {
        const totalWidth = track.scrollWidth
        const viewportWidth = window.innerWidth
        const scrollDistance = totalWidth - viewportWidth + 64

        if (scrollDistance <= 0) return

        const st = ScrollTrigger.create({
          trigger: container,
          start: 'top top',
          end: `+=${scrollDistance}`,
          pin: true,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            gsap.set(track, {
              x: -self.progress * scrollDistance,
              force3D: true,
            })
          },
        })

        stRef.current = st

        return () => {
          st.kill()
          gsap.set(track, { x: 0 })
        }
      })

      mm.add('(max-width: 767px)', () => {
        gsap.set(track, { x: 0 })

        ScrollTrigger.batch(cards, {
          onEnter: (els) => {
            gsap.from(els, {
              opacity: 0,
              y: 30,
              stagger: 0.08,
              duration: 0.5,
              ease: 'power2.out',
            })
          },
          start: 'top 90%',
        })
      })

      return () => {
        mm.revert()
      }
    },
    { scope: containerRef, dependencies: [fighters, weightClassKey] }
  )

  if (fighters.length === 0) {
    return (
      <div className={classes.empty}>
        <div className={classes.emptyInner}>
          <p className={classes.emptyTitle}>No fighters loaded yet</p>
          <p className={classes.emptySub}>Data is being fetched from UFC Stats...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={classes.container} ref={containerRef}>
        <div className={classes.track} ref={trackRef}>
          {fighters.map((fighter) => (
            <FighterCard
              key={fighter._id}
              fighter={fighter}
              onClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {selectedFighter && selectedCardEl && (
        <FighterDetailOverlay
          fighter={selectedFighter}
          sourceEl={selectedCardEl}
          onClose={handleOverlayClose}
        />
      )}
    </>
  )
}
