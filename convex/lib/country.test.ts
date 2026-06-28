import { describe, expect, it } from 'vitest'
import { COUNTRY_ALIASES, normalizeCountry } from './country'

// Minimal athlete-page markup matching the parser: a "Place of Birth" label
// followed by the "City, Country" value in a c-bio__text element. (UFC dropped
// the old "Nationality" demonym field; Place of Birth is the source now.)
function bioHtml(placeOfBirth: string): string {
  return (
    `<div class="c-bio__field">` +
    `<div class="c-bio__label">Place of Birth</div>` +
    `<div class="c-bio__text">${placeOfBirth}</div>` +
    `</div>`
  )
}

describe('normalizeCountry', () => {
  it('takes the country after the last comma of Place of Birth', () => {
    expect(normalizeCountry(bioHtml('Rochester, United States'))).toBe('United States')
  })

  it('handles a multi-comma place, using only the final segment', () => {
    expect(normalizeCountry(bioHtml('Dagestan Republic, Russia'))).toBe('Russia')
  })

  it('uses the whole value when there is no comma', () => {
    expect(normalizeCountry(bioHtml('Germany'))).toBe('Germany')
  })

  it('collapses UK home nations to "United Kingdom"', () => {
    expect(normalizeCountry(bioHtml('Salford, England'))).toBe('United Kingdom')
    expect(normalizeCountry(bioHtml('Scotland'))).toBe('United Kingdom')
  })

  it('falls back to the raw country for an unmapped value', () => {
    expect(normalizeCountry(bioHtml('Springfield, Atlantis'))).toBe('Atlantis')
  })

  it('extracts the country amid surrounding page markup', () => {
    const html = `<header>UFC</header>${bioHtml('Lagos, Nigeria')}<footer>©</footer>`
    expect(normalizeCountry(html)).toBe('Nigeria')
  })

  it('returns undefined when no Place of Birth block is present', () => {
    expect(normalizeCountry('<div class="c-bio__text">whatever</div>')).toBeUndefined()
  })

  it('returns undefined when Place of Birth is blank', () => {
    expect(normalizeCountry(bioHtml(' '))).toBeUndefined()
  })
})

describe('COUNTRY_ALIASES', () => {
  it('exposes the alias map for callers', () => {
    expect(COUNTRY_ALIASES.England).toBe('United Kingdom')
    expect(COUNTRY_ALIASES.Scotland).toBe('United Kingdom')
  })
})
