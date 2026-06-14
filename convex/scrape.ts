import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'
import { parseEventCard, parseEventListing, parseEventVenue } from './lib/eventParse'
import {
  getEligiblePostEventWeightClasses,
  isPostEventSyncEligible,
} from './lib/postEventSync'

// Maps our division keys to the section title on ufc.com/rankings
const RANKINGS_SECTION_TITLE: Record<string, { title: string; division: 'mens' | 'womens' }> = {
  'mens-flyweight':        { title: 'Flyweight',                   division: 'mens' },
  'mens-bantamweight':     { title: 'Bantamweight',                division: 'mens' },
  'mens-featherweight':    { title: 'Featherweight',               division: 'mens' },
  'mens-lightweight':      { title: 'Lightweight',                 division: 'mens' },
  'mens-welterweight':     { title: 'Welterweight',                division: 'mens' },
  'mens-middleweight':     { title: 'Middleweight',                division: 'mens' },
  'mens-lightheavyweight': { title: 'Light Heavyweight',           division: 'mens' },
  'mens-heavyweight':      { title: 'Heavyweight',                 division: 'mens' },
  'womens-strawweight':    { title: "Women&#039;s Strawweight",    division: 'womens' },
  'womens-flyweight':      { title: "Women&#039;s Flyweight",      division: 'womens' },
  'womens-bantamweight':   { title: "Women&#039;s Bantamweight",   division: 'womens' },
  // Women's Featherweight is intentionally omitted: the UFC has no active ranked
  // division for it, so it would only ever scrape empty. A one-off women's FW
  // bout still renders via its cardLedger label. See ADR 0010.
}

// Every weight class with an active rankings section — the backfill set for a
// cold-start / full reseed. Derived from RANKINGS_SECTION_TITLE so empty
// divisions (e.g. women's featherweight) are never scraped.
const ALL_RANKING_KEYS = Object.keys(RANKINGS_SECTION_TITLE)

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ─── Photo storage helper ──────────────────────────────────────────────────────
interface StorageLike {
  store(blob: Blob): Promise<string>
  getUrl(storageId: string): Promise<string | null>
}

