import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { shouldPruneFighter } from './lib/fighterPrune'

export const getByWeightClass = query({
  args: {
    weightClass: v.string(),
    division: v.union(v.literal('mens'), v.literal('womens')),
  },
  handler: async (ctx, { weightClass, division }) => {
    const fighters = await ctx.db
      .query('fighters')
      .withIndex('by_weight_class_division', (q) =>
        q.eq('weightClass', weightClass).eq('division', division)
      )
      .collect()

    // Sort: champion (ranking=0) first, then ranked (1-15), then unranked (no ranking)
    return fighters.sort((a, b) => {
      if (a.ranking === 0) return -1
      if (b.ranking === 0) return 1
      if (a.ranking !== undefined && b.ranking !== undefined) return a.ranking - b.ranking
      if (a.ranking !== undefined) return -1
      if (b.ranking !== undefined) return 1
      return a.name.localeCompare(b.name)
    })
  },
})

export const getChampionsByGender = query({
  args: {
    division: v.union(v.literal('mens'), v.literal('womens')),
  },
  handler: async (ctx, { division }) => {
    const fighters = await ctx.db
      .query('fighters')
      .filter((q) => q.and(
        q.eq(q.field('division'), division),
        q.eq(q.field('ranking'), 0)
      ))
      .collect()
    return fighters
  },
})

export const upsertFighter = mutation({
  args: {
    name: v.string(),
    nickname: v.optional(v.string()),
    weightClass: v.string(),
    division: v.union(v.literal('mens'), v.literal('womens')),
    ranking: v.optional(v.number()),
    record: v.object({
      wins: v.number(),
      losses: v.number(),
      draws: v.number(),
      noContests: v.number(),
    }),
    stats: v.object({
      slpm: v.number(),
      strikingAccuracy: v.number(),
      sapm: v.number(),
      strikingDefense: v.number(),
      takedownAvg: v.number(),
      takedownAccuracy: v.number(),
      takedownDefense: v.number(),
      submissionAvg: v.number(),
    }),
    country: v.optional(v.string()),
    weight: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    ufcUrl: v.string(),
    ufcStatsUrl: v.string(),
    lastSynced: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('fighters')
      .withIndex('by_ufc_url', (q) => q.eq('ufcUrl', args.ufcUrl))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, args)
      return existing._id
    } else {
      return await ctx.db.insert('fighters', args)
    }
  },
})

// Patches only the fields that actually changed. Every arg is optional so the
// caller passes only what it fetched — nothing gets overwritten unnecessarily.
export const patchFighter = mutation({
  args: {
    ufcUrl: v.string(),
    ranking: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    nickname: v.optional(v.string()),
    weightClass: v.optional(v.string()),
    division: v.optional(v.union(v.literal('mens'), v.literal('womens'))),
    record: v.optional(v.object({
      wins: v.number(),
      losses: v.number(),
      draws: v.number(),
      noContests: v.number(),
    })),
    stats: v.optional(v.object({
      slpm: v.number(),
      strikingAccuracy: v.number(),
      sapm: v.number(),
      strikingDefense: v.number(),
      takedownAvg: v.number(),
      takedownAccuracy: v.number(),
      takedownDefense: v.number(),
      submissionAvg: v.number(),
    })),
    weight: v.optional(v.string()),
    country: v.optional(v.string()),
    lastSynced: v.optional(v.number()),
  },
  handler: async (ctx, { ufcUrl, ...fields }) => {
    const existing = await ctx.db
      .query('fighters')
      .withIndex('by_ufc_url', (q) => q.eq('ufcUrl', ufcUrl))
      .first()
    if (!existing) return

    // Build patch from only the fields that differ from current values
    const patch: Record<string, unknown> = {}

    if (fields.ranking !== undefined && fields.ranking !== existing.ranking)
      patch.ranking = fields.ranking
    if (fields.photoUrl && fields.photoUrl !== existing.photoUrl)
      patch.photoUrl = fields.photoUrl
    if (fields.nickname !== undefined && fields.nickname !== existing.nickname)
      patch.nickname = fields.nickname
    if (fields.weightClass && fields.weightClass !== existing.weightClass)
      patch.weightClass = fields.weightClass
    if (fields.division && fields.division !== existing.division)
      patch.division = fields.division
    if (fields.record) {
      const r = existing.record
      const n = fields.record
      if (n.wins !== r.wins || n.losses !== r.losses || n.draws !== r.draws || n.noContests !== r.noContests)
        patch.record = fields.record
    }
    if (fields.stats) {
      const s = existing.stats
      const n = fields.stats
      const changed = (Object.keys(n) as Array<keyof typeof n>).some((k) => n[k] !== s[k])
      if (changed) patch.stats = fields.stats
    }
    if (fields.weight !== undefined && fields.weight !== existing.weight)
      patch.weight = fields.weight
    if (fields.country !== undefined && fields.country !== existing.country)
      patch.country = fields.country
    if (fields.lastSynced !== undefined)
      patch.lastSynced = fields.lastSynced

    if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch)
  },
})

// Removes ghost fighters from a weight class after a rankings scrape (ADR 0010).
// A fighter is deleted only when absent from the freshly-scraped ranked slug set
// AND holding no upcoming and no past bouts — any bout history is retained for
// matchup analysis. The ranked slugs come from the scrape action; bout counts are
// resolved here via the per-fighter indexes. Returns the number pruned.
export const pruneFighters = mutation({
  args: {
    weightClass: v.string(),
    division: v.union(v.literal('mens'), v.literal('womens')),
    rankedSlugs: v.array(v.string()),
  },
  handler: async (ctx, { weightClass, division, rankedSlugs }) => {
    const ranked = new Set(rankedSlugs)
    const fighters = await ctx.db
      .query('fighters')
      .withIndex('by_weight_class_division', (q) =>
        q.eq('weightClass', weightClass).eq('division', division)
      )
      .collect()

    let pruned = 0
    for (const fighter of fighters) {
      // Ranked fighters never need a bout lookup — skip the index reads.
      if (ranked.has(fighter.ufcUrl)) continue

      const { upcoming, past } = await countBouts(ctx, fighter._id)
      if (shouldPruneFighter(ranked, fighter.ufcUrl, upcoming, past)) {
        await ctx.db.delete(fighter._id)
        pruned++
      }
    }
    return pruned
  },
})

