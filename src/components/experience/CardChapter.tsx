// Chapter — THE CARD (issue #30). A normally-flowing (deliberately UNPINNED)
// typographic fight-poster ledger of the next event's remaining bouts, between
// the pinned Hero and the Weight Class Grid: the journey reads pin → flow → pin.
// No photography; "NAME vs NAME" rows grouped under Card Tier dividers. Rows
// stagger in on viewport entry; under reduced motion they are simply visible.
import { useEffect, useRef } from 'react'
import { api } from '../../../convex/_generated/api'
import { useStableQuery } from '#/hooks/useStableQuery'
import {
  boutWeightClassLabel,
  cornerDisplay,
  groupBoutsByTier,
} from '#/lib/cardLedger'
import { gsap, ScrollTrigger, useGSAP, scheduleScrollTriggerRefresh } from '#/lib/gsap'
import classes from './CardChapter.module.css'

export const MOTION_OK_QUERY = '(prefers-reduced-motion: no-preference)'

export default function CardChapter() {
  const chapterRef = useRef<HTMLElement>(null)
  const card = useStableQuery(api.events.getNextEventCard, {})
  const sections = card ? groupBoutsByTier(card.bouts) : []
  const rowCount = sections.reduce((n, s) => n + s.bouts.length, 0)

  // The ledger mounts only after the live query resolves, which changes total
  // page height between the pinned hero above and the scroll-triggered chapters
  // below — re-measure every ScrollTrigger (coalesced to one refresh per frame).
  useEffect(() => {
    if (rowCount > 0) scheduleScrollTriggerRefresh()
  }, [rowCount])

  useGSAP(
    () => {
      if (rowCount === 0) return
      const mm = gsap.matchMedia()

      // Motion-allowed branch only. Rows are visible by default (no opacity: 0
      // in CSS), so reduced-motion users — or a GSAP failure — never see
      // stranded invisible content; the pre-animation state is applied here.
      mm.add(MOTION_OK_QUERY, () => {
        const rows = gsap.utils.toArray<HTMLElement>(
          '[data-ledger-row]',
          chapterRef.current,
        )
        gsap.set(rows, { opacity: 0, y: 28 })
        ScrollTrigger.batch(rows, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.09,
              ease: 'power2.out',
              // Scoped to the animated props — a blanket clearProps wipes
              // React inline styles via style.cssText = ''.
              clearProps: 'transform,opacity',
            }),
        })
      })
    },
    { scope: chapterRef, dependencies: [rowCount], revertOnUpdate: true },
  )

  // No upcoming event, still loading, or a card with only its main event —
  // the chapter simply doesn't exist. Never placeholder rows.
  if (!card || sections.length === 0) return null

  return (
    <section
      ref={chapterRef}
      className={classes.chapter}
      aria-label={`${card.eventName} fight card`}
    >
      <div className={classes.inner}>
        <header className={classes.header} data-ledger-row>
          <p className={classes.eyebrow}>{card.eventName} · FULL CARD</p>
          <h2 className={classes.title}>THE CARD</h2>
        </header>

        {sections.map((section) => (
          <div key={section.tier} className={classes.tierSection}>
            <div className={classes.tierDivider} data-ledger-row>
              <h3 className={classes.tierLabel}>{section.label}</h3>
              <span className={classes.tierRule} aria-hidden="true" />
            </div>
            <ol className={classes.boutList}>
              {section.bouts.map((bout) => (
                <li key={bout.boutOrder} className={classes.boutRow} data-ledger-row>
                  <span className={classes.weightClass}>
                    {boutWeightClassLabel(bout.weightClass, bout.division)} BOUT
                  </span>
                  <p className={classes.matchup}>
                    <span className={classes.fighter}>
                      {cornerDisplay(bout.fighterAName)}
                    </span>
                    <span className={classes.vs}>vs</span>
                    <span className={bout.fighterBName ? classes.fighter : classes.tba}>
                      {cornerDisplay(bout.fighterBName)}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