async function downloadAndStorePhoto(storage: StorageLike, ufcPhotoUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(ufcPhotoUrl, {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.ufc.com/', Accept: 'image/*' },
    })
    if (!res.ok) return undefined
    const blob = await res.blob()
    const storageId = await storage.store(blob)
    return (await storage.getUrl(storageId)) ?? undefined
  } catch {
    return undefined
  }
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function strip(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ').trim()
}

function parseNum(val: string): number {
  const n = parseFloat(val.replace('%', ''))
  return isNaN(n) ? 0 : n
}

// ─── Nationality parser ───────────────────────────────────────────────────────
// UFC athlete pages encode nationality as a demonym (e.g. "American", "Brazilian").
// We normalise to a full country name so it matches the COUNTRY_ISO map in cardLedger.ts.
const DEMONYM_TO_COUNTRY: Record<string, string> = {
  American: 'United States', Brazilian: 'Brazil', Russian: 'Russia',
  Canadian: 'Canada', Mexican: 'Mexico', Australian: 'Australia',
  'New Zealander': 'New Zealand', Irish: 'Ireland', British: 'United Kingdom',
  English: 'United Kingdom', Scottish: 'United Kingdom', Welsh: 'United Kingdom',
  Polish: 'Poland', Georgian: 'Georgia', French: 'France', German: 'Germany',
  Dutch: 'Netherlands', Swedish: 'Sweden', Norwegian: 'Norway', Finnish: 'Finland',
  Danish: 'Denmark', Spanish: 'Spain', Italian: 'Italy', Portuguese: 'Portugal',
  Swiss: 'Switzerland', Austrian: 'Austria', Belgian: 'Belgium', Croatian: 'Croatia',
  Serbian: 'Serbia', Czech: 'Czechia', Slovak: 'Slovakia', Lithuanian: 'Lithuania',
  Moldovan: 'Moldova', Ukrainian: 'Ukraine', Belarusian: 'Belarus', Turkish: 'Turkey',
  Greek: 'Greece', Icelandic: 'Iceland', Chinese: 'China', Japanese: 'Japan',
  'South Korean': 'South Korea', Korean: 'South Korea', Thai: 'Thailand',
  Filipino: 'Philippines', Singaporean: 'Singapore', Indian: 'India',
  Indonesian: 'Indonesia', Kazakhstani: 'Kazakhstan', Kyrgyz: 'Kyrgyzstan',
  Uzbek: 'Uzbekistan', Azerbaijani: 'Azerbaijan', Armenian: 'Armenia',
  Iranian: 'Iran', Peruvian: 'Peru', Ecuadorian: 'Ecuador', Colombian: 'Colombia',
  Venezuelan: 'Venezuela', Argentinian: 'Argentina', Chilean: 'Chile',
  Bolivian: 'Bolivia', Paraguayan: 'Paraguay', Uruguayan: 'Uruguay',
  Jamaican: 'Jamaica', Puerto: 'Puerto Rico', Nigerian: 'Nigeria',
  'South African': 'South Africa', Cameroonian: 'Cameroon', Congolese: 'DR Congo',
  Moroccan: 'Morocco', Egyptian: 'Egypt', Jordanian: 'Jordan', Bahraini: 'Bahrain',
  Israeli: 'Israel', Iraqi: 'Iraq',
}

function parseAthleteCountry(html: string): string | undefined {
  // UFC athlete pages list nationality as a labelled bio field.
  // Pattern: "Nationality" label followed (within ~300 chars) by the value in a text element.
  const m = html.match(/Nationality[\s\S]{0,300}?<div[^>]*class="[^"]*c-bio__text[^"]*"[^>]*>\s*([^<]+?)\s*</)
  if (!m) return undefined
  const raw = m[1].trim()
  return DEMONYM_TO_COUNTRY[raw] ?? raw
}

// ─── Step 1: Parse ufc.com/rankings ──────────────────────────────────────────
interface RankedFighter {
  name: string
  ufcSlug: string
  photoUrl?: string
  ranking: number  // 0 = champion, 1-15 = ranked
}

function parseRankingsPage(html: string, weightClassKey: string): RankedFighter[] {
  const config = RANKINGS_SECTION_TITLE[weightClassKey]
  if (!config) return []

  const sections = html.split('<div class="view-grouping"')
  for (const sec of sections) {
    const headerMatch = sec.match(/<div class="view-grouping-header">([\s\S]*?)<\/div>/)
    if (!headerMatch) continue
    const headerText = strip(headerMatch[1]).replace(/&#039;/g, "'")
    const configTitle = config.title.replace(/&#039;/g, "'")
    if (headerText !== configTitle) continue

    const fighters: RankedFighter[] = []

    // Champion (in <caption> block)
    const captionMatch = sec.match(/<caption>([\s\S]*?)<\/caption>/)
    if (captionMatch) {
      const cap = captionMatch[1]
      const nameMatch = cap.match(/href="\/athlete\/([^"]+)"[^>]*>([^<]+)<\/a>/)
      const imgMatch = cap.match(/src="(https:\/\/ufc\.com\/images\/[^"]+)"/)
      if (nameMatch) {
        fighters.push({
          name: strip(nameMatch[2]),
          ufcSlug: nameMatch[1],
          photoUrl: imgMatch?.[1],
          ranking: 0,
        })
      }
    }

    // Ranked fighters from table rows
    const tableSection = sec.match(/<tbody>([\s\S]*?)<\/tbody>/)
    if (tableSection) {
      const rows = tableSection[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)
      for (const rowMatch of rows) {
        const row = rowMatch[1]
        const rankMatch = row.match(/<td[^>]*>\s*(\d+)\s*<\/td>/)
        const nameMatch = row.match(/href="\/athlete\/([^"]+)"[^>]*>([^<]+)<\/a>/)
        if (rankMatch && nameMatch) {
          fighters.push({
            name: strip(nameMatch[2]),
            ufcSlug: nameMatch[1],
            ranking: parseInt(rankMatch[1]),
          })
        }
      }
    }

    return fighters
  }
  return []
}

// Normalize name for fuzzy comparison: lowercase + strip diacritics + strip non-alpha
function normName(s: string): string {
  // Simple diacritic removal via decomposition
  const map: Record<string, string> = {
    à:'a',á:'a',â:'a',ã:'a',ä:'a',å:'a',
    è:'e',é:'e',ê:'e',ë:'e',
    ì:'i',í:'i',î:'i',ï:'i',
    ò:'o',ó:'o',ô:'o',õ:'o',ö:'o',
    ù:'u',ú:'u',û:'u',ü:'u',
    ñ:'n',ç:'c',ý:'y',ÿ:'y',
    ß:'ss',
  }
  return s
    .toLowerCase()
    .replace(/[^\u0000-\u007E]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Step 2: Search ufcstats.com for a fighter by name ───────────────────────
interface UfcStatsSearchResult {
  ufcStatsUrl: string
  nickname: string
  wins: number
  losses: number
  draws: number
}

async function searchUfcStats(name: string): Promise<UfcStatsSearchResult | null> {
  const targetNorm = normName(name)
  const lastNameNorm = normName(name.split(' ').slice(-1)[0])

  // Try full name first, then last name only
  const queries = [name, name.split(' ').slice(-1)[0]]

  for (const query of queries) {
    const url = `http://www.ufcstats.com/statistics/fighters/search?query=${encodeURIComponent(query)}`
    let html: string
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
      if (!res.ok) continue
      html = await res.text()
    } catch {
      continue
    }

    const rows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)
    for (const rowMatch of rows) {
      const row = rowMatch[1]
      if (!row.includes('fighter-details')) continue

      const cells: string[] = []
      for (const m of row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)) cells.push(m[1])
      if (cells.length < 10) continue

      const rowNorm = normName(`${strip(cells[0])} ${strip(cells[1])}`)

      // Match on normalized full name or normalized last name
      if (rowNorm !== targetNorm && !rowNorm.endsWith(lastNameNorm)) continue

      const hrefMatch = cells[0].match(/href="([^"]+fighter-details[^"]+)"/)
      if (!hrefMatch) continue

      return {
        ufcStatsUrl: hrefMatch[1],
        nickname: strip(cells[2]),
        wins: parseInt(strip(cells[7])) || 0,
        losses: parseInt(strip(cells[8])) || 0,
        draws: parseInt(strip(cells[9])) || 0,
      }
    }
  }
  return null
}

// ─── Step 3: Parse fighter detail page ───────────────────────────────────────
interface FighterStats {
  slpm: number; strikingAccuracy: number; sapm: number; strikingDefense: number
  takedownAvg: number; takedownAccuracy: number; takedownDefense: number; submissionAvg: number
}

function parseDetailPage(html: string): { stats: FighterStats; nickname?: string; weight?: string } {
  const items: string[] = []
  for (const m of html.matchAll(/<li class="b-list__box-list-item[^"]*">([\s\S]*?)<\/li>/g)) {
    const text = strip(m[1])
    if (text) items.push(text)
  }

  function get(label: string) {
    const item = items.find((i) => i.startsWith(label + ':'))
    return item ? parseNum(item.slice(label.length + 1).trim()) : 0
  }

  function getString(label: string): string | undefined {
    const item = items.find((i) => i.startsWith(label + ':'))
    return item ? item.slice(label.length + 1).trim().replace(/\.$/, '') || undefined : undefined
  }

  const nickMatch = html.match(/<p class="b-content__Nickname"[^>]*>([\s\S]*?)<\/p>/)

  return {
    stats: {
      slpm:             get('SLpM'),
      strikingAccuracy: get('Str. Acc.'),
      sapm:             get('SApM'),
      strikingDefense:  get('Str. Def'),
      takedownAvg:      get('TD Avg.'),
      takedownAccuracy: get('TD Acc.'),
      takedownDefense:  get('TD Def.'),
      submissionAvg:    get('Sub. Avg.'),
    },
    nickname: nickMatch ? strip(nickMatch[1]) || undefined : undefined,
    weight: getString('Weight'),
  }
}

const STALE_MS = 24 * 60 * 60 * 1000

// ─── Main export ──────────────────────────────────────────────────────────────
interface ScrapeWeightClassResult {
  fullScrape: number
  metaOnly: number
  skipped: number
  pruned?: number
  weightClass?: string
}

export const scrapeWeightClass = action({
  args: { weightClassKey: v.string() },
  handler: async (ctx, { weightClassKey }): Promise<ScrapeWeightClassResult> => {
    if (!RANKINGS_SECTION_TITLE[weightClassKey]) {
      console.log(`${weightClassKey} has no rankings — skipping`)
      return { fullScrape: 0, metaOnly: 0, skipped: 0 }
    }

    const weightClass = weightClassKey.replace(/^(mens|womens)-/, '')
    const division = RANKINGS_SECTION_TITLE[weightClassKey].division
    const now = Date.now()

    // 1. Current DB state — used to decide what each fighter needs
    const existing = await ctx.runQuery(api.fighters.getByWeightClass, { weightClass, division })
    type DbFighter = (typeof existing)[number]
    const bySlug = new Map<string, DbFighter>(existing.map((f) => [f.ufcUrl, f]))

    // 2. Fetch live rankings from ufc.com
    const rankingsRes = await fetch('https://www.ufc.com/rankings', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    })
    if (!rankingsRes.ok) throw new Error(`Rankings fetch failed: ${rankingsRes.status}`)
    const rankedFighters = parseRankingsPage(await rankingsRes.text(), weightClassKey)
    if (rankedFighters.length === 0) return { fullScrape: 0, metaOnly: 0, skipped: 0 }

    // Prune ghost fighters: anyone in the DB for this weight class who has dropped
    // off the rankings and has no bout history (ADR 0010). Runs before the upsert
    // pass so deletions don't race the writes below.
    const pruned = await ctx.runMutation(api.fighters.pruneFighters, {
      weightClass,
      division,
      rankedSlugs: rankedFighters.map((f) => f.ufcSlug),
    })

    let fullScrape = 0, metaOnly = 0, skipped = 0

    for (const ranked of rankedFighters) {
      const db = bySlug.get(ranked.ufcSlug)
      const isNew   = !db
      const isStale = !db || (now - db.lastSynced) > STALE_MS
      const rankingChanged = db && db.ranking !== ranked.ranking

      // ── Fresh fighter whose ranking hasn't changed → skip entirely
      if (!isNew && !isStale && !rankingChanged) {
        skipped++
        continue
      }

      // ── Fresh fighter with only ranking change → cheap patch, no HTTP fetches
      if (!isNew && !isStale && rankingChanged) {
        await ctx.runMutation(api.fighters.patchFighter, {
          ufcUrl: ranked.ufcSlug,
          ranking: ranked.ranking,
        })
        metaOnly++
        continue
      }

      // ── New fighter or stale data → full fetch: photo + ufcstats search + detail page
      // Always fetch the athlete page to get the full-body image and nationality
      let photoUrl: string | undefined
      let country: string | undefined
      try {
        const res = await fetch(`https://www.ufc.com/athlete/${ranked.ufcSlug}`, {
          headers: { 'User-Agent': UA, Accept: 'text/html' },
        })
        if (res.ok) {
          const html = await res.text()
          const fullBody = html.match(/src="(https?:\/\/ufc\.com\/images\/styles\/athlete_bio_full_body\/[^"]+)"/)
          if (fullBody?.[1]) {
            photoUrl = await downloadAndStorePhoto(ctx.storage, fullBody[1])
          }
          country = parseAthleteCountry(html)
        }
      } catch { /* keep going without photo or country */ }

      let wins = 0, losses = 0, draws = 0
      let nickname: string | undefined
      let weight: string | undefined
      let ufcStatsUrl = db?.ufcStatsUrl ?? `https://www.ufc.com/athlete/${ranked.ufcSlug}`
      let stats: FighterStats = db?.stats ?? {
        slpm: 0, strikingAccuracy: 0, sapm: 0, strikingDefense: 0,
        takedownAvg: 0, takedownAccuracy: 0, takedownDefense: 0, submissionAvg: 0,
      }

      const searchResult = await searchUfcStats(ranked.name)
      if (searchResult) {
        ufcStatsUrl = searchResult.ufcStatsUrl
        wins = searchResult.wins
        losses = searchResult.losses
        draws = searchResult.draws
        nickname = searchResult.nickname || undefined

        try {
          const res = await fetch(searchResult.ufcStatsUrl, {
            headers: { 'User-Agent': UA, Accept: 'text/html' },
          })
          if (res.ok) {
            const parsed = parseDetailPage(await res.text())
            stats = parsed.stats
            if (parsed.nickname) nickname = parsed.nickname
            if (parsed.weight) weight = parsed.weight
          }
        } catch (err) {
          console.error(`Detail fetch failed for ${ranked.name}:`, err)
        }
      } else {
        console.log(`ufcstats search miss: ${ranked.name}`)
      }

      if (isNew) {
        // Insert brand-new fighter
        await ctx.runMutation(api.fighters.upsertFighter, {
          name: ranked.name,
          nickname,
          weightClass,
          division,
          ranking: ranked.ranking,
          record: { wins, losses, draws, noContests: 0 },
          stats,
          weight,
          country,
          photoUrl,
          ufcUrl: ranked.ufcSlug,
          ufcStatsUrl,
          lastSynced: now,
        })
      } else {
        // Patch only the fields that actually differ
        await ctx.runMutation(api.fighters.patchFighter, {
          ufcUrl: ranked.ufcSlug,
          ranking: ranked.ranking,
          photoUrl: photoUrl ?? undefined,
          nickname,
          weight,
          country,
          weightClass,
          division,
          record: { wins, losses, draws, noContests: 0 },
          stats,
          lastSynced: now,
        })
      }
      fullScrape++
    }

    console.log(`${weightClassKey}: fullScrape=${fullScrape} metaOnly=${metaOnly} skipped=${skipped} pruned=${pruned}`)
    return { fullScrape, metaOnly, skipped, pruned, weightClass: weightClassKey }
  },
})

