import { describe, expect, it } from 'vitest'
import { MENS_DIVISIONS, WOMENS_DIVISIONS, formatWeightRange } from './weightClasses'
import { DIVISION_LABELS } from './cardLedger'
import { RANKINGS_SECTION_TITLE } from '../../convex/scrape'

const byKey = (key: string) => {
  const def = MENS_DIVISIONS.find((d) => d.key === key)
  if (!def) throw new Error(`no division ${key}`)
  return def
}

describe('formatWeightRange', () => {
  it('renders a division with both bounds as a full range', () => {
    expect(formatWeightRange(byKey('mens-heavyweight'))).toBe('206 – 265 LBS')
  })

  it('renders a floorless division (Strawweight) as an upper-bound-only range', () => {
    const strawweight = WOMENS_DIVISIONS.find((d) => d.key === 'womens-strawweight')!
    expect(formatWeightRange(strawweight)).toBe('UP TO 115 LBS')
  })

  it('produces a well-formed range for every division (no missing or garbage floor)', () => {
    for (const def of [...MENS_DIVISIONS, ...WOMENS_DIVISIONS]) {
      expect(formatWeightRange(def), def.key).toMatch(/^(UP TO \d+|\d+ – \d+) LBS$/)
    }
  })
})

// ─── Single-source-of-truth derivation (#70) ──────────────────────────────────
// weightClasses.ts is the canonical division registry; cardLedger's DIVISION_LABELS
// and scrape's RANKINGS_SECTION_TITLE are DERIVED from it. These fixtures capture
// the values the two tables held while hand-maintained — the derivation must keep
// producing exactly these entries for every active division.

// Snapshot of the pre-refactor hand-maintained cardLedger DIVISION_LABELS,
// minus 'womens-featherweight' (no active ranked division — dropped on derivation,
// its absence is now the documentation; the bare-slug fallback still labels a
// one-off women's FW bout).
const EXPECTED_DIVISION_LABELS: Record<string, string> = {
  'mens-flyweight': 'FLYWEIGHT',
  'mens-bantamweight': 'BANTAMWEIGHT',
  'mens-featherweight': 'FEATHERWEIGHT',
  'mens-lightweight': 'LIGHTWEIGHT',
  'mens-welterweight': 'WELTERWEIGHT',
  'mens-middleweight': 'MIDDLEWEIGHT',
  'mens-lightheavyweight': 'LIGHT HEAVYWEIGHT',
  'mens-heavyweight': 'HEAVYWEIGHT',
  'womens-strawweight': "WOMEN'S STRAWWEIGHT",
  'womens-flyweight': "WOMEN'S FLYWEIGHT",
  'womens-bantamweight': "WOMEN'S BANTAMWEIGHT",
}

// Snapshot of the pre-refactor hand-maintained scrape RANKINGS_SECTION_TITLE.
// Titles are HTML-entity-encoded exactly as ufc.com/rankings renders the section
// headers (women's divisions carry the &#039; apostrophe). Women's Featherweight
// is absent — no active ranked section.
const EXPECTED_RANKINGS_SECTION_TITLE: Record<
  string,
  { title: string; division: 'mens' | 'womens' }
> = {
  'mens-flyweight': { title: 'Flyweight', division: 'mens' },
  'mens-bantamweight': { title: 'Bantamweight', division: 'mens' },
  'mens-featherweight': { title: 'Featherweight', division: 'mens' },
  'mens-lightweight': { title: 'Lightweight', division: 'mens' },
  'mens-welterweight': { title: 'Welterweight', division: 'mens' },
  'mens-middleweight': { title: 'Middleweight', division: 'mens' },
  'mens-lightheavyweight': { title: 'Light Heavyweight', division: 'mens' },
  'mens-heavyweight': { title: 'Heavyweight', division: 'mens' },
  'womens-strawweight': { title: 'Women&#039;s Strawweight', division: 'womens' },
  'womens-flyweight': { title: 'Women&#039;s Flyweight', division: 'womens' },
  'womens-bantamweight': { title: 'Women&#039;s Bantamweight', division: 'womens' },
}

describe('DIVISION_LABELS (derived from weightClasses)', () => {
  it('produces exactly the hand-maintained labels for every active division', () => {
    expect(DIVISION_LABELS).toEqual(EXPECTED_DIVISION_LABELS)
  })

  it('keys on the canonical WeightClassDef.key for every registry division', () => {
    for (const def of [...MENS_DIVISIONS, ...WOMENS_DIVISIONS]) {
      expect(DIVISION_LABELS[def.key], def.key).toBeDefined()
    }
  })

  it("omits women's featherweight — it has no active ranked division", () => {
    expect(DIVISION_LABELS['womens-featherweight']).toBeUndefined()
  })
})

describe('RANKINGS_SECTION_TITLE (derived from weightClasses)', () => {
  it('produces exactly the hand-maintained section titles for every ranked division', () => {
    expect(RANKINGS_SECTION_TITLE).toEqual(EXPECTED_RANKINGS_SECTION_TITLE)
  })

  it('carries the correct gender for every ranked division', () => {
    for (const [key, config] of Object.entries(RANKINGS_SECTION_TITLE)) {
      expect(config.division, key).toBe(key.startsWith('womens-') ? 'womens' : 'mens')
    }
  })

  it("omits women's featherweight — it would only ever scrape empty", () => {
    expect(RANKINGS_SECTION_TITLE['womens-featherweight']).toBeUndefined()
  })
})
