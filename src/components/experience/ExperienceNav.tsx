// Fixed left-edge vertical nav — lists all 11 divisions across both chapters.
// Tracks active division from scroll position. Clicking jumps to any division.
import cx from 'clsx'
import { MENS_DIVISIONS, WOMENS_DIVISIONS } from '#/lib/weightClasses'
import classes from './ExperienceNav.module.css'

interface Props {
  scrollY: number
  mensScrollStart: number | null
  womensScrollStart: number | null
  onMensDivClick: (index: number) => void
  onWomensDivClick: (index: number) => void
}

// Must match DivisionsChapter constants
const UNITS_PER_DIV = 8
const SCROLL_PER_UNIT_VH = 50

export default function ExperienceNav({
  scrollY,
  mensScrollStart,
  womensScrollStart,
  onMensDivClick,
  onWomensDivClick,
}: Props) {
  const divScrollPx = UNITS_PER_DIV * (SCROLL_PER_UNIT_VH / 100) * (typeof window !== 'undefined' ? window.innerHeight : 800)

  const mensActive = mensScrollStart !== null ? Math.min(
    Math.max(Math.floor((scrollY - mensScrollStart) / divScrollPx), 0),
    MENS_DIVISIONS.length - 1,
  ) : 0
  const womensActive = womensScrollStart !== null ? Math.min(
    Math.max(Math.floor((scrollY - womensScrollStart) / divScrollPx), 0),
    WOMENS_DIVISIONS.length - 1,
  ) : 0

  const inMens = mensScrollStart !== null &&
    scrollY >= mensScrollStart &&
    scrollY < mensScrollStart + MENS_DIVISIONS.length * divScrollPx
  const inWomens = womensScrollStart !== null &&
    scrollY >= womensScrollStart &&
    scrollY < womensScrollStart + WOMENS_DIVISIONS.length * divScrollPx

  // Only show after the Men's chapter ScrollTrigger has fired and reported its start position
  const visible = mensScrollStart !== null && scrollY >= mensScrollStart

  return (
    <nav
      className={cx(classes.root, { [classes.visible]: visible })}
      aria-label="Division navigation"
    >
      <span className={classes.genderLabel}>MEN'S</span>
      <div className={classes.group}>
        {MENS_DIVISIONS.map((div, i) => (
          <button
            key={div.key}
            className={classes.item}
            onClick={() => onMensDivClick(i)}
            aria-label={div.label}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className={cx(classes.dot, { [classes.dotActive]: inMens && mensActive === i })} />
            <span className={cx(classes.label, { [classes.labelActive]: inMens && mensActive === i })}>
              {div.abbr}
            </span>
          </button>
        ))}
      </div>

      <span className={classes.genderLabel}>WOMEN'S</span>
      <div className={classes.group}>
        {WOMENS_DIVISIONS.map((div, i) => (
          <button
            key={div.key}
            className={classes.item}
            onClick={() => onWomensDivClick(i)}
            aria-label={div.label}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className={cx(classes.dot, { [classes.dotActive]: inWomens && womensActive === i })} />
            <span className={cx(classes.label, { [classes.labelActive]: inWomens && womensActive === i })}>
              {div.abbr}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