export const refreshAllPhotos = action({
  args: {},
  handler: async (ctx): Promise<{ total: number; updated: number }> => {
    const fighters = await ctx.runQuery(api.fighters.getAllFighters) as Array<{ _id: string; ufcUrl: string; photoUrl?: string }>
    let updated = 0
    for (const fighter of fighters) {
      try {
        const res = await fetch(`https://www.ufc.com/athlete/${fighter.ufcUrl}`, {
          headers: { 'User-Agent': UA, Accept: 'text/html' },
        })
        if (!res.ok) continue
        const html = await res.text()
        const fullBody = html.match(/src="(https?:\/\/ufc\.com\/images\/styles\/athlete_bio_full_body\/[^"]+)"/)
        if (fullBody?.[1]) {
          const photoUrl = await downloadAndStorePhoto(ctx.storage, fullBody[1])
          if (photoUrl) {
            await ctx.runMutation(api.fighters.updateFighterPhoto, { ufcUrl: fighter.ufcUrl, photoUrl })
            updated++
          }
        }
      } catch { /* skip failed fighters */ }
    }
    return { total: fighters.length, updated }
  },
})

// ─── Event scraping ───────────────────────────────────────────────────────────

// Turns a UFC athlete slug ("conor-mcgregor") into a display name. Fallback only —
// the card's rendered name (diacritics intact) is preferred when available;
// searchUfcStats normalizes case/diacritics, so this still resolves the record.
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Full-scrapes a fighter discovered on a fight card (not via rankings) and
// inserts them with no ranking. Presence on a scheduled card is proof of
// activity. Returns the new fighter's id, or null if the insert couldn't run.
async function fullScrapeFighter(
  ctx: ActionCtx,
  slug: string,
  weightClass: string,
  division: 'mens' | 'womens',
  displayName?: string
): Promise<Id<'fighters'> | null> {
  const name = displayName ?? slugToName(slug)
  const now = Date.now()

  let photoUrl: string | undefined
  try {
    const res = await fetch(`https://www.ufc.com/athlete/${slug}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    })
    if (res.ok) {
      const html = await res.text()
      const fullBody = html.match(/src="(https?:\/\/ufc\.com\/images\/styles\/athlete_bio_full_body\/[^"]+)"/)
      if (fullBody?.[1]) photoUrl = await downloadAndStorePhoto(ctx.storage, fullBody[1])
    }
  } catch { /* keep going without photo */ }

  let wins = 0, losses = 0, draws = 0
  let nickname: string | undefined
  let weight: string | undefined
  let ufcStatsUrl = `https://www.ufc.com/athlete/${slug}`
  let stats: FighterStats = {
    slpm: 0, strikingAccuracy: 0, sapm: 0, strikingDefense: 0,
    takedownAvg: 0, takedownAccuracy: 0, takedownDefense: 0, submissionAvg: 0,
  }

  const searchResult = await searchUfcStats(name)
  if (searchResult) {
    ufcStatsUrl = searchResult.ufcStatsUrl
    wins = searchResult.wins
    losses = searchResult.losses
    draws = searchResult.draws
    nickname = searchResult.nickname || undefined
    try {
      const res = await fetch(searchResult.ufcStatsUrl, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
      })
      if (res.ok) {
        const parsed = parseDetailPage(await res.text())
        stats = parsed.stats
        if (parsed.nickname) nickname = parsed.nickname
        if (parsed.weight) weight = parsed.weight
      }
    } catch (err) {
      console.error(`Detail fetch failed for ${name}:`, err)
    }
  }

  return await ctx.runMutation(api.fighters.upsertFighter, {
    name,
    nickname,
    weightClass,
    division,
    record: { wins, losses, draws, noContests: 0 },
    stats,
    weight,
    photoUrl,
    ufcUrl: slug,
    ufcStatsUrl,
    lastSynced: now,
  })
}

// Scrapes all upcoming UFC events and their full fight cards. Cron-triggered
// (daily) — see convex/crons.ts. Idempotent: events are upserted by slug and
// each event's bouts are fully replaced on every run.
export const scrapeEvents = action({
  args: {},
  handler: async (ctx): Promise<{ events: number; bouts: number; fightersScraped: number }> => {
    const now = Date.now()

    const listRes = await fetch('https://www.ufc.com/events', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    })
    if (!listRes.ok) throw new Error(`Events fetch failed: ${listRes.status}`)
    const upcoming = parseEventListing(await listRes.text())

    // Resolve card slugs to existing fighter ids without pulling full documents.
    const fighterRows = await ctx.runQuery(api.events.ufcUrlToId)
    const idBySlug = new Map<string, Id<'fighters'>>(fighterRows.map((r) => [r.ufcUrl, r.id]))

    let boutCount = 0, fightersScraped = 0

    for (const ev of upcoming) {
      // Fetch the card page before upserting so venue/location ride along.
      let cardHtml: string | null = null
      try {
        const res = await fetch(`https://www.ufc.com/event/${ev.slug}`, {
          headers: { 'User-Agent': UA, Accept: 'text/html' },
        })
        if (res.ok) cardHtml = await res.text()
      } catch { /* upsert the event anyway; bouts skipped below */ }

      const venueInfo = cardHtml ? parseEventVenue(cardHtml) : undefined
      const eventId = await ctx.runMutation(api.events.upsertEvent, {
        slug: ev.slug,
        name: ev.name,
        date: ev.timestamp * 1000, // store ms to compare against Date.now()
        venue: venueInfo?.venue ?? '',
        location: venueInfo?.location ?? '',
        lastSynced: now,
      })
      if (!cardHtml) continue

      const resolve = async (
        slug: string,
        weightClass: string,
        division: 'mens' | 'womens',
        displayName?: string
      ) => {
        const cached = idBySlug.get(slug)
        if (cached) return cached
        let id: Id<'fighters'> | null = null
        try {
          id = await fullScrapeFighter(ctx, slug, weightClass, division, displayName)
        } catch (err) {
          console.error(`fullScrapeFighter failed for ${slug}:`, err)
        }
        if (id) {
          idBySlug.set(slug, id)
          fightersScraped++
        }
        return id ?? undefined
      }

      const resolved = []
      let skippedBouts = 0
      for (const b of parseEventCard(cardHtml)) {
        const fighterAId = await resolve(b.fighterASlug, b.weightClass, b.division, b.fighterAName)
        if (!fighterAId) {
          // can't anchor a bout without the known fighter
          console.warn(`scrapeEvents: skipped bout ${ev.slug} order=${b.boutOrder} — unresolved red corner ${b.fighterASlug}`)
          skippedBouts++
          continue
        }
        const fighterBId = b.fighterBSlug
          ? await resolve(b.fighterBSlug, b.weightClass, b.division, b.fighterBName)
          : undefined
        resolved.push({
          fighterAId,
          fighterBId,
          weightClass: b.weightClass,
          cardTier: b.cardTier,
          boutOrder: b.boutOrder,
        })
      }

      boutCount += await ctx.runMutation(api.events.replaceEventBouts, {
        eventId,
        bouts: resolved,
        // A partial scrape must not replace a fuller previously-stored card.
        incomplete: skippedBouts > 0,
      })
    }

    console.log(`scrapeEvents: ${upcoming.length} events, ${boutCount} bouts, ${fightersScraped} new fighters`)
    return { events: upcoming.length, bouts: boutCount, fightersScraped }
  },
})

