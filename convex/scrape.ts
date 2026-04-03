import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

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
  'womens-featherweight':  { title: "Women&#039;s Featherweight",  division: 'womens' },
}

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
export const scrapeWeightClass = action({
  args: { weightClassKey: v.string() },
  handler: async (ctx, { weightClassKey }) => {
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
      // Always fetch the athlete page to get the full-body image
      let photoUrl: string | undefined
      try {
        const res = await fetch(`https://www.ufc.com/athlete/${ranked.ufcSlug}`, {
          headers: { 'User-Agent': UA, Accept: 'text/html' },
        })
        if (res.ok) {
          const html = await res.text()
          // Prefer full-body image (athlete_bio_full_body style)
          const fullBody = html.match(/src="(https?:\/\/ufc\.com\/images\/styles\/athlete_bio_full_body\/[^"]+)"/)
          if (fullBody?.[1]) {
            photoUrl = await downloadAndStorePhoto(ctx.storage, fullBody[1])
          }
        }
      } catch { /* keep going without photo */ }

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
          photoUrl,
          ufcUrl: ranked.ufcSlug,
          ufcStatsUrl,
          lastSynced: now,
          isActive: true,
        })
      } else {
        // Patch only the fields that actually differ
        await ctx.runMutation(api.fighters.patchFighter, {
          ufcUrl: ranked.ufcSlug,
          ranking: ranked.ranking,
          photoUrl: photoUrl ?? undefined,
          nickname,
          weight,
          weightClass,
          division,
          record: { wins, losses, draws, noContests: 0 },
          stats,
          lastSynced: now,
        })
      }
      fullScrape++
    }

    console.log(`${weightClassKey}: fullScrape=${fullScrape} metaOnly=${metaOnly} skipped=${skipped}`)
    return { fullScrape, metaOnly, skipped, weightClass: weightClassKey }
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
