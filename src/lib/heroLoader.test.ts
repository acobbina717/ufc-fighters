// Loader + TBA-contract tests for the experience route's SSR hero data
// (issue #25). The Convex HTTP client is mocked at module level; assertions
// cover the contract: loading/missing data never renders "TBA" placeholders —
// only a genuinely unannounced corner on a real bout does.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFunctionName } from 'convex/server'
import type { FunctionReference } from 'convex/server'

const queryMock = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(() => ({ query: queryMock })),
}))

import { ConvexHttpClient } from 'convex/browser'
import { derivePressPass, loadHeroData } from './heroLoader'
import type { NextEventData } from './heroLoader'

const jones = { name: 'Jon Jones', photoUrl: 'https://img/jones.png' }
const aspinall = { name: 'Tom Aspinall', photoUrl: 'https://img/aspinall.png' }

// 2026-07-18T00:00:00 local — formatEventDate uses local time.
const eventDateMs = new Date(2026, 6, 18).getTime()

function makeEvent(overrides: Partial<NonNullable<NextEventData>> = {}): NextEventData {
  return {
    name: 'UFC 320: Jones vs Aspinall',
    date: eventDateMs,
    venue: 'T-Mobile Arena',
    location: 'Las Vegas, Nevada',
    fighterA: jones,
    fighterB: aspinall,
    ...overrides,
  } as NextEventData
}

beforeEach(() => {
  vi.stubEnv('VITE_CONVEX_URL', 'https://unit-test.convex.cloud')
})

afterEach(() => {
  vi.unstubAllEnvs()
  queryMock.mockReset()
  vi.mocked(ConvexHttpClient).mockClear()
})

describe('loadHeroData', () => {
  it('fetches the next event and featured fighter via the Convex HTTP client', async () => {
    const event = makeEvent()
    queryMock.mockImplementation(async (ref: FunctionReference<'query'>) => {
      const name = getFunctionName(ref)
      if (name === 'events:getNextEvent') return event
      if (name === 'fighters:getFeaturedFighter') return jones
      throw new Error(`unexpected query: ${name}`)
    })

    const data = await loadHeroData()

    expect(ConvexHttpClient).toHaveBeenCalledWith('https://unit-test.convex.cloud')
    expect(data.nextEvent).toEqual(event)
    expect(data.featuredFighter).toEqual(jones)
  })

  it('server-loaded data renders real names, date, and matchup — no TBA placeholders', async () => {
    queryMock.mockImplementation(async (ref: FunctionReference<'query'>) =>
      getFunctionName(ref) === 'events:getNextEvent' ? makeEvent() : jones,
    )

    const data = await loadHeroData()
    const pressPass = derivePressPass(data.nextEvent)

    expect(pressPass).toEqual({
      eventName: 'UFC 320: Jones vs Aspinall',
      matchup: 'JONES vs ASPINALL',
      eventDate: 'JUL 18 · 2026',
    })
    expect(JSON.stringify(pressPass)).not.toContain('TBA')
    expect(JSON.stringify(pressPass)).not.toContain('TO BE ANNOUNCED')
  })

  it('throws when VITE_CONVEX_URL is missing instead of rendering placeholders', async () => {
    vi.stubEnv('VITE_CONVEX_URL', '')
    await expect(loadHeroData()).rejects.toThrow('VITE_CONVEX_URL')
  })
})

describe('derivePressPass — the TBA contract', () => {
  it('renders no press pass at all (not "TBA") when there is no upcoming event', () => {
    // null is what getNextEvent returns with no scheduled events — and what the
    // hero sees while nothing has loaded. Neither may produce placeholder text.
    expect(derivePressPass(null)).toBeNull()
  })

  it('renders TBA only for a genuinely unannounced opponent', () => {
    const pressPass = derivePressPass(makeEvent({ fighterB: null }))
    expect(pressPass?.matchup).toBe('JONES vs TBA')
    // The rest of the press pass stays real — no placeholder leakage.
    expect(pressPass?.eventName).toBe('UFC 320: Jones vs Aspinall')
    expect(pressPass?.eventDate).toBe('JUL 18 · 2026')
  })

  it('renders both real corner last names when both are announced', () => {
    const pressPass = derivePressPass(makeEvent())
    expect(pressPass?.matchup).toBe('JONES vs ASPINALL')
    expect(pressPass?.matchup).not.toContain('TBA')
  })
})
