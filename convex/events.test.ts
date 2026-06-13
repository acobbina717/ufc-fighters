// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.test).*s')

const ZERO_STATS = {
  slpm: 0, strikingAccuracy: 0, sapm: 0, strikingDefense: 0,
  takedownAvg: 0, takedownAccuracy: 0, takedownDefense: 0, submissionAvg: 0,
}
const ZERO_RECORD = { wins: 0, losses: 0, draws: 0, noContests: 0 }

function fighter(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    weightClass: 'lightweight',
    division: 'mens' as const,
    record: ZERO_RECORD,
    stats: ZERO_STATS,
    ufcUrl: name.toLowerCase().replace(/\s+/g, '-'),
    ufcStatsUrl: `https://ufcstats.com/${name}`,
    lastSynced: 0,
    ...overrides,
  }
}

const HOUR = 60 * 60 * 1000

describe('getNextEvent', () => {
  it('returns the soonest upcoming event with its main-event fighters', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const champ = await ctx.db.insert('fighters', fighter('Pereira'))
      const challenger = await ctx.db.insert('fighters', fighter('Ankalaev'))
      const soon = await ctx.db.insert('events', {
        name: 'UFC 320', date: Date.now() + 2 * 24 * HOUR, venue: '', location: '', slug: 'ufc-320', lastSynced: 0,
      })
      const far = await ctx.db.insert('events', {
        name: 'UFC 999', date: Date.now() + 60 * 24 * HOUR, venue: '', location: '', slug: 'ufc-999', lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId: soon, fighterAId: champ, fighterBId: challenger, weightClass: 'lightheavyweight', cardTier: 'main', boutOrder: 1,
      })
      await ctx.db.insert('bouts', {
        eventId: far, fighterAId: champ, weightClass: 'lightheavyweight', cardTier: 'main', boutOrder: 1,
      })
    })

    const next = await t.query(api.events.getNextEvent, {})
    expect(next).not.toBeNull()
    expect(next!.name).toBe('UFC 320')
    expect(next!.fighterA?.name).toBe('Pereira')
    expect(next!.fighterB?.name).toBe('Ankalaev')
  })

  it('ignores past events even when they are nearer to now than the next future event', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('Future Guy'))
      const past = await ctx.db.insert('events', {
        name: 'UFC Yesterday', date: Date.now() - 24 * HOUR, venue: '', location: '', slug: 'ufc-yesterday', lastSynced: 0,
      })
      const future = await ctx.db.insert('events', {
        name: 'UFC Next Month', date: Date.now() + 30 * 24 * HOUR, venue: '', location: '', slug: 'ufc-next-month', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId: past, fighterAId: a, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
      await ctx.db.insert('bouts', { eventId: future, fighterAId: a, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
    })

    const next = await t.query(api.events.getNextEvent, {})
    expect(next!.name).toBe('UFC Next Month')
  })

  it('returns null when there are no upcoming events', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('events', {
        name: 'UFC Past', date: Date.now() - 24 * HOUR, venue: '', location: '', slug: 'ufc-past', lastSynced: 0,
      })
    })
    expect(await t.query(api.events.getNextEvent, {})).toBeNull()
  })

  it('picks the boutOrder:1 bout as the main event, ignoring undercard bouts', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const main = await ctx.db.insert('fighters', fighter('Headliner'))
      const prelim = await ctx.db.insert('fighters', fighter('Prelim Guy'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 321', date: Date.now() + 5 * 24 * HOUR, venue: '', location: '', slug: 'ufc-321', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: prelim, weightClass: 'lightweight', cardTier: 'prelim', boutOrder: 8 })
      await ctx.db.insert('bouts', { eventId, fighterAId: main, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
    })

    const next = await t.query(api.events.getNextEvent, {})
    expect(next!.fighterA?.name).toBe('Headliner')
  })

  it('returns a null fighterB when the main event opponent is TBA', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('Solo'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC TBA', date: Date.now() + 5 * 24 * HOUR, venue: '', location: '', slug: 'ufc-tba', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
    })

    const next = await t.query(api.events.getNextEvent, {})
    expect(next!.fighterA?.name).toBe('Solo')
    expect(next!.fighterB).toBeNull()
  })
})

