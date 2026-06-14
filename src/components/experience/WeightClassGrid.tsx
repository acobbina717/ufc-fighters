import { useRef, useState } from 'react'
import { useStableQuery } from '#/hooks/useStableQuery'
import { api } from '../../../convex/_generated/api'
import { MENS_DIVISIONS, WOMENS_DIVISIONS, type Gender } from '#/lib/weightClasses'
import WeightClassCard from './WeightClassCard'
import DivisionToggle from './DivisionToggle'
import classes from './WeightClassGrid.module.css'
import { gsap, useGSAP } from '#/lib/gsap'
import { mantineTheme } from '#/lib/mantine'

// One device pixel (0.0625em at 16px root) above theme.breakpoints.sm, so a
// viewport of exactly 48em matches only the mobile branch, never both.
const SM_EM = parseFloat(mantineTheme.breakpoints!.sm!)
export const DESKTOP_MOTION_QUERY = `(min-width: ${SM_EM + 0.0625}em) and (prefers-reduced-motion: no-preference)`

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
    // Women's has 3 divisions: Bantamweight is the single left sentinel. There is
    // no right sentinel — Women's Featherweight is not an active ranked division,
    // so Strawweight + Flyweight render as full-width landscape bands instead.
    if (slug === 'bantamweight') return 'left'
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
  'strawweight',                                  // women's top landscape band
])
function formatFor(gender: Gender, slug: string): CellFormat {
  if (sentinelFor(gender, slug)) return 'tall'
  // Women's Flyweight is a full-width landscape band (matches Strawweight). Men's
  // Flyweight stays square — it's a small bottom-row cell, not a band.
  if (gender === 'womens' && slug === 'flyweight') return 'wide'
  if (WIDE_CELLS.has(slug)) return 'wide'
  return 'square'
}

export default function WeightClassGrid() {
  // The toggle lives here as the section header, so the grid owns its own gender
  // state — ExperienceView no longer needs to know about it.
  const [gender, setGender] = useState<Gender>('mens')
  const gridRef = useRef<HTMLDivElement>(null)
  const divisions = gender === 'mens' ? MENS_DIVISIONS : WOMENS_DIVISIONS

  const champions = useStableQuery(api.fighters.getChampionsByGender, { division: gender })

  useGSAP(() => {
    const grid = gridRef.current
    if (!grid) return

    // Target the card roots directly: the two flanking sentinels by their
    // `data-sentinel` contract, the rest as the center column. `:scope >` keeps
    // this robust if #14 later nests a section header inside the grid wrapper.
    const left = grid.querySelector(':scope > [data-sentinel="left"]')
    const right = grid.querySelector(':scope > [data-sentinel="right"]')
    const center = grid.querySelectorAll(':scope > :not([data-sentinel])')

    const mm = gsap.matchMedia()

    // Desktop + motion allowed only. The initial hidden state is set here (not in
    // CSS) so mobile cards — where this branch never runs — stay visible, and a
    // reduced-motion user gets the cards immediately with no entrance at all.
    mm.add(
      DESKTOP_MOTION_QUERY,
      () => {
        // Women's bento has no right sentinel (3 divisions), so `right` is null
        // there — filter it out before handing targets to GSAP to avoid
        // null-target warnings and an invalidated tween on the timeline.
        const sentinels = [left, right].filter(Boolean)
        gsap.set(sentinels, { opacity: 0 })
        gsap.set(center, { opacity: 0 })

        const tl = gsap.timeline({
          scrollTrigger: { trigger: grid, start: 'top 80%' },
        })

        // Flanking sentinels announce the bento structure first, sliding in from
        // their respective edges simultaneously...
        tl.fromTo(
          left,
          { x: -120, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
          0,
        )
        if (right) {
          tl.fromTo(
            right,
            { x: 120, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
            0,
          )
        }
        // ...then the center column fills in with a stagger on a short overlap.
        // DOM order is ascending weight (flyweight first), so stagger from the
        // end: the heaviest division leads and the fill sweeps top-to-bottom,
        // matching the bento's editorial hierarchy.
        // Scope clearProps to the animated props only — `clearProps: 'all'` does
        // `style.cssText = ''`, wiping each card's inline `grid-area`.
        tl.fromTo(
          center,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: { each: 0.07, from: 'end' },
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
          0.2,
        )
      },
    )
  }, { scope: gridRef, dependencies: [gender], revertOnUpdate: true })

  return (
    <div className={classes.container}>
      {/* Section header — sibling of the grid, never a gridRef child, so the
          scroll-entry selectors (`:scope > [data-sentinel]`) stay clean. */}
      <DivisionToggle value={gender} onChange={setGender} />

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
