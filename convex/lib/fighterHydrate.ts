// Fighter hydration: fetch a fighter's athlete page (photo + nationality) and
// ufcstats record/stats, then flatten everything into one FighterHydration.
//
// This module isolates the network + parse logic that scrapeWeightClass and the
// event path both need. Callers own the DB write — hydrateFighter only reads the
// web. The only Convex surface it touches is StorageLike (a structural subset of
// ctx.storage) so it stays unit-testable with a mock store.
//
// Contract: every numeric field is always populated (0 on a ufcstats miss) and
// ufcStatsUrl always resolves (falls back to the athlete URL). Optional string
// fields are undefined when absent.

import { strip, parseNum } from './htmlParse'
import { normalizeCountry } from './country'

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ─── Photo storage ───────────────────────────────────────────────────────────
// Structural subset of Convex's ctx.storage — only what photo download needs.
export interface StorageLike {
  store(blob: Blob): Promise<string>
  getUrl(storageId: string): Promise<string | null>
}

export async function downloadAndStorePhoto(
  storage: StorageLike,
  ufcPhotoUrl: string,
): Promise<string | undefined> {
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

// ─── ufcstats name search ─────────────────────────────────────────────────────
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

// ─── Fighter detail page ──────────────────────────────────────────────────────
export interface FighterStats {
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

const ZERO_STATS: FighterStats = {
  slpm: 0, strikingAccuracy: 0, sapm: 0, strikingDefense: 0,
  takedownAvg: 0, takedownAccuracy: 0, takedownDefense: 0, submissionAvg: 0,
}

// ─── Combined hydration ───────────────────────────────────────────────────────
// Flat, always-populated view of a fighter assembled from the web. Numeric
// fields default to 0 and ufcStatsUrl always resolves, so callers can write the
// result directly without re-merging against prior DB values.
export interface FighterHydration {
  photoUrl?: string   // undefined if athlete page failed or has no full-body image
  country?: string    // undefined if not found on the athlete page
  ufcStatsUrl: string // detail URL on a hit; falls back to the athlete URL on a miss
  wins: number        // 0 if the ufcstats search missed
  losses: number
  draws: number
  nickname?: string
  weight?: string
  stats: FighterStats // all-zeros if the ufcstats search missed
}

// Fetches a fighter's athlete page (full-body photo + nationality), searches
// ufcstats for their record, and parses their detail page for stats. Always
// resolves — failed fetches degrade to zeros/undefined rather than throwing.
export async function hydrateFighter(
  storage: StorageLike,
  slug: string,
  name: string,
): Promise<FighterHydration> {
  const athleteUrl = `https://www.ufc.com/athlete/${slug}`

  // Athlete page → full-body photo + nationality. Both are best-effort.
  let photoUrl: string | undefined
  let country: string | undefined
  try {
    const res = await fetch(athleteUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    })
    if (res.ok) {
      const html = await res.text()
      const fullBody = html.match(/src="(https?:\/\/ufc\.com\/images\/styles\/athlete_bio_full_body\/[^"]+)"/)
      if (fullBody?.[1]) {
        photoUrl = await downloadAndStorePhoto(storage, fullBody[1])
      }
      country = normalizeCountry(html)
    }
  } catch { /* keep going without photo or country */ }

  // Defaults for a ufcstats miss — record stays at zero and the URL falls back
  // to the athlete page so callers always have a usable link.
  let wins = 0, losses = 0, draws = 0
  let nickname: string | undefined
  let weight: string | undefined
  let ufcStatsUrl = athleteUrl
  let stats: FighterStats = { ...ZERO_STATS }

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
  } else {
    console.log(`ufcstats search miss: ${name}`)
  }

  return { photoUrl, country, ufcStatsUrl, wins, losses, draws, nickname, weight, stats }
}
