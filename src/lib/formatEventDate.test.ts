import { describe, expect, it } from 'vitest'
import { formatEventDate } from './formatEventDate'

describe('formatEventDate', () => {
  it('formats a timestamp as uppercase MON D · YYYY', () => {
    // 2026-04-18 (noon local to avoid TZ date rollover)
    const ms = new Date(2026, 3, 18, 12).getTime()
    expect(formatEventDate(ms)).toBe('APR 18 · 2026')
  })

  it('does not zero-pad single-digit days', () => {
    const ms = new Date(2026, 0, 5, 12).getTime()
    expect(formatEventDate(ms)).toBe('JAN 5 · 2026')
  })

  it('maps December correctly (last month index)', () => {
    const ms = new Date(2025, 11, 31, 12).getTime()
    expect(formatEventDate(ms)).toBe('DEC 31 · 2025')
  })
})