// Scrapes every ranked division sequentially. The backfill primitive for a
// cold-start / full reseed. Sequential (not parallel) to avoid bursting outbound
// requests to ufc.com. See ADR 0010.
export const scrapeAllWeightClasses = action({
  args: {},
  handler: async (ctx): Promise<{ weightClasses: number; fullScrape: number }> => {
    let fullScrape = 0
    for (const weightClassKey of ALL_RANKING_KEYS) {
      try {
        const res = await ctx.runAction(api.scrape.scrapeWeightClass, { weightClassKey })
        fullScrape += res.fullScrape
      } catch (err) {
        console.error(`backfill scrape failed for ${weightClassKey}:`, err)
      }
    }
    console.log(`scrapeAllWeightClasses: ${ALL_RANKING_KEYS.length} divisions, ${fullScrape} fighters fully scraped`)
    return { weightClasses: ALL_RANKING_KEYS.length, fullScrape }
  },
})

// One-shot full reseed: rebuilds events + every ranked division in a single run.
// Run after wiping the DB — `npx convex run scrape:seedDatabase`. This is the
// single command that gets everything back in place. See ADR 0010.
export const seedDatabase = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ events: number; bouts: number; fightersScraped: number; weightClasses: number }> => {
    const events = await ctx.runAction(api.scrape.scrapeEvents)
    const divisions = await ctx.runAction(api.scrape.scrapeAllWeightClasses)
    console.log(
      `seedDatabase: ${events.events} events, ${events.bouts} bouts, ${divisions.weightClasses} divisions`
    )
    return { ...events, weightClasses: divisions.weightClasses }
  },
})

