// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
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
