import { useRef } from 'react'
import { gsap } from '#/lib/gsap'
import type { Doc } from '../../convex/_generated/dataModel'
import classes from './FighterCard.module.css'

interface FighterCardProps {
  fighter: Doc<'fighters'>
  onClick: (fighter: Doc<'fighters'>, cardEl: HTMLDivElement) => void
}

const WEIGHT_CLASS_COLORS: Record<string, string> = {
  heavyweight: '#8B0000',
  lightheavyweight: '#B22222',
  middleweight: '#D20A0A',
  welterweight: '#E53935',
  lightweight: '#EF5350',
  featherweight: '#E57373',
  bantamweight: '#EF9A9A',
  flyweight: '#FFCDD2',
  strawweight: '#FFE0E0',
}

function getInitialsColor(weightClass: string): string {
  return WEIGHT_CLASS_COLORS[weightClass] ?? '#D20A0A'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

function getRankingLabel(ranking: number | undefined): string {
  if (ranking === 0) return 'CHAMP'
  if (ranking !== undefined) return `#${ranking}`
  return 'NR'
}

export default function FighterCard({ fighter, onClick }: FighterCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  function handleMouseEnter() {
    gsap.to(cardRef.current, {
      y: -16,
      scale: 1.03,
      boxShadow: '0 24px 48px rgba(210,10,10,0.25)',
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  function handleMouseLeave() {
    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      duration: 0.5,
      ease: 'elastic.out(1, 0.4)',
      overwrite: 'auto',
    })
  }

  function handleClick() {
    if (cardRef.current) {
      onClick(fighter, cardRef.current)
    }
  }

  const isChamp = fighter.ranking === 0
  const initColor = getInitialsColor(fighter.weightClass)

  return (
    <div
      ref={cardRef}
      className={classes.card}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`View ${fighter.name} details`}
    >
      <div className={classes.rankBadge} data-champ={isChamp}>
        {getRankingLabel(fighter.ranking)}
      </div>

      <div className={classes.photoWrap}>
        {fighter.photoUrl ? (
          <img
            src={fighter.photoUrl}
            alt={fighter.name}
            className={classes.photo}
          />
        ) : (
          <div
            className={classes.initials}
            style={{
              background: `linear-gradient(135deg, ${initColor}22, ${initColor}44)`,
              color: initColor,
            }}
          >
            {getInitials(fighter.name)}
          </div>
        )}
        {isChamp && <div className={classes.champBelt} aria-label="Champion belt" />}
      </div>

      <div className={classes.info}>
        <div className={classes.name}>{fighter.name}</div>
        {fighter.nickname && (
          <div className={classes.nickname}>"{fighter.nickname}"</div>
        )}
        <div className={classes.record}>
          <span className={classes.wins}>{fighter.record.wins}W</span>
          <span className={classes.sep}> · </span>
          <span className={classes.losses}>{fighter.record.losses}L</span>
          {fighter.record.draws > 0 && (
            <>
              <span className={classes.sep}> · </span>
              <span className={classes.draws}>{fighter.record.draws}D</span>
            </>
          )}
        </div>
        {fighter.country && (
          <div className={classes.country}>{fighter.country}</div>
        )}
      </div>
    </div>
  )
}
