import { describe, expect, it } from 'vitest'
import { MENS_DIVISIONS, WOMENS_DIVISIONS, formatWeightRange } from './weightClasses'

const byKey = (key: string) => {
  const def = MENS_DIVISIONS.find((d) => d.key === key)
  if (!def) throw new Error(`no division ${key}`)
  return def
}

describe('formatWeightRange', () => {
  it('renders a division with both bounds as a full range', () => {
    expect(formatWeightRange(byKey('mens-heavyweight'))).toBe('206 – 265 LBS')
  })

  it('renders a floorless division (Strawweight) as an upper-bound-only range', () => {
    const strawweight = WOMENS_DIVISIONS.find((d) => d.key === 'womens-strawweight')!
    expect(formatWeightRange(strawweight)).toBe('UP TO 115 LBS')
  })

  it('produces a well-formed range for every division (no missing or garbage floor)', () => {
    for (const def of [...MENS_DIVISIONS, ...WOMENS_DIVISIONS]) {
      expect(formatWeightRange(def), def.key).toMatch(/^(UP TO \d+|\d+ – \d+) LBS$/)
    }
  })
})
