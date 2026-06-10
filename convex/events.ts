import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// The soonest upcoming event, joined with its main-event (boutOrder 1) bout and
// both fighters. Powers the live Hero press pass. fighterB is null when TBA;
// returns null when there are no upcoming events.
export const getNextEvent = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const event = await ctx.db
      .query('events')
      .withIndex('by_date', (q) => q.gt('date', now))
      .order('asc')
      .first()
    if (!event) return null

    const bouts = await ctx.db
      .query('bouts')
      .withIndex('by_event', (q) => q.eq('eventId', event._id))
      .collect()
    const mainBout = bouts.find((b) => b.boutOrder === 1) ?? null

    const fighterA = mainBout ? await ctx.db.get(mainBout.fighterAId) : null
    const fighterB = mainBout?.fighterBId ? await ctx.db.get(mainBout.fighterBId) : null

    return {
      name: event.name,
      date: event.date,
      venue: event.venue,
      location: event.location,
      fighterA,
      fighterB,
    }
  },
})

const cardTier = v.union(
  v.literal('main'),
  v.literal('prelim'),
  v.literal('early_prelim')
)

// Idempotent upsert keyed on the event slug. Returns the event document id so the
// scraper can attach bouts to it.
export const upsertEvent = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    date: v.number(),
    venue: v.string(),
    location: v.string(),
    lastSynced: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, args)
      return existing._id
    }
    return await ctx.db.insert('events', args)
  },
})

// Replaces an event's entire bout list. Deleting and re-inserting keeps the
// scraper idempotent and reflects card changes (added/removed/reordered fights)
// without leaving orphaned bouts behind.
export const replaceEventBouts = mutation({
  args: {
    eventId: v.id('events'),
    bouts: v.array(
      v.object({
        fighterAId: v.id('fighters'),
        fighterBId: v.optional(v.id('fighters')),
        weightClass: v.string(),
        cardTier,
        boutOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, { eventId, bouts }) => {
    const existing = await ctx.db
      .query('bouts')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect()
    for (const b of existing) await ctx.db.delete(b._id)

    for (const b of bouts) await ctx.db.insert('bouts', { eventId, ...b })
    return bouts.length
  },
})

// Lightweight lookup table for the scraper to resolve card slugs to fighter ids
// without pulling every fighter's full document.
export const ufcUrlToId = query({
  args: {},
  handler: async (ctx) => {
    const fighters = await ctx.db.query('fighters').collect()
    return fighters.map((f) => ({ id: f._id, ufcUrl: f.ufcUrl }))
  },
})