describe('upsertEvent', () => {
  it('does not clobber an existing venue/location with empty strings', async () => {
    const t = convexTest(schema, modules)
    const eventId = await t.run(async (ctx) =>
      ctx.db.insert('events', {
        name: 'UFC 329', date: Date.now() + 24 * HOUR, slug: 'ufc-329',
        venue: 'T-Mobile Arena', location: 'Las Vegas, United States', lastSynced: 0,
      })
    )

    await t.mutation(api.events.upsertEvent, {
      slug: 'ufc-329', name: 'UFC 329', date: Date.now() + 24 * HOUR,
      venue: '', location: '', lastSynced: 1,
    })

    const event = await t.run(async (ctx) => ctx.db.get(eventId))
    expect(event!.venue).toBe('T-Mobile Arena')
    expect(event!.location).toBe('Las Vegas, United States')
    expect(event!.lastSynced).toBe(1) // other fields still patched
  })

  it('updates venue/location when the scrape provides non-empty values', async () => {
    const t = convexTest(schema, modules)
    const eventId = await t.run(async (ctx) =>
      ctx.db.insert('events', {
        name: 'UFC 329', date: Date.now() + 24 * HOUR, slug: 'ufc-329',
        venue: '', location: '', lastSynced: 0,
      })
    )

    await t.mutation(api.events.upsertEvent, {
      slug: 'ufc-329', name: 'UFC 329', date: Date.now() + 24 * HOUR,
      venue: 'T-Mobile Arena', location: 'Las Vegas, United States', lastSynced: 1,
    })

    const event = await t.run(async (ctx) => ctx.db.get(eventId))
    expect(event!.venue).toBe('T-Mobile Arena')
    expect(event!.location).toBe('Las Vegas, United States')
  })
})

describe('replaceEventBouts', () => {
  function bout(fighterAId: Id<'fighters'>, boutOrder: number) {
    return { fighterAId, weightClass: 'lightweight', cardTier: 'main' as const, boutOrder }
  }

  it('keeps the prior fuller bout set when an incomplete scrape would shrink it', async () => {
    const t = convexTest(schema, modules)
    const { eventId, a, b } = await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('A'))
      const b = await ctx.db.insert('fighters', fighter('B'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 330', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-330', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
      await ctx.db.insert('bouts', { eventId, fighterAId: b, weightClass: 'lightweight', cardTier: 'main', boutOrder: 2 })
      return { eventId, a, b }
    })

    await t.mutation(api.events.replaceEventBouts, {
      eventId, bouts: [bout(a, 1)], incomplete: true,
    })

    const bouts = await t.run(async (ctx) =>
      ctx.db.query('bouts').withIndex('by_event', (q) => q.eq('eventId', eventId)).collect()
    )
    expect(bouts).toHaveLength(2)
    expect(bouts.map((x) => x.fighterAId).sort()).toEqual([a, b].sort())
  })

  it('replaces the bout set when the scrape is complete', async () => {
    const t = convexTest(schema, modules)
    const { eventId, a } = await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('A'))
      const b = await ctx.db.insert('fighters', fighter('B'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 331', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-331', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
      await ctx.db.insert('bouts', { eventId, fighterAId: b, weightClass: 'lightweight', cardTier: 'main', boutOrder: 2 })
      return { eventId, a }
    })

    await t.mutation(api.events.replaceEventBouts, {
      eventId, bouts: [bout(a, 1)],
    })

    const bouts = await t.run(async (ctx) =>
      ctx.db.query('bouts').withIndex('by_event', (q) => q.eq('eventId', eventId)).collect()
    )
    expect(bouts).toHaveLength(1)
    expect(bouts[0].fighterAId).toBe(a)
  })
})

