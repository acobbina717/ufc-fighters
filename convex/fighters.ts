import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

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
      .filter((q) => q.eq(q.field('isActive'), true))
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
    isActive: v.boolean(),
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
    if (fields.lastSynced !== undefined)
      patch.lastSynced = fields.lastSynced

    if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch)
  },
})

export const getAllFighters = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('fighters').filter((q) => q.eq(q.field('isActive'), true)).collect()
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

// Returns the most iconic fighter with a photo for the hero silhouette.
// Tries heavyweight champion first, falls back to lightweight champion.
export const getFeaturedFighter = query({
  args: {},
  handler: async (ctx) => {
    const hw = await ctx.db
      .query('fighters')
      .withIndex('by_weight_class_ranking', (q) =>
        q.eq('weightClass', 'mens-heavyweight').eq('ranking', 0)
      )
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()
    if (hw?.photoUrl) return hw

    const lw = await ctx.db
      .query('fighters')
      .withIndex('by_weight_class_ranking', (q) =>
        q.eq('weightClass', 'mens-lightweight').eq('ranking', 0)
      )
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()
    return lw ?? null
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