// Counts a fighter's bouts split into upcoming (event in the future) and past,
// across both corner indexes. A fighter can appear in either corner, so both
// by_fighter_a and by_fighter_b are queried.
async function countBouts(
  ctx: MutationCtx,
  fighterId: Id<'fighters'>,
): Promise<{ upcoming: number; past: number }> {
  const now = Date.now()
  const asA = await ctx.db
    .query('bouts')
    .withIndex('by_fighter_a', (q) => q.eq('fighterAId', fighterId))
    .collect()
  const asB = await ctx.db
    .query('bouts')
    .withIndex('by_fighter_b', (q) => q.eq('fighterBId', fighterId))
    .collect()

  let upcoming = 0
  let past = 0
  for (const bout of [...asA, ...asB]) {
    const event = await ctx.db.get(bout.eventId)
    if (!event) continue
    if (event.date > now) upcoming++
    else past++
  }
  return { upcoming, past }
}

export const getAllFighters = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('fighters').collect()
  },
})

// Cold-start signal: true when at least one champion (ranking 0) exists, meaning
// the rankings have been scraped at least once. A wiped DB — or one holding only
// fight-card fighters from scrapeEvents (which never sets a ranking) — returns
// false, telling the daily fighter cron to run a full backfill. See ADR 0010.
export const hasRankedFighters = query({
  args: {},
  handler: async (ctx) => {
    const champion = await ctx.db
      .query('fighters')
      .filter((q) => q.eq(q.field('ranking'), 0))
      .first()
    return champion !== null
  },
})

// ── Video generation ───────────────────────────────────────────────────────

export const getFighter = query({
  args: { fighterId: v.id('fighters') },
  handler: async (ctx, { fighterId }) => ctx.db.get(fighterId),
})

export const setVideoUrl = mutation({
  args: { fighterId: v.id('fighters'), videoUrl: v.string() },
  handler: async (ctx, { fighterId, videoUrl }) => {
    await ctx.db.patch(fighterId, { videoUrl })
  },
})

// Returns the fighter for the hero silhouette. Prefers the next event's
// main-event fighter (when they have a photo), then falls back to the
// heavyweight champion, then the lightweight champion.
export const getFeaturedFighter = query({
  args: {},
  handler: async (ctx) => {
    // Next event's main-event fighter takes priority when they have a photo.
    const now = Date.now()
    const nextEvent = await ctx.db
      .query('events')
      .withIndex('by_date', (q) => q.gt('date', now))
      .order('asc')
      .first()
    if (nextEvent) {
      const mainBout = await ctx.db
        .query('bouts')
        .withIndex('by_event', (q) => q.eq('eventId', nextEvent._id))
        .filter((q) => q.eq(q.field('boutOrder'), 1))
        .first()
      if (mainBout) {
        const headliner = await ctx.db.get(mainBout.fighterAId)
        if (headliner?.photoUrl) return headliner
      }
    }

    const hw = await ctx.db
      .query('fighters')
      .withIndex('by_weight_class_ranking', (q) =>
        q.eq('weightClass', 'heavyweight').eq('ranking', 0)
      )
      .first()
    if (hw?.photoUrl) return hw

    const lw = await ctx.db
      .query('fighters')
      .withIndex('by_weight_class_ranking', (q) =>
        q.eq('weightClass', 'lightweight').eq('ranking', 0)
      )
      .first()
    return lw ?? null
  },
})

// Returns a fighter's earliest upcoming bout, joined with its event and opponent.
// A fighter can be in either corner, so both bout indexes are queried and unioned
// (red/blue assignment isn't consistent). Opponent is null when the bout is TBA.
export const getNextFightForFighter = query({
  args: { fighterId: v.id('fighters') },
  handler: async (ctx, { fighterId }) => {
    const now = Date.now()

    const asA = await ctx.db
      .query('bouts')
      .withIndex('by_fighter_a', (q) => q.eq('fighterAId', fighterId))
      .collect()
    const asB = await ctx.db
      .query('bouts')
      .withIndex('by_fighter_b', (q) => q.eq('fighterBId', fighterId))
      .collect()

    const upcoming = []
    for (const bout of [...asA, ...asB]) {
      const event = await ctx.db.get(bout.eventId)
      if (event && event.date > now) upcoming.push({ bout, event })
    }
    if (upcoming.length === 0) return null

    upcoming.sort((x, y) => x.event.date - y.event.date)
    const { bout, event } = upcoming[0]

    const opponentId = bout.fighterAId === fighterId ? bout.fighterBId : bout.fighterAId
    const opponent = opponentId ? await ctx.db.get(opponentId) : null

    return {
      event: { name: event.name, date: event.date },
      opponent,
    }
  },
})

export const updateFighterPhoto = mutation({
  args: {
    ufcUrl: v.string(),
    photoUrl: v.string(),
  },
  handler: async (ctx, { ufcUrl, photoUrl }) => {
    const existing = await ctx.db
      .query('fighters')
      .withIndex('by_ufc_url', (q) => q.eq('ufcUrl', ufcUrl))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { photoUrl })
    }
  },
})