describe('getNextEventCard', () => {
  it('returns every bout of the soonest upcoming event with names, tiers, and order', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('Main A'))
      const b = await ctx.db.insert('fighters', fighter('Main B'))
      const c = await ctx.db.insert('fighters', fighter('Co Main'))
      const d = await ctx.db.insert('fighters', fighter('Prelim Opener', { division: 'womens', weightClass: 'flyweight' }))
      const soon = await ctx.db.insert('events', {
        name: 'UFC 340', date: Date.now() + 2 * 24 * HOUR, venue: '', location: '', slug: 'ufc-340', lastSynced: 0,
      })
      const far = await ctx.db.insert('events', {
        name: 'UFC 999', date: Date.now() + 60 * 24 * HOUR, venue: '', location: '', slug: 'ufc-999', lastSynced: 0,
      })
      // inserted out of bout order on purpose — the query sorts by boutOrder
      await ctx.db.insert('bouts', { eventId: soon, fighterAId: d, weightClass: 'flyweight', cardTier: 'prelim', boutOrder: 3 })
      await ctx.db.insert('bouts', { eventId: soon, fighterAId: a, fighterBId: b, weightClass: 'lightheavyweight', cardTier: 'main', boutOrder: 1 })
      await ctx.db.insert('bouts', { eventId: soon, fighterAId: c, weightClass: 'lightweight', cardTier: 'main', boutOrder: 2 })
      await ctx.db.insert('bouts', { eventId: far, fighterAId: a, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
    })

    const card = await t.query(api.events.getNextEventCard, {})
    expect(card).not.toBeNull()
    expect(card!.eventName).toBe('UFC 340')
    expect(card!.bouts).toHaveLength(3) // the far event's bout is excluded
    expect(card!.bouts.map((b) => b.boutOrder)).toEqual([1, 2, 3])
    expect(card!.bouts[0]).toMatchObject({
      cardTier: 'main', weightClass: 'lightheavyweight', division: 'mens',
      fighterAName: 'Main A', fighterBName: 'Main B',
    })
    expect(card!.bouts[1].cardTier).toBe('main')
    // division rides on the anchor fighter so women's bouts label correctly
    expect(card!.bouts[2]).toMatchObject({ cardTier: 'prelim', division: 'womens' })
  })

  it('returns a per-corner photo ref for each bout when both fighters have photos', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('Photo A', { photoUrl: 'https://ufc.com/a.png' }))
      const b = await ctx.db.insert('fighters', fighter('Photo B', { photoUrl: 'https://ufc.com/b.png' }))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 342', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-342', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, fighterBId: b, weightClass: 'lightweight', cardTier: 'prelim', boutOrder: 4 })
    })

    const card = await t.query(api.events.getNextEventCard, {})
    expect(card!.bouts[0]).toMatchObject({
      fighterAPhotoUrl: 'https://ufc.com/a.png',
      fighterBPhotoUrl: 'https://ufc.com/b.png',
    })
  })

  it('joins each fighter country onto its corner when on record', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('Country A', { country: 'Georgia' }))
      const b = await ctx.db.insert('fighters', fighter('Country B', { country: 'Brazil' }))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 344', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-344', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, fighterBId: b, weightClass: 'lightweight', cardTier: 'prelim', boutOrder: 4 })
    })

    const card = await t.query(api.events.getNextEventCard, {})
    expect(card!.bouts[0]).toMatchObject({
      fighterACountry: 'Georgia',
      fighterBCountry: 'Brazil',
    })
  })

  it('yields a null country for a TBA corner and for a fighter with no country on file', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      // fighterA named but no country; fighterB TBA (absent)
      const a = await ctx.db.insert('fighters', fighter('No Country'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 345', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-345', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, weightClass: 'lightweight', cardTier: 'prelim', boutOrder: 5 })
    })

    const card = await t.query(api.events.getNextEventCard, {})
    expect(card!.bouts[0].fighterACountry).toBeNull()
    expect(card!.bouts[0].fighterBCountry).toBeNull()
  })

  it('yields a null photo for a TBA corner and for a named fighter with no photo on file', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      // fighterA is named but has no photoUrl; fighterB is TBA (absent)
      const a = await ctx.db.insert('fighters', fighter('No Photo'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 343', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-343', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, weightClass: 'lightweight', cardTier: 'prelim', boutOrder: 5 })
    })

    const card = await t.query(api.events.getNextEventCard, {})
    expect(card!.bouts[0].fighterAPhotoUrl).toBeNull()
    expect(card!.bouts[0].fighterBPhotoUrl).toBeNull()
  })

  it('returns a null fighterBName for a TBA opponent', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('fighters', fighter('Solo Act'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 341', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-341', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId, fighterAId: a, weightClass: 'lightweight', cardTier: 'prelim', boutOrder: 4 })
    })

    const card = await t.query(api.events.getNextEventCard, {})
    expect(card!.bouts).toHaveLength(1)
    expect(card!.bouts[0].fighterAName).toBe('Solo Act')
    expect(card!.bouts[0].fighterBName).toBeNull()
  })

  it('returns null when there are no upcoming events', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('events', {
        name: 'UFC Past', date: Date.now() - 24 * HOUR, venue: '', location: '', slug: 'ufc-past-card', lastSynced: 0,
      })
    })
    expect(await t.query(api.events.getNextEventCard, {})).toBeNull()
  })

  it('returns an empty bout list for an upcoming event with no bouts yet', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('events', {
        name: 'UFC Empty', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-empty', lastSynced: 0,
      })
    })
    const card = await t.query(api.events.getNextEventCard, {})
    expect(card!.eventName).toBe('UFC Empty')
    expect(card!.bouts).toEqual([])
  })
})
