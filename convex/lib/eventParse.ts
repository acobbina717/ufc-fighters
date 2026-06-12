// Pure HTML parsers for UFC event pages. No Convex imports — unit-testable in
// isolation against real HTML fixtures (see __fixtures__/).

export interface ParsedEvent {
  slug: string
  name: string
  timestamp: number // Unix seconds, as published in data-main-card-timestamp
}

// Parses ufc.com/events. Returns only the events in the "Upcoming" section —
// the listing also renders a "Past" section which must be excluded.
export function parseEventListing(html: string): ParsedEvent[] {
  const start = html.indexOf('id="events-list-upcoming"')
  if (start === -1) return []
  const past = html.indexOf('id="events-list-past"')
  const segment = past === -1 ? html.slice(start) : html.slice(start, past)

  const events: ParsedEvent[] = []
  // Each event renders one info block carrying both the headline and date.
  const blocks = segment.split('c-card-event--result__info')
  for (const block of blocks) {
    const headline = block.match(
      /c-card-event--result__headline"><a href="\/event\/([^"]+)">([^<]+)<\/a>/
    )
    if (!headline) continue
    const ts = block.match(/data-main-card-timestamp="(\d+)"/)
    if (!ts) continue

    events.push({
      slug: headline[1],
      name: headline[2].trim(),
      timestamp: parseInt(ts[1], 10),
    })
  }
  return events
}

export type CardTier = 'main' | 'prelim' | 'early_prelim'

export interface ParsedBout {
  fighterASlug: string // always the known (red-corner) fighter
  fighterAName?: string // display name as rendered on the card, diacritics intact
  fighterBSlug?: string // absent = TBA opponent not yet announced
  fighterBName?: string
  weightClass: string // normalized bare key, e.g. "lightheavyweight"
  division: 'mens' | 'womens' // derived from the class label
  boutOrder: number // 1 = main event, ascending down the card
  cardTier: CardTier
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
}

// Collapses a UFC class label ("Women's Flyweight Title Bout") to a bare weight
// class key ("flyweight") matching the fighters table's weightClass values.
function normalizeWeightClass(label: string): string {
  return label
    .replace(/&#039;|&#39;/g, "'")
    .replace(/women's|men's|title|bout|catch\s*weight/gi, (m) =>
      /catch/i.test(m) ? 'catchweight' : ''
    )
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim()
}

// The SSR HTML lists every bout in one flat, card-order list with no per-fight
// tier marker — the Main/Prelims/Early tabs are applied client-side. We derive
// tier from bout order: top 5 are the main card, the bottom 3 are early prelims
// on a deep (11+) card, everything between is prelims. Approximate by design.
function tierForOrder(boutOrder: number, total: number): CardTier {
  if (boutOrder <= 5) return 'main'
  if (total >= 11 && boutOrder > total - 3) return 'early_prelim'
  return 'prelim'
}

// Parses an individual ufc.com/event/{slug} page into its scheduled bouts.
export function parseEventCard(html: string): ParsedBout[] {
  const blocks = html
    .split(/(?=<div class="c-listing-fight" data-fmid=)/)
    .filter((b) => b.startsWith('<div class="c-listing-fight" data-fmid='))

  const cornerSlug = (block: string, corner: 'red' | 'blue') =>
    block.match(
      new RegExp(
        `corner-image--${corner}">\\s*<a href="https://www\\.ufc\\.com/athlete/([a-z0-9-]+)"`
      )
    )?.[1]

  // The corner-name block renders either given/family-name spans or the plain
  // anchor text — both carry the true display name (diacritics intact), unlike
  // the athlete slug.
  const cornerName = (block: string, corner: 'red' | 'blue') => {
    const div = block.match(
      new RegExp(`corner-name--${corner}">([\\s\\S]*?)</div>`)
    )?.[1]
    if (!div) return undefined
    const given = div.match(/corner-given-name">([^<]*)</)?.[1]
    const family = div.match(/corner-family-name">([^<]*)</)?.[1]
    const raw =
      given || family
        ? [given, family].filter(Boolean).join(' ')
        : div.replace(/<[^>]+>/g, '')
    const name = decodeEntities(raw).replace(/\s+/g, ' ').trim()
    return name || undefined
  }

  const parsed: Array<Omit<ParsedBout, 'cardTier'>> = []
  for (const block of blocks) {
    const fighterASlug = cornerSlug(block, 'red')
    // A bout with no known red-corner fighter can't anchor a fighterAId — skip it.
    if (!fighterASlug) continue

    const classLabel = block.match(/c-listing-fight__class-text">([^<]+)</)?.[1] ?? ''

    parsed.push({
      fighterASlug,
      fighterAName: cornerName(block, 'red'),
      fighterBSlug: cornerSlug(block, 'blue'),
      fighterBName: cornerName(block, 'blue'),
      weightClass: normalizeWeightClass(classLabel),
      division: /women/i.test(classLabel) ? 'womens' : 'mens',
      boutOrder: parsed.length + 1,
    })
  }

  return parsed.map((b) => ({ ...b, cardTier: tierForOrder(b.boutOrder, parsed.length) }))
}

export interface ParsedVenue {
  venue: string // e.g. "T-Mobile Arena"
  location: string // e.g. "Las Vegas, United States"
}

// Parses the venue block from an individual event page's hero. The field
// renders as "Venue, \n Locality \n Country" in one div.
export function parseEventVenue(html: string): ParsedVenue | undefined {
  const m = html.match(/field--name-venue[^>]*>([\s\S]*?)<\/div>/)
  if (!m) return undefined
  const lines = decodeEntities(m[1].replace(/<[^>]+>/g, ''))
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  const [venue, ...rest] = lines
  return { venue, location: rest.join(', ') }
}
