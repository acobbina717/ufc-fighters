// @vitest-environment jsdom
// Behavioral tests for THE CARD chapter (issue #30): rendered tier grouping,
// bout ordering, main-event exclusion, and TBA rows. GSAP and Convex are
// stubbed — the reveal animation itself is asserted against the source, per
// the established pattern (jsdom can't scroll).
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '#/lib/mantine'
import type { LedgerBout } from '#/lib/cardLedger'

// The reveal is GSAP-on-scroll — irrelevant to ledger structure. Stub it out.
vi.mock('#/lib/gsap', () => ({
  gsap: { matchMedia: () => ({ add: () => {} }), set: () => {}, to: () => {}, utils: { toArray: () => [] } },
  ScrollTrigger: { batch: () => {} },
  useGSAP: () => {},
  scheduleScrollTriggerRefresh: () => {},
}))

// No Convex in jsdom — each test seeds the chapter through this mock.
const queryResult = vi.fn<() => unknown>()
vi.mock('#/hooks/useStableQuery', () => ({
  useStableQuery: () => queryResult(),
}))

vi.mock('../../../convex/_generated/api', () => ({
  api: { events: { getNextEventCard: 'getNextEventCard' } },
}))

import CardChapter from './CardChapter'

function bout(overrides: Partial<LedgerBout> = {}): LedgerBout {
  return {
    boutOrder: 2,
    cardTier: 'main',
    weightClass: 'lightweight',
    division: 'mens',
    fighterAName: 'A Fighter',
    fighterBName: 'B Fighter',
    fighterAPhotoUrl: 'https://ufc.com/a.png',
    fighterBPhotoUrl: 'https://ufc.com/b.png',
    fighterACountry: 'United States',
    fighterBCountry: 'Brazil',
    ...overrides,
  }
}

function renderChapter(card: { eventName: string; bouts: LedgerBout[] } | null | undefined) {
  queryResult.mockReturnValue(card)
  return render(
    <MantineProvider theme={mantineTheme}>
      <CardChapter />
    </MantineProvider>,
  )
}

afterEach(() => {
  cleanup()
  queryResult.mockReset()
})

const FULL_CARD = {
  eventName: 'UFC 340',
  bouts: [
    bout({ boutOrder: 1, cardTier: 'main', fighterAName: 'Headliner A', fighterBName: 'Headliner B' }),
    bout({ boutOrder: 2, cardTier: 'main', fighterAName: 'Co Main A', fighterBName: 'Co Main B' }),
    bout({ boutOrder: 3, cardTier: 'main', fighterAName: 'Third A', fighterBName: 'Third B' }),
    bout({ boutOrder: 4, cardTier: 'prelim', fighterAName: 'Prelim A', fighterBName: null, weightClass: 'flyweight', division: 'womens' }),
    bout({ boutOrder: 5, cardTier: 'early_prelim', fighterAName: 'Early A', fighterBName: 'Early B' }),
  ],
}

