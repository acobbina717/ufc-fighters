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

// Every bout of the soonest upcoming event, joined with fighter names, for the
// Card Chapter's typographic ledger (issue #30). Returns the raw bout list —
// main-event exclusion and tier grouping are the client's pure helper's job
// (src/lib/cardLedger.ts). fighterBName is null when the opponent is TBA.
// Each corner also carries a photo ref for the Corner Thumbnail (ADR 0009) and
// the fighter's country for the Country Flag Row (issue #45); both null for a
// TBA corner and for a fighter with no photo / country on file.
// Returns null when there are no upcoming events.
export const getNextEventCard = query({
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

    const card = []
    for (const bout of bouts) {
      const fighterA = await ctx.db.get(bout.fighterAId)
      if (!fighterA) continue // a bout can't render without its anchor fighter
      const fighterB = bout.fighterBId ? await ctx.db.get(bout.fighterBId) : null
      card.push({
        boutOrder: bout.boutOrder,
        cardTier: bout.cardTier,
        weightClass: bout.weightClass,
        // Bouts store only the bare weight-class slug; the gendered division
        // (needed for the "WOMEN'S …" label) rides on the anchor fighter.
        division: fighterA.division,
        fighterAName: fighterA.name,
        fighterBName: fighterB?.name ?? null,
        fighterAPhotoUrl: fighterA.photoUrl ?? null,
        fighterBPhotoUrl: fighterB?.photoUrl ?? null,
        fighterACountry: fighterA.country ?? null,
        fighterBCountry: fighterB?.country ?? null,
      })
    }
    card.sort((a, b) => a.boutOrder - b.boutOrder)

    return { eventName: event.name, bouts: card }
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
      // Never clobber a known venue/location with a scrape that came back empty —
      // the cron runs daily and would otherwise wipe manual backfills.
      const { venue, location, ...rest } = args
      await ctx.db.patch(existing._id, {
        ...rest,
        ...(venue ? { venue } : {}),
        ...(location ? { location } : {}),
      })
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
    // True when the scraper had to skip bouts (transient fetch failures). An
    // incomplete set must not replace a fuller previously-stored card.
    incomplete: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, bouts, incomplete }) => {
    const existing = await ctx.db
      .query('bouts')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect()
    if (incomplete && existing.length > bouts.length) return existing.length
    for (const b of existing) await ctx.db.delete(b._id)

    for (const b of bouts) await ctx.db.insert('bouts', { eventId, ...b })
    return bouts.length
  },
})

const DAY_MS = 24 * 60 * 60 * 1000

// Events that have passed at least 24h ago and have not yet had their fighters
// re-scraped. Each candidate carries the distinct gendered weight-class keys
// (e.g. "mens-welterweight") drawn from its bouts so the post-event action can
// feed them straight into the pure eligibility helper (#49). The 48h ceiling is
// applied by that helper, not here. See ADR 0010.
export const getPostEventScrapeCandidates = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const events = await ctx.db
      .query('events')
      .withIndex('by_date', (q) => q.lt('date', now - DAY_MS))
      .collect()

    const candidates = []
    for (const event of events) {
      if (event.fightersScrapedAt !== undefined) continue

      const bouts = await ctx.db
        .query('bouts')
        .withIndex('by_event', (q) => q.eq('eventId', event._id))
        .collect()

      const weightClasses = new Set<string>()
      for (const bout of bouts) {
        // Bouts store only the bare weight-class slug; the gendered division
        // (needed to match a rankings key) rides on the anchor fighter.
        const fighterA = await ctx.db.get(bout.fighterAId)
        if (fighterA) weightClasses.add(`${fighterA.division}-${bout.weightClass}`)
      }

      candidates.push({
        eventId: event._id,
        date: event.date,
        fightersScrapedAt: event.fightersScrapedAt ?? null,
        weightClasses: [...weightClasses],
      })
    }
    return candidates
  },
})

// Stamps fightersScrapedAt on an event once its post-event fighter scrape
// completes, marking it done so the cron won't re-target it.
export const stampFightersScraped = mutation({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }) => {
    await ctx.db.patch(eventId, { fightersScrapedAt: Date.now() })
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
