import { describe, expect, it } from 'vitest'
import {
  diffFighter,
  type ExistingFighter,
  type FighterRecord,
  type FighterStats,
  type IncomingFighter,
} from './fighterDiff'

const RECORD: FighterRecord = { wins: 20, losses: 3, draws: 0, noContests: 1 }

const STATS: FighterStats = {
  slpm: 4.5,
  strikingAccuracy: 55,
  sapm: 2.1,
  strikingDefense: 60,
  takedownAvg: 1.2,
  takedownAccuracy: 40,
  takedownDefense: 75,
  submissionAvg: 0.5,
}

// A fully-populated existing fighter that incoming patches are diffed against.
function existing(overrides: Partial<ExistingFighter> = {}): ExistingFighter {
  return {
    ranking: 1,
    photoUrl: 'https://img/old.png',
    nickname: 'The Old',
    weightClass: 'lightweight',
    division: 'mens',
    record: { ...RECORD },
    stats: { ...STATS },
    weight: '155 lbs.',
    country: 'United States',
    ...overrides,
  }
}

// Incoming that exactly mirrors the existing fighter — diffing must be a no-op.
function identicalIncoming(): IncomingFighter {
  return {
    ranking: 1,
    photoUrl: 'https://img/old.png',
    nickname: 'The Old',
    weightClass: 'lightweight',
    division: 'mens',
    record: { ...RECORD },
    stats: { ...STATS },
    weight: '155 lbs.',
    country: 'United States',
  }
}

describe('diffFighter', () => {
  it('returns an empty patch when incoming matches existing', () => {
    expect(diffFighter(existing(), identicalIncoming())).toEqual({})
  })

  it('returns an empty patch when incoming is empty (all undefined)', () => {
    expect(diffFighter(existing(), {})).toEqual({})
  })

  it('patches only the single scalar field that changed', () => {
    const patch = diffFighter(existing(), { ...identicalIncoming(), ranking: 2 })
    expect(patch).toEqual({ ranking: 2 })
  })

  it('patches the whole record sub-object when any record field differs', () => {
    const changedRecord = { ...RECORD, wins: 21 }
    const patch = diffFighter(existing(), { ...identicalIncoming(), record: changedRecord })
    expect(patch).toEqual({ record: changedRecord })
  })

  it('does not patch record when every record field matches', () => {
    const patch = diffFighter(existing(), { ...identicalIncoming(), record: { ...RECORD } })
    expect(patch.record).toBeUndefined()
  })

  it('patches the whole stats sub-object when any stat differs', () => {
    const changedStats = { ...STATS, slpm: 5.0 }
    const patch = diffFighter(existing(), { ...identicalIncoming(), stats: changedStats })
    expect(patch).toEqual({ stats: changedStats })
  })

  it('does not patch stats when every stat matches', () => {
    const patch = diffFighter(existing(), { ...identicalIncoming(), stats: { ...STATS } })
    expect(patch.stats).toBeUndefined()
  })

  it('does not patch a field whose incoming value is undefined', () => {
    const patch = diffFighter(existing(), { ranking: undefined, country: undefined })
    expect(patch).toEqual({})
  })

  it('always includes lastSynced when provided, even if nothing else changed', () => {
    const patch = diffFighter(existing(), { ...identicalIncoming(), lastSynced: 12345 })
    expect(patch).toEqual({ lastSynced: 12345 })
  })

  it('does not patch photoUrl when incoming is an empty string (falsy)', () => {
    const patch = diffFighter(existing(), { ...identicalIncoming(), photoUrl: '' })
    expect(patch.photoUrl).toBeUndefined()
  })

  it('patches nickname to an empty string when it differs (undefined-guarded, not truthy)', () => {
    const patch = diffFighter(existing({ nickname: 'X' }), { ...identicalIncoming(), nickname: '' })
    expect(patch).toEqual({ nickname: '' })
  })

  it('combines multiple independent changes into one patch', () => {
    const patch = diffFighter(existing(), {
      ...identicalIncoming(),
      ranking: 0,
      weight: '170 lbs.',
      lastSynced: 999,
    })
    expect(patch).toEqual({ ranking: 0, weight: '170 lbs.', lastSynced: 999 })
  })
})
