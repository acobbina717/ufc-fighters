// Pure grouping logic for the Card Chapter (issue #30) — THE CARD's typographic
// bout ledger. Turns a flat bout list into Card Tier sections in broadcast order
// (main card → prelims → early prelims). THE CARD lists the FULL event card,
// including the main event (boutOrder 1) the Hero also features. Independent of
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
  /** Country Flag Row source (issue #45); null = TBA corner or no country on file. */
  fighterACountry: string | null
  /** Country Flag Row source (issue #45); null = TBA corner or no country on file. */
  fighterBCountry: string | null
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
 * Groups every bout of an event under Card Tier dividers.
 * - Includes the main event (boutOrder 1) — THE CARD shows the full fight card.
 * - Tiers appear in broadcast order; a tier with no bouts is omitted entirely.
 * - Within a tier, bouts sort by ascending boutOrder (top of the card first).
 */
export function groupBoutsByTier(bouts: LedgerBout[]): TierSection[] {
  return TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    bouts: bouts
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

/**
 * Country Flag Row source (issue #45): the Unicode flag emoji for a fighter's
 * country of record, or null when there is no country (TBA / none on file) or
 * no mapping for it. Keyed on the full English country name UFC.com uses
 * (e.g. "United States", "Georgia"). Dependency-free — the emoji is derived
 * from the ISO 3166-1 alpha-2 code's two Regional Indicator code points, with
 * a small carve-out for the UK home nations (subdivision tag flags).
 */
export function countryFlag(country: string | null): string | null {
  if (!country) return null
  const subdivision = SUBDIVISION_FLAGS[country]
  if (subdivision) return subdivision
  const code = COUNTRY_ISO[country]
  if (!code) return null
  // 'A' (0x41) → Regional Indicator Symbol Letter A (0x1F1E6); offset 0x1F1A5.
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  )
}

// Full English country name → ISO 3166-1 alpha-2. Covers the nations that
// regularly appear on a UFC card; an unmapped country simply renders no flag.
const COUNTRY_ISO: Record<string, string> = {
  'United States': 'US',
  Brazil: 'BR',
  Russia: 'RU',
  Canada: 'CA',
  Mexico: 'MX',
  Australia: 'AU',
  'New Zealand': 'NZ',
  Ireland: 'IE',
  'United Kingdom': 'GB',
  Poland: 'PL',
  Georgia: 'GE',
  France: 'FR',
  Germany: 'DE',
  Netherlands: 'NL',
  Sweden: 'SE',
  Norway: 'NO',
  Finland: 'FI',
  Denmark: 'DK',
  Spain: 'ES',
  Italy: 'IT',
  Portugal: 'PT',
  Switzerland: 'CH',
  Austria: 'AT',
  Belgium: 'BE',
  Croatia: 'HR',
  Serbia: 'RS',
  Czechia: 'CZ',
  'Czech Republic': 'CZ',
  Slovakia: 'SK',
  Lithuania: 'LT',
  Moldova: 'MD',
  Ukraine: 'UA',
  Belarus: 'BY',
  Turkey: 'TR',
  Greece: 'GR',
  Iceland: 'IS',
  China: 'CN',
  Japan: 'JP',
  'South Korea': 'KR',
  Thailand: 'TH',
  Philippines: 'PH',
  Singapore: 'SG',
  India: 'IN',
  Indonesia: 'ID',
  Kazakhstan: 'KZ',
  Kyrgyzstan: 'KG',
  Uzbekistan: 'UZ',
  Tajikistan: 'TJ',
  Azerbaijan: 'AZ',
  Armenia: 'AM',
  Iran: 'IR',
  Iraq: 'IQ',
  Jordan: 'JO',
  Bahrain: 'BH',
  Israel: 'IL',
  'South Africa': 'ZA',
  Nigeria: 'NG',
  Cameroon: 'CM',
  'Democratic Republic of the Congo': 'CD',
  Angola: 'AO',
  Suriname: 'SR',
  Argentina: 'AR',
  Chile: 'CL',
  Peru: 'PE',
  Ecuador: 'EC',
  Colombia: 'CO',
  Venezuela: 'VE',
  Bolivia: 'BO',
  Panama: 'PA',
  Cuba: 'CU',
  'Dominican Republic': 'DO',
  Jamaica: 'JM',
}

// UK home nations carry their own subdivision tag-sequence flags rather than
// the Union Jack — common enough on a UFC card to be worth the carve-out.
const SUBDIVISION_FLAGS: Record<string, string> = {
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
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
