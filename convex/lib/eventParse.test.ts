import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEventCard, parseEventListing } from './eventParse'

const listingHtml = readFileSync(
  join(__dirname, '__fixtures__', 'events-listing.html'),
  'utf-8'
)

const cardHtml = readFileSync(
  join(__dirname, '__fixtures__', 'event-ufc-329.html'),
  'utf-8'
)

describe('parseEventListing', () => {
  it('returns only the upcoming events, not past ones', () => {
    const events = parseEventListing(listingHtml)

    // The fixture's "Upcoming" section has 8 events; the "Past" section must be excluded.
    expect(events).toHaveLength(8)

    const slugs = events.map((e) => e.slug)
    expect(slugs).toContain('ufc-329')
    // ufc-327 lives in the Past section and must not leak in.
    expect(slugs).not.toContain('ufc-327')
  })

  it('extracts slug, name, and Unix timestamp for an event', () => {
    const events = parseEventListing(listingHtml)
    const ufc329 = events.find((e) => e.slug === 'ufc-329')

    expect(ufc329).toBeDefined()
    expect(ufc329!.name).toBe('McGregor vs Holloway 2')
    expect(ufc329!.timestamp).toBe(1783818000)
  })
})

describe('parseEventCard', () => {
  it('parses every bout in card order, numbering boutOrder from the main event', () => {
    const bouts = parseEventCard(cardHtml)
    expect(bouts).toHaveLength(12)
    expect(bouts.map((b) => b.boutOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('extracts both corner slugs and normalizes the weight class for the main event', () => {
    const main = parseEventCard(cardHtml)[0]
    expect(main.fighterASlug).toBe('conor-mcgregor')
    expect(main.fighterBSlug).toBe('max-holloway')
    expect(main.weightClass).toBe('welterweight')
    expect(main.cardTier).toBe('main')
  })

  it('strips gender prefix and "Title"/"Bout" suffix from the weight class', () => {
    const bouts = parseEventCard(cardHtml)
    // Bout 8 is a "Women's Flyweight Bout"
    expect(bouts[7].weightClass).toBe('flyweight')
    // Bout 6 is a "Light Heavyweight Bout"
    expect(bouts[5].weightClass).toBe('lightheavyweight')
  })

  it('assigns card tier by bout order (1-5 main, last 3 early_prelim on a 12-fight card)', () => {
    const bouts = parseEventCard(cardHtml)
    expect(bouts[4].cardTier).toBe('main') // order 5
    expect(bouts[5].cardTier).toBe('prelim') // order 6
    expect(bouts[9].cardTier).toBe('early_prelim') // order 10
    expect(bouts[11].cardTier).toBe('early_prelim') // order 12
  })

  it('tags division from the class label (women’s bouts vs men’s default)', () => {
    const bouts = parseEventCard(cardHtml)
    expect(bouts[0].division).toBe('mens') // Welterweight Bout
    expect(bouts[7].division).toBe('womens') // Women's Flyweight Bout
  })

  it('marks the opponent as TBA (absent fighterBSlug) when no blue-corner athlete is linked', () => {
    // Derive a TBA case from the real fixture: drop the main event's blue-corner link.
    const tbaHtml = cardHtml.replace(
      /corner-image--blue">\s*<a href="https:\/\/www\.ufc\.com\/athlete\/max-holloway"/,
      'corner-image--blue">'
    )
    const main = parseEventCard(tbaHtml)[0]
    expect(main.fighterASlug).toBe('conor-mcgregor')
    expect(main.fighterBSlug).toBeUndefined()
  })
})