describe('CardChapter ledger', () => {
  it('renders the chapter title and event eyebrow', () => {
    renderChapter(FULL_CARD)
    expect(screen.getByText('THE CARD')).toBeTruthy()
    expect(screen.getByText(/UFC 340/)).toBeTruthy()
  })

  it('groups bouts under their card tier dividers in broadcast order', () => {
    renderChapter(FULL_CARD)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['MAIN CARD', 'PRELIMS', 'EARLY PRELIMS'])

    // Each row sits under its correct divider: the list following MAIN CARD
    // holds the two remaining main-card bouts in bout order.
    const mainList = screen.getByText('MAIN CARD').closest('div')!
      .parentElement!.querySelector('ol')!
    const mainRows = within(mainList).getAllByRole('listitem')
    expect(mainRows).toHaveLength(2)
    expect(mainRows[0].textContent).toContain('CO MAIN A')
    expect(mainRows[1].textContent).toContain('THIRD A')
  })

  it('excludes the main event — the hero owns it', () => {
    renderChapter(FULL_CARD)
    expect(screen.queryByText(/HEADLINER/)).toBeNull()
  })

  it('renders an unannounced opponent as TBA', () => {
    renderChapter(FULL_CARD)
    expect(screen.getByText('PRELIM A')).toBeTruthy()
    expect(screen.getByText('TBA')).toBeTruthy()
  })

  it("labels each bout's weight class, with the women's prefix where it applies", () => {
    renderChapter(FULL_CARD)
    expect(screen.getByText("WOMEN'S FLYWEIGHT BOUT")).toBeTruthy()
    expect(screen.getAllByText('LIGHTWEIGHT BOUT').length).toBeGreaterThan(0)
  })

  // MantineProvider injects <style> nodes, so assert the chapter section itself.
  it('renders nothing while the query is loading', () => {
    const { container } = renderChapter(undefined)
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders nothing when there is no upcoming event', () => {
    const { container } = renderChapter(null)
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders nothing when the card holds only its main event', () => {
    const { container } = renderChapter({
      eventName: 'UFC 341',
      bouts: [bout({ boutOrder: 1 })],
    })
    expect(container.querySelector('section')).toBeNull()
  })
})

describe('CardChapter Corner Thumbnails (#39 / ADR 0009)', () => {
  it('renders two full-color square thumbnails flanking a bout when both fighters have photos', () => {
    const { container } = renderChapter({
      eventName: 'UFC 350',
      bouts: [
        bout({
          boutOrder: 2,
          fighterAName: 'Pereira',
          fighterBName: 'Ankalaev',
          fighterAPhotoUrl: 'https://ufc.com/pereira.png',
          fighterBPhotoUrl: 'https://ufc.com/ankalaev.png',
        }),
      ],
    })
    const imgs = [...container.querySelectorAll('img')]
    expect(imgs).toHaveLength(2)
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual([
      'https://ufc.com/pereira.png',
      'https://ufc.com/ankalaev.png',
    ])
  })

  it('renders the silhouette fallback (no image) for a missing-photo corner and a TBA corner, keeping an identical slot', () => {
    const { container } = renderChapter({
      eventName: 'UFC 351',
      bouts: [
        bout({
          boutOrder: 2,
          fighterAName: 'No Photo',
          fighterAPhotoUrl: null, // named fighter, no photo on file
          fighterBName: null, // TBA opponent
          fighterBPhotoUrl: null,
        }),
      ],
    })
    // Every row keeps two photo slots regardless; neither resolves to an <img>.
    expect(container.querySelectorAll('.mantine-Avatar-root')).toHaveLength(2)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelectorAll('.mantine-Avatar-placeholder')).toHaveLength(2)
  })

  it('marks thumbnails decorative — empty alt and aria-hidden, so the names carry meaning', () => {
    const { container } = renderChapter({
      eventName: 'UFC 352',
      bouts: [bout({ boutOrder: 2 })], // FULL base bout carries both photos
    })
    container.querySelectorAll('img').forEach((img) => {
      expect(img.getAttribute('alt')).toBe('')
    })
    container.querySelectorAll('.mantine-Avatar-root').forEach((root) => {
      expect(root.getAttribute('aria-hidden')).toBe('true')
    })
  })
})

