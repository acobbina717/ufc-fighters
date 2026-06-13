// Unit tests for the Card Chapter's pure grouping logic (issue #30): tier
// grouping in broadcast order, intra-tier bout ordering, main-event exclusion,
// and the TBA / label display rules — all independent of rendering.
import { describe, expect, it } from 'vitest'
import {
  boutWeightClassLabel,
  cornerDisplay,
  groupBoutsByTier,
  TIER_LABELS,
  type LedgerBout,
} from './cardLedger'

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
    ...overrides,
  }
}

describe('groupBoutsByTier', () => {
  it('groups bouts under their card tiers in broadcast order: main → prelims → early prelims', () => {
    const sections = groupBoutsByTier([
      bout({ boutOrder: 10, cardTier: 'early_prelim' }),
      bout({ boutOrder: 6, cardTier: 'prelim' }),
      bout({ boutOrder: 2, cardTier: 'main' }),
    ])
    expect(sections.map((s) => s.tier)).toEqual(['main', 'prelim', 'early_prelim'])
    expect(sections.map((s) => s.label)).toEqual(['MAIN CARD', 'PRELIMS', 'EARLY PRELIMS'])
  })

  it('orders bouts within a tier by ascending boutOrder regardless of input order', () => {
    const sections = groupBoutsByTier([
      bout({ boutOrder: 5, cardTier: 'main', fighterAName: 'Fifth' }),
      bout({ boutOrder: 2, cardTier: 'main', fighterAName: 'Second' }),
      bout({ boutOrder: 4, cardTier: 'main', fighterAName: 'Fourth' }),
      bout({ boutOrder: 3, cardTier: 'main', fighterAName: 'Third' }),
    ])
    expect(sections).toHaveLength(1)
    expect(sections[0].bouts.map((b) => b.fighterAName)).toEqual([
      'Second', 'Third', 'Fourth', 'Fifth',
    ])
  })

  it('excludes the main event (boutOrder 1) — it belongs to the hero', () => {
    const sections = groupBoutsByTier([
      bout({ boutOrder: 1, cardTier: 'main', fighterAName: 'Headliner' }),
      bout({ boutOrder: 2, cardTier: 'main', fighterAName: 'Co-Main' }),
    ])
    const names = sections.flatMap((s) => s.bouts.map((b) => b.fighterAName))
    expect(names).toEqual(['Co-Main'])
  })

  it('omits a tier with no bouts entirely', () => {
    const sections = groupBoutsByTier([
      bout({ boutOrder: 2, cardTier: 'main' }),
      bout({ boutOrder: 8, cardTier: 'early_prelim' }),
    ])
    expect(sections.map((s) => s.tier)).toEqual(['main', 'early_prelim'])
  })

  it('returns no sections when the card holds only its main event', () => {
    expect(groupBoutsByTier([bout({ boutOrder: 1 })])).toEqual([])
  })

  it('keeps TBA bouts (null fighterBName) in their tier', () => {
    const sections = groupBoutsByTier([
      bout({ boutOrder: 3, cardTier: 'prelim', fighterBName: null }),
    ])
    expect(sections[0].bouts[0].fighterBName).toBeNull()
  })

  it('carries corner photo refs through grouping for both present and absent cases', () => {
    const sections = groupBoutsByTier([
      bout({
        boutOrder: 2,
        cardTier: 'main',
        fighterAPhotoUrl: 'https://ufc.com/has.png',
        fighterBPhotoUrl: null, // opponent with no photo / TBA
      }),
    ])
    expect(sections[0].bouts[0].fighterAPhotoUrl).toBe('https://ufc.com/has.png')
    expect(sections[0].bouts[0].fighterBPhotoUrl).toBeNull()
  })

  it('labels every tier per the fight-poster vocabulary', () => {
    expect(TIER_LABELS).toEqual({
      main: 'MAIN CARD',
      prelim: 'PRELIMS',
      early_prelim: 'EARLY PRELIMS',
    })
  })
})

describe('cornerDisplay', () => {
  it('uppercases a named fighter', () => {
    expect(cornerDisplay('Alex Pereira')).toBe('ALEX PEREIRA')
  })

  it('renders TBA for an unannounced opponent (null)', () => {
    expect(cornerDisplay(null)).toBe('TBA')
  })

  it('renders TBA for a blank name', () => {
    expect(cornerDisplay('   ')).toBe('TBA')
  })
})

describe('boutWeightClassLabel', () => {
  it("renders men's divisions bare", () => {
    expect(boutWeightClassLabel('lightheavyweight', 'mens')).toBe('LIGHT HEAVYWEIGHT')
    expect(boutWeightClassLabel('lightweight', 'mens')).toBe('LIGHTWEIGHT')
  })

  it("prefixes women's divisions", () => {
    expect(boutWeightClassLabel('flyweight', 'womens')).toBe("WOMEN'S FLYWEIGHT")
  })

  it('falls back to the uppercased slug for an unknown class (e.g. catchweight)', () => {
    expect(boutWeightClassLabel('catchweight', 'mens')).toBe('CATCHWEIGHT')
  })
})
