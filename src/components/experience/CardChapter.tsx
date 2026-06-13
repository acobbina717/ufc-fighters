// Chapter — THE CARD (issue #30). A normally-flowing (deliberately UNPINNED)
// typographic fight-poster ledger of the next event's remaining bouts, between
// the pinned Hero and the Weight Class Grid: the journey reads pin → flow → pin.
// "□ NAME vs NAME □" rows grouped under Card Tier dividers, each corner flanked
// by a full-color square Corner Thumbnail (ADR 0009) with a silhouette fallback
// for missing-photo / TBA corners. Rows (thumbnails included) stagger in on
// viewport entry; under reduced motion they are simply visible.
import { useEffect, useRef } from 'react'
import { Avatar } from '@mantine/core'
import { api } from '../../../convex/_generated/api'
import { useStableQuery } from '#/hooks/useStableQuery'
import {
  boutWeightClassLabel,
  cornerDisplay,
  countryFlag,
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
                  <div className={classes.matchup}>
                    <Corner
                      name={bout.fighterAName}
                      photoUrl={bout.fighterAPhotoUrl}
                      country={bout.fighterACountry}
                    />
                    <span className={classes.vs}>vs</span>
                    <Corner
                      name={bout.fighterBName}
                      photoUrl={bout.fighterBPhotoUrl}
                      country={bout.fighterBCountry}
                      reversed
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

// One corner of a bout: a photo-column (Corner Thumbnail stacked above its
// Country Flag Row) with the fighter name beside it (issue #45). The closing
// corner is `reversed` — name then photo-column in source order, mirrored on
// desktop via CSS so the photos flank the names. The flag row is absent
// entirely when the fighter has no country on record (TBA / none on file).
function Corner({
  name,
  photoUrl,
  country,
  reversed,
}: {
  name: string | null
  photoUrl: string | null
  country: string | null
  reversed?: boolean
}) {
  const flag = countryFlag(country)
  const photoCol = (
    <span className={classes.photoCol} data-photo-col>
      <Avatar
        src={photoUrl}
        alt=""
        aria-hidden="true"
        radius={0}
        className={classes.thumb}
        classNames={{
          image: classes.thumbImage,
          placeholder: classes.thumbPlaceholder,
        }}
      />
      {country && (
        <span className={classes.flagRow} data-flag-row>
          {flag && (
            <span className={classes.flag} aria-hidden="true">
              {flag}
            </span>
          )}
          <span className={classes.flagName}>{country.toUpperCase()}</span>
        </span>
      )}
    </span>
  )
  const nameEl = (
    <span className={name ? classes.fighter : classes.tba}>
      {cornerDisplay(name)}
    </span>
  )
  return (
    <span className={`${classes.corner}${reversed ? ` ${classes.cornerEnd}` : ''}`}>
      {reversed ? (
        <>
          {nameEl}
          {photoCol}
        </>
      ) : (
        <>
          {photoCol}
          {nameEl}
        </>
      )}
    </span>
  )
}
