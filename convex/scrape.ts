import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { parseEventCard, parseEventListing, parseEventVenue } from './lib/eventParse'
import {
  getEligiblePostEventWeightClasses,
  isPostEventSyncEligible,
} from './lib/postEventSync'
import { strip } from './lib/htmlParse'
import { UA, downloadAndStorePhoto, hydrateFighter } from './lib/fighterHydrate'

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
      const isStale = !db || (now - db.lastSynced) > STALE_MS || !db.country
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
      const h = await hydrateFighter(ctx.storage, ranked.ufcSlug, ranked.name)

      if (isNew) {
        // Insert brand-new fighter
        await ctx.runMutation(api.fighters.upsertFighter, {
          name: ranked.name,
          nickname: h.nickname,
          weightClass,
          division,
          ranking: ranked.ranking,
          record: { wins: h.wins, losses: h.losses, draws: h.draws, noContests: 0 },
          stats: h.stats,
          weight: h.weight,
          country: h.country,
          photoUrl: h.photoUrl,
          ufcUrl: ranked.ufcSlug,
          ufcStatsUrl: h.ufcStatsUrl,
          lastSynced: now,
        })
      } else {
        // Patch only the fields that actually differ
        await ctx.runMutation(api.fighters.patchFighter, {
          ufcUrl: ranked.ufcSlug,
          ranking: ranked.ranking,
          photoUrl: h.photoUrl ?? undefined,
          nickname: h.nickname,
          weight: h.weight,
          country: h.country,
          weightClass,
          division,
          record: { wins: h.wins, losses: h.losses, draws: h.draws, noContests: 0 },
          stats: h.stats,
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

      // Resolves a card slug to a fighter id, full-scraping (via hydrateFighter)
      // and inserting any fighter not yet in the DB. Event-discovered fighters
      // are unranked — presence on a scheduled card is proof of activity.
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
          // The card's rendered name (diacritics intact) is preferred; slugToName
          // is the fallback. searchUfcStats normalizes either way.
          const name = displayName ?? slugToName(slug)
          const h = await hydrateFighter(ctx.storage, slug, name)
          id = await ctx.runMutation(api.fighters.upsertFighter, {
            name,
            nickname: h.nickname,
            weightClass,
            division,
            record: { wins: h.wins, losses: h.losses, draws: h.draws, noContests: 0 },
            stats: h.stats,
            weight: h.weight,
            country: h.country,
            photoUrl: h.photoUrl,
            ufcUrl: slug,
            ufcStatsUrl: h.ufcStatsUrl,
            lastSynced: now,
          })
        } catch (err) {
          console.error(`hydrateFighter failed for ${slug}:`, err)
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
