// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

// Discovers every Convex module so convexTest can run the real functions.
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

describe('getNextFightForFighter', () => {
  it('returns the upcoming bout and opponent when the fighter is in the red corner', async () => {
    const t = convexTest(schema, modules)

    const { aId, event } = await t.run(async (ctx) => {
      const aId = await ctx.db.insert('fighters', fighter('Fighter A'))
      const bId = await ctx.db.insert('fighters', fighter('Fighter B'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 320',
        date: Date.now() + 24 * HOUR,
        venue: '',
        location: '',
        slug: 'ufc-320',
        lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId,
        fighterAId: aId,
        fighterBId: bId,
        weightClass: 'lightweight',
        cardTier: 'main',
        boutOrder: 1,
      })
      return { aId, event: 'UFC 320' }
    })

    const next = await t.query(api.fighters.getNextFightForFighter, { fighterId: aId })
    expect(next).not.toBeNull()
    expect(next!.event.name).toBe(event)
    expect(next!.opponent?.name).toBe('Fighter B')
  })

  it('finds the bout when the fighter is in the blue corner (index union)', async () => {
    const t = convexTest(schema, modules)
    const bId = await t.run(async (ctx) => {
      const aId = await ctx.db.insert('fighters', fighter('Red'))
      const bId = await ctx.db.insert('fighters', fighter('Blue'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 999', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-999', lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId, fighterAId: aId, fighterBId: bId, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1,
      })
      return bId
    })

    const next = await t.query(api.fighters.getNextFightForFighter, { fighterId: bId })
    expect(next!.event.name).toBe('UFC 999')
    expect(next!.opponent?.name).toBe('Red') // opponent is the other corner
  })

  it('returns a null opponent when the bout is TBA (no fighterBId)', async () => {
    const t = convexTest(schema, modules)
    const aId = await t.run(async (ctx) => {
      const aId = await ctx.db.insert('fighters', fighter('Lone'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC TBA', date: Date.now() + 24 * HOUR, venue: '', location: '', slug: 'ufc-tba', lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId, fighterAId: aId, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1,
      })
      return aId
    })

    const next = await t.query(api.fighters.getNextFightForFighter, { fighterId: aId })
    expect(next!.event.name).toBe('UFC TBA')
    expect(next!.opponent).toBeNull()
  })

  it('returns null when the fighter has only past bouts', async () => {
    const t = convexTest(schema, modules)
    const aId = await t.run(async (ctx) => {
      const aId = await ctx.db.insert('fighters', fighter('Retired'))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC Past', date: Date.now() - 24 * HOUR, venue: '', location: '', slug: 'ufc-past', lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId, fighterAId: aId, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1,
      })
      return aId
    })

    expect(await t.query(api.fighters.getNextFightForFighter, { fighterId: aId })).toBeNull()
  })

  it('returns the earliest upcoming bout when several are scheduled', async () => {
    const t = convexTest(schema, modules)
    const aId = await t.run(async (ctx) => {
      const aId = await ctx.db.insert('fighters', fighter('Busy'))
      const far = await ctx.db.insert('events', {
        name: 'Far', date: Date.now() + 30 * 24 * HOUR, venue: '', location: '', slug: 'far', lastSynced: 0,
      })
      const soon = await ctx.db.insert('events', {
        name: 'Soon', date: Date.now() + 2 * 24 * HOUR, venue: '', location: '', slug: 'soon', lastSynced: 0,
      })
      await ctx.db.insert('bouts', { eventId: far, fighterAId: aId, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
      await ctx.db.insert('bouts', { eventId: soon, fighterAId: aId, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1 })
      return aId
    })

    const next = await t.query(api.fighters.getNextFightForFighter, { fighterId: aId })
    expect(next!.event.name).toBe('Soon')
  })
})

describe('getFeaturedFighter', () => {
  it('prefers the next event main-event fighter when they have a photo', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      // Heavyweight champ with a photo — the old default. The scraper stores
      // bare weight class keys (no gender prefix).
      await ctx.db.insert('fighters', fighter('HW Champ', {
        weightClass: 'heavyweight', ranking: 0, photoUrl: 'hw.png',
      }))
      // Main-event fighter with a photo.
      const headliner = await ctx.db.insert('fighters', fighter('Headliner', { photoUrl: 'head.png' }))
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 320', date: Date.now() + 2 * 24 * HOUR, venue: '', location: '', slug: 'ufc-320', lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId, fighterAId: headliner, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1,
      })
    })

    const featured = await t.query(api.fighters.getFeaturedFighter, {})
    expect(featured?.name).toBe('Headliner')
  })

  it('falls back to the heavyweight champion when the main-event fighter has no photo', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('fighters', fighter('HW Champ', {
        weightClass: 'heavyweight', ranking: 0, photoUrl: 'hw.png',
      }))
      const headliner = await ctx.db.insert('fighters', fighter('No Photo Headliner')) // no photoUrl
      const eventId = await ctx.db.insert('events', {
        name: 'UFC 320', date: Date.now() + 2 * 24 * HOUR, venue: '', location: '', slug: 'ufc-320', lastSynced: 0,
      })
      await ctx.db.insert('bouts', {
        eventId, fighterAId: headliner, weightClass: 'lightweight', cardTier: 'main', boutOrder: 1,
      })
    })

    const featured = await t.query(api.fighters.getFeaturedFighter, {})
    expect(featured?.name).toBe('HW Champ')
  })

  it('falls back to the heavyweight champion when there are no upcoming events', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('fighters', fighter('HW Champ', {
        weightClass: 'heavyweight', ranking: 0, photoUrl: 'hw.png',
      }))
      await ctx.db.insert('fighters', fighter('LW Champ', {
        weightClass: 'lightweight', ranking: 0, photoUrl: 'lw.png',
      }))
    })

    const featured = await t.query(api.fighters.getFeaturedFighter, {})
    expect(featured?.name).toBe('HW Champ')
  })

  it('falls back to the lightweight champion when the heavyweight champion has no photo', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('fighters', fighter('HW Champ No Photo', {
        weightClass: 'heavyweight', ranking: 0,
      }))
      await ctx.db.insert('fighters', fighter('LW Champ', {
        weightClass: 'lightweight', ranking: 0, photoUrl: 'lw.png',
      }))
    })

    const featured = await t.query(api.fighters.getFeaturedFighter, {})
    expect(featured?.name).toBe('LW Champ')
  })
})
