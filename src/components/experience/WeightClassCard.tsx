import { useRef } from 'react'
import { Card } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { formatWeightRange, type WeightClassDef } from '#/lib/weightClasses'
import { gsap, useGSAP } from '#/lib/gsap'
import { mantineTheme } from '#/lib/mantine'
import classes from './WeightClassCard.module.css'

interface WeightClassCardProps {
  division: WeightClassDef
  championImageUrl?: string
  /** Named bento cell this card occupies (maps to a grid-template-areas slot). */
  gridArea?: string
  /** Marks a flanking sentinel card for the scroll-entry animation (#15). */
  sentinel?: 'left' | 'right'
  /** Cell shape — drives the champion photo's crop/zoom framing. */
  format?: 'tall' | 'wide' | 'square'
}

/** Visible stroke segment as a fraction of the rectangle's perimeter. */
const SWEEP_SEGMENT = 0.18
/** Seconds for one full clockwise lap of the perimeter. */
const SWEEP_DURATION = 4
/** Hover guard: skip the looping sweep on touch devices, small viewports, and for reduced-motion users. */
export const NO_HOVER = `(max-width: ${mantineTheme.breakpoints!.sm}), (hover: none), (prefers-reduced-motion: reduce)`

export default function WeightClassCard({
  division,
  championImageUrl,
  gridArea,
  sentinel,
  format,
}: WeightClassCardProps) {
  const slug = division.key.replace(/^(mens|womens)-/, '')
  const gender = division.division
  const range = formatWeightRange(division)

  const cardRef = useRef<HTMLDivElement>(null)
  const rectRef = useRef<SVGRectElement>(null)
  const sheenRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  // Kill the hover timeline if the card unmounts mid-sweep.
  useGSAP(() => () => { tlRef.current?.kill() }, { scope: cardRef })

  function handleEnter() {
    if (window.matchMedia(NO_HOVER).matches) return
    const card = cardRef.current
    const rect = rectRef.current
    const sheen = sheenRef.current
    if (!card || !rect || !sheen) return

    // Clear any in-flight leave fade or prior sweep before starting fresh.
    gsap.killTweensOf([rect, sheen])
    tlRef.current?.kill()

    // Perimeter straight from geometry: 2 * (w + h). The SVG has no viewBox, so its
    // user units are CSS pixels and the rect can be sized to match the card exactly.
    const { width, height } = card.getBoundingClientRect()
    const stroke = 3
    const inset = stroke / 2
    const w = width - stroke
    const h = height - stroke
    const perimeter = 2 * (w + h)
    const segment = perimeter * SWEEP_SEGMENT

    gsap.set(rect, {
      attr: { x: inset, y: inset, width: w, height: h },
      // segment + gap === perimeter, so the pattern tiles the closed path exactly
      // once: one visible segment, and the wrap at the seam is perfectly continuous.
      strokeDasharray: `${segment} ${perimeter - segment}`,
      strokeDashoffset: 0,
      opacity: 1,
    })
    gsap.set(sheen, { xPercent: -160, opacity: 0 })

    // One composed, looping timeline drives both the perimeter sweep and the sheen.
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })

    // Clockwise sweep: marching the dash by exactly one perimeter returns the
    // pattern to an identical state, so the loop is seamless with no seam stutter.
    tl.to(rect, { strokeDashoffset: -perimeter, duration: SWEEP_DURATION }, 0)

    // The sheen fires in sync as the segment crosses the card's horizontal midpoint
    // — the mid-point of the right edge, at distance (w + h/2) along the clockwise
    // lap. Derived from real geometry so it stays centred on tall and wide cells too
    // (this reduces to 0.375 only on a square card).
    const midpoint = SWEEP_DURATION * ((w + h / 2) / perimeter)
    tl.fromTo(
      sheen,
      { xPercent: -160, opacity: 0 },
      { xPercent: 160, opacity: 1, duration: 0.55, ease: 'power2.in' },
      midpoint,
    ).to(sheen, { opacity: 0, duration: 0.2, ease: 'power2.out' }, '>-0.12')

    tlRef.current = tl
  }

  function handleLeave() {
    const rect = rectRef.current
    const sheen = sheenRef.current
    tlRef.current?.kill()
    tlRef.current = null
    gsap.to([rect, sheen].filter(Boolean), {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.out',
    })
  }

  return (
    <Card
      ref={cardRef}
      radius={0}
      padding={0}
      className={classes.card}
      style={gridArea ? { gridArea } : undefined}
      data-sentinel={sentinel}
      data-format={format}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {championImageUrl ? (
        <img src={championImageUrl} alt="" className={classes.photo} />
      ) : (
        <div className={classes.placeholder} aria-hidden="true" />
      )}

      <div className={classes.gradient} aria-hidden="true" />

      {/* Diagonal light streak, fired in sync with the sweep crossing the midpoint. */}
      <div ref={sheenRef} className={classes.sheen} aria-hidden="true" />

      {/* Frame Sweep. No viewBox -> user units are px; the rect is sized on hover so
          the perimeter dash math is pixel-exact and corners stay sharp right angles. */}
      <svg className={classes.frameSvg} aria-hidden="true">
        <rect ref={rectRef} className={classes.frameRect} />
      </svg>

      <div className={classes.label}>
        <span className={classes.division}>{division.shortLabel}</span>
        <span className={classes.range}>{range}</span>
      </div>

      <Link
        to="/divisions/$gender/$weightClass"
        params={{ gender, weightClass: slug }}
        className={classes.linkLayer}
        aria-label={`${gender === 'mens' ? "Men's" : "Women's"} ${division.shortLabel} Division`}
      />
    </Card>
  )
}
