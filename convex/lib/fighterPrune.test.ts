import { describe, expect, it } from 'vitest'
import { shouldPruneFighter } from './fighterPrune'

const ranked = new Set(['jon-jones', 'tom-aspinall'])

describe('shouldPruneFighter', () => {
  it('keeps a fighter present in the ranked slugs', () => {
    expect(shouldPruneFighter(ranked, 'jon-jones', 0, 0)).toBe(false)
  })

  it('keeps an unranked fighter with upcoming bouts', () => {
    expect(shouldPruneFighter(ranked, 'some-prospect', 1, 0)).toBe(false)
  })

  it('keeps an unranked fighter with past bouts', () => {
    expect(shouldPruneFighter(ranked, 'retired-vet', 0, 3)).toBe(false)
  })

  it('deletes an unranked fighter with no upcoming and no past bouts', () => {
    expect(shouldPruneFighter(ranked, 'ghost-record', 0, 0)).toBe(true)
  })

  it('keeps a ranked fighter even when they somehow have no bouts', () => {
    expect(shouldPruneFighter(ranked, 'tom-aspinall', 0, 0)).toBe(false)
  })

  it('accepts a plain array of ranked slugs', () => {
    expect(shouldPruneFighter(['jon-jones'], 'jon-jones', 0, 0)).toBe(false)
    expect(shouldPruneFighter(['jon-jones'], 'nobody', 0, 0)).toBe(true)
  })
})