describe('CardChapter Country Flag Rows (#45)', () => {
  it('renders a flag emoji + uppercase country below each corner that has a country', () => {
    renderChapter({
      eventName: 'UFC 360',
      bouts: [
        bout({ boutOrder: 2, fighterACountry: 'United States', fighterBCountry: 'Georgia' }),
      ],
    })
    expect(screen.getByText('UNITED STATES')).toBeTruthy()
    expect(screen.getByText('GEORGIA')).toBeTruthy()
    expect(screen.getByText('🇺🇸')).toBeTruthy()
    expect(screen.getByText('🇬🇪')).toBeTruthy()
  })

  it('renders no flag row for a corner whose country is null', () => {
    const { container } = renderChapter({
      eventName: 'UFC 361',
      bouts: [bout({ boutOrder: 2, fighterACountry: 'Brazil', fighterBCountry: null })],
    })
    expect(screen.getByText('BRAZIL')).toBeTruthy()
    // Only the A corner has a country — exactly one flag row, no empty placeholder.
    expect(container.querySelectorAll('[data-flag-row]')).toHaveLength(1)
  })

  it('renders no flag row for a TBA corner', () => {
    const { container } = renderChapter({
      eventName: 'UFC 362',
      bouts: [
        bout({
          boutOrder: 2,
          fighterAName: 'Named',
          fighterACountry: 'Brazil',
          fighterBName: null, // TBA
          fighterBCountry: null,
        }),
      ],
    })
    expect(screen.getByText('TBA')).toBeTruthy()
    expect(container.querySelectorAll('[data-flag-row]')).toHaveLength(1)
  })

  it('groups each thumbnail and its flag row into one photo-column, name beside it', () => {
    const { container } = renderChapter({
      eventName: 'UFC 363',
      bouts: [bout({ boutOrder: 2 })], // base bout: both corners have photo + country
    })
    const cols = container.querySelectorAll('[data-photo-col]')
    expect(cols).toHaveLength(2)
    cols.forEach((col) => {
      expect(col.querySelector('.mantine-Avatar-root')).toBeTruthy()
      expect(col.querySelector('[data-flag-row]')).toBeTruthy()
    })
  })
})

// The reveal behaviour is GSAP-on-scroll, which jsdom can't exercise — assert
// the wiring against the component source, per the #15 pattern.
const src = readFileSync('src/components/experience/CardChapter.tsx', 'utf8')
const css = readFileSync('src/components/experience/CardChapter.module.css', 'utf8')

describe('CardChapter reveal wiring (#30)', () => {
  it('does not pin — the chapter flows normally between two pinned chapters', () => {
    expect(src).not.toMatch(/pin:\s*true/)
    expect(src).not.toMatch(/\bpinSpacing\b/)
  })

  it('gates the stagger to motion-allowing users via matchMedia', () => {
    expect(src).toContain('gsap.matchMedia()')
    expect(src).toContain("'(prefers-reduced-motion: no-preference)'")
  })

  it('reveals rows with viewport-entry batch triggers, once each', () => {
    expect(src).toContain('ScrollTrigger.batch')
    expect(src).toContain("start: 'top 88%'")
    expect(src).toContain('once: true')
    expect(src).toContain('stagger')
  })

  it('keeps rows visible by default — pre-animation state is GSAP-applied, never CSS', () => {
    // No stranded content: the only opacity: 0 lives in gsap.set, not the stylesheet.
    expect(css).not.toContain('opacity: 0')
    expect(src).toContain('gsap.set(rows, { opacity: 0')
  })

  it("scopes clearProps to the animated props — never 'all'", () => {
    expect(src).toContain("clearProps: 'transform,opacity'")
    expect(src).not.toContain("clearProps: 'all'")
  })

  it('uses the red token only as the brand accent and no gold (ADR 0008)', () => {
    const redUses = css.match(/var\(--mantine-color-ufcRed-6\)/g) ?? []
    expect(redUses.length).toBeLessThanOrEqual(2) // eyebrow + vs mark
    // No gold/yellow values — gold is champions-only, and there are none here.
    expect(css).not.toMatch(/#(d4af37|ffd700)|color-yellow|color-gold/i)
  })

  it('re-measures ScrollTriggers when the live query mounts the ledger', () => {
    expect(src).toContain('scheduleScrollTriggerRefresh()')
  })

  it('rides thumbnails on the existing row batch — no separate per-photo trigger (ADR 0009)', () => {
    // Exactly one batch, targeting the row; thumbnails animate only as part of
    // their [data-ledger-row] li, so reduced-motion leaves them visible too.
    expect((src.match(/ScrollTrigger\.batch/g) ?? []).length).toBe(1)
    expect(src).toContain("'[data-ledger-row]'")
  })
})
