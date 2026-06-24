import { describe, expect, it } from 'vitest'
import { DEMONYM_TO_COUNTRY, normalizeCountry } from './country'

// Minimal athlete-page markup matching the parser regex: a Nationality label
// followed by the demonym in a c-bio__text element.
function bioHtml(demonym: string): string {
  return (
    `<div class="c-bio__field">` +
    `<div class="c-bio__label">Nationality</div>` +
    `<div class="c-bio__text">${demonym}</div>` +
    `</div>`
  )
}

describe('normalizeCountry', () => {
  it('maps a known demonym to its full country name', () => {
    expect(normalizeCountry(bioHtml('American'))).toBe('United States')
  })

  it('collapses UK home-nation demonyms to "United Kingdom"', () => {
    expect(normalizeCountry(bioHtml('Scottish'))).toBe('United Kingdom')
  })

  it('falls back to the raw value for an unknown demonym', () => {
    expect(normalizeCountry(bioHtml('Martian'))).toBe('Martian')
  })

  it('extracts the country when the Nationality block is present', () => {
    const html = `<header>UFC</header>${bioHtml('Brazilian')}<footer>©</footer>`
    expect(normalizeCountry(html)).toBe('Brazil')
  })

  it('returns undefined when no Nationality block is present', () => {
    expect(normalizeCountry('<div class="c-bio__text">whatever</div>')).toBeUndefined()
  })
})

describe('DEMONYM_TO_COUNTRY', () => {
  it('exposes the demonym map for callers', () => {
    expect(DEMONYM_TO_COUNTRY.American).toBe('United States')
    expect(DEMONYM_TO_COUNTRY.English).toBe('United Kingdom')
  })
})
