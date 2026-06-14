import { describe, expect, it } from 'vitest'
import {
  getEligiblePostEventWeightClasses,
  isPostEventSyncEligible,
  type PostEventCandidate,
} from './postEventSync'

const NOW = 1_700_000_000_000
const HOUR = 60 * 60 * 1000

function eventHoursAgo(
  hours: number,
  overrides: Partial<PostEventCandidate> = {},
): PostEventCandidate {
  return {
    date: NOW - hours * HOUR,
    fightersScrapedAt: null,
    weightClasses: ['mens-welterweight'],
    ...overrides,
  }
}

describe('isPostEventSyncEligible', () => {
  it('rejects an event that passed only 23h ago (too recent)', () => {
    expect(isPostEventSyncEligible(eventHoursAgo(23), NOW)).toBe(false)
  })

  it('accepts an event 25h ago with no prior scrape', () => {
    expect(isPostEventSyncEligible(eventHoursAgo(25), NOW)).toBe(true)
  })

  it('rejects an event 25h ago that was already scraped', () => {
    expect(
      isPostEventSyncEligible(
        eventHoursAgo(25, { fightersScrapedAt: NOW - HOUR }),
        NOW,
      ),
    ).toBe(false)
  })

  it('rejects an event 50h ago (past the 48h ceiling)', () => {
    expect(isPostEventSyncEligible(eventHoursAgo(50), NOW)).toBe(false)
  })

  it('treats undefined fightersScrapedAt the same as null', () => {
    expect(
      isPostEventSyncEligible(eventHoursAgo(25, { fightersScrapedAt: undefined }), NOW),
    ).toBe(true)
  })
})

describe('getEligiblePostEventWeightClasses', () => {
  it('returns nothing for an event 23h ago', () => {
    expect(getEligiblePostEventWeightClasses([eventHoursAgo(23)], NOW)).toEqual([])
  })

  it('returns the weight classes of an eligible event (25h ago, not scraped)', () => {
    expect(
      getEligiblePostEventWeightClasses(
        [eventHoursAgo(25, { weightClasses: ['mens-lightweight', 'womens-flyweight'] })],
        NOW,
      ),
    ).toEqual(['mens-lightweight', 'womens-flyweight'])
  })

  it('returns nothing for an event 25h ago that was already scraped', () => {
    expect(
      getEligiblePostEventWeightClasses(
        [eventHoursAgo(25, { fightersScrapedAt: NOW - HOUR })],
        NOW,
      ),
    ).toEqual([])
  })

  it('returns nothing for an event 50h ago (outside the window)', () => {
    expect(getEligiblePostEventWeightClasses([eventHoursAgo(50)], NOW)).toEqual([])
  })

  it('deduplicates overlapping weight classes across two eligible events', () => {
    const result = getEligiblePostEventWeightClasses(
      [
        eventHoursAgo(25, { weightClasses: ['mens-welterweight', 'mens-lightweight'] }),
        eventHoursAgo(30, { weightClasses: ['mens-lightweight', 'womens-bantamweight'] }),
      ],
      NOW,
    )
    expect([...result].sort()).toEqual([
      'mens-lightweight',
      'mens-welterweight',
      'womens-bantamweight',
    ])
  })
})
