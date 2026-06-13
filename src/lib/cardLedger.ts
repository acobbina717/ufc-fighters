// Pure grouping logic for the Card Chapter (issue #30) — THE CARD's typographic
// bout ledger. Turns a flat bout list into Card Tier sections in broadcast order
// (main card → prelims → early prelims), excluding the main event (boutOrder 1 —
// it owns the hero, matching getNextEvent's main-bout contract). Independent of
// rendering so it is unit-testable without a DOM or Convex.

export type CardTier = 'main' | 'prelim' | 'early_prelim'
export type Division = 'mens' | 'womens'

/** One bout as the Card Chapter consumes it (the shape getNextEventCard returns). */
export interface LedgerBout {
  boutOrder: number
  cardTier: CardTier
  weightClass: string
  division: Division
  fighterAName: string
  /** null = opponent unannounced — renders as TBA. */
  fighterBName: string | null
  /** Corner Thumbnail source (ADR 0009); null = TBA corner or no photo on file. */
  fighterAPhotoUrl: string | null
  /** Corner Thumbnail source (ADR 0009); null = TBA corner or no photo on file. */
  fighterBPhotoUrl: string | null
}

export interface TierSection {
  tier: CardTier
  label: string
  bouts: LedgerBout[]
}

export const TIER_LABELS: Record<CardTier, string> = {
  main: 'MAIN CARD',
  prelim: 'PRELIMS',
  early_prelim: 'EARLY PRELIMS',
}

/** Broadcast display order — top of the poster downward. */
const TIER_ORDER: readonly CardTier[] = ['main', 'prelim', 'early_prelim']

/**
 * Groups the remaining bouts of an event under Card Tier dividers.
 * - Excludes the main event (boutOrder 1) — the Hero Chapter owns it.
 * - Tiers appear in broadcast order; a tier with no bouts is omitted entirely.
 * - Within a tier, bouts sort by ascending boutOrder (top of the card first).
 */
export function groupBoutsByTier(bouts: LedgerBout[]): TierSection[] {
  const remaining = bouts.filter((b) => b.boutOrder !== 1)
  return TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    bouts: remaining
      .filter((b) => b.cardTier === tier)
      .sort((a, b) => a.boutOrder - b.boutOrder),
  })).filter((section) => section.bouts.length > 0)
}

/**
 * A corner's ledger name: the fighter's full name uppercased, or "TBA" for a
 * genuinely unannounced opponent (null / blank name).
 */
export function cornerDisplay(name: string | null): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed.toUpperCase() : 'TBA'
}

/**
 * Fight-poster weight class label. Men's bouts read bare ("LIGHT HEAVYWEIGHT
 * BOUT" territory — the BOUT suffix is the renderer's concern); women's keep
 * their prefix ("WOMEN'S FLYWEIGHT"). Unknown slugs (e.g. a catchweight)
 * fall back to the uppercased slug rather than throwing.
 */
export function boutWeightClassLabel(weightClass: string, division: Division): string {
  const label = DIVISION_LABELS[`${division}-${weightClass}`]
  return label ?? weightClass.toUpperCase()
}

// Derived by hand from src/lib/weightClasses.ts slugs — kept local so this
// module stays dependency-free and the women's prefix/men's bare-label rule
// is explicit.
const DIVISION_LABELS: Record<string, string> = {
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
  'womens-featherweight': "WOMEN'S FEATHERWEIGHT",
}