// Post-event fighter refresh (ADR 0010). Cron-triggered daily. Finds events that
// passed 24–48h ago whose fighters haven't been re-scraped yet, scrapes the
// distinct weight classes those events fought (sequentially, to avoid bursting
// ufc.com), then stamps each event so it won't be re-targeted. A failed run
// leaves fightersScrapedAt null and is retried on the next daily execution.
export const scrapePostEventWeightClasses = action({
  args: {},
  handler: async (ctx): Promise<{ events: number; weightClasses: number; coldStart?: boolean }> => {
    const now = Date.now()

    // Cold-start self-heal: if the rankings have never been scraped (wiped DB, or
    // a DB holding only fight-card fighters), the post-event diff has nothing to
    // work from. Backfill every division instead. This is the server-side
    // replacement for the deleted useStaleSync bootstrap. See ADR 0010.
    const seeded = await ctx.runQuery(api.fighters.hasRankedFighters)
    if (!seeded) {
      const result = await ctx.runAction(api.scrape.scrapeAllWeightClasses)
      console.log(`scrapePostEventWeightClasses: cold start — backfilled ${result.weightClasses} divisions`)
      return { events: 0, weightClasses: result.weightClasses, coldStart: true }
    }

    const candidates = await ctx.runQuery(api.events.getPostEventScrapeCandidates)

    const weightClasses = getEligiblePostEventWeightClasses(candidates, now)
    if (weightClasses.length === 0) {
      console.log('scrapePostEventWeightClasses: nothing eligible')
      return { events: 0, weightClasses: 0 }
    }

    // Sequential, not parallel — parallel would fire every division's outbound
    // rankings + per-fighter fetches at ufc.com simultaneously.
    for (const weightClassKey of weightClasses) {
      try {
        await ctx.runAction(api.scrape.scrapeWeightClass, { weightClassKey })
      } catch (err) {
        console.error(`post-event scrape failed for ${weightClassKey}:`, err)
      }
    }

    // Stamp every event whose data this run was responsible for. Done after the
    // scrape so a thrown scrape leaves the event unstamped for next-run retry.
    const eligibleEvents = candidates.filter((c) => isPostEventSyncEligible(c, now))
    for (const event of eligibleEvents) {
      await ctx.runMutation(api.events.stampFightersScraped, { eventId: event.eventId })
    }

    console.log(
      `scrapePostEventWeightClasses: ${eligibleEvents.length} events, ${weightClasses.length} weight classes`
    )
    return { events: eligibleEvents.length, weightClasses: weightClasses.length }
  },
})

export const scrapeFighterPhoto = action({
  args: { ufcUrl: v.string() },
  handler: async (ctx, { ufcUrl }) => {
    try {
      const res = await fetch(`https://www.ufc.com/athlete/${ufcUrl}`, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
      })
      if (!res.ok) return null
      const html = await res.text()
      // Prefer full-body image
      const fullBody = html.match(/src="(https?:\/\/ufc\.com\/images\/styles\/athlete_bio_full_body\/[^"]+)"/)
      if (fullBody?.[1]) {
        const photoUrl = await downloadAndStorePhoto(ctx.storage, fullBody[1])
        if (photoUrl) {
          await ctx.runMutation(api.fighters.updateFighterPhoto, { ufcUrl, photoUrl })
          return photoUrl
        }
      }
    } catch { /* ignore */ }
    return null
  },
})
