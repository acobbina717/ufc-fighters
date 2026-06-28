// Pure country-normalisation logic for fighter scraping. No Convex runtime
// imports — unit-tested with plain HTML fixtures, matching the pattern in
// eventParse.ts / postEventSync.ts / fighterPrune.ts. fighterHydrate.ts feeds in
// an athlete page's raw HTML; this module extracts the country and normalises it
// to a full country name written to the DB `country` field.
//
// SEAM: the DB `country` field is the boundary between this Convex-side
// normalisation and the frontend's flag lookup (COUNTRY_ISO / countryFlag in
// src/lib/cardLedger.ts). There is no cross-boundary import in either direction —
// both sides agree on the full English country name as the shared contract.
//
// UFC athlete pages no longer carry a "Nationality" demonym field; the country
// now lives in the "Place of Birth" bio field as "City, Country" (e.g.
// "Rochester, United States", "Dagestan Republic, Russia") — or occasionally as
// a bare country with no city ("Germany"). We take the segment after the last
// comma as the country and normalise a few variants to the COUNTRY_ISO keys the
// frontend uses for flags.

// Place-of-birth country spellings that differ from the COUNTRY_ISO keys the
// frontend flag lookup expects. UK home nations collapse to "United Kingdom" —
// the DB never stores "England"/"Scotland"/"Wales".
export const COUNTRY_ALIASES: Record<string, string> = {
  England: 'United Kingdom', Scotland: 'United Kingdom',
  Wales: 'United Kingdom', 'Northern Ireland': 'United Kingdom',
  'United States of America': 'United States', USA: 'United States',
  'Republic of Korea': 'South Korea', Korea: 'South Korea',
  'Russian Federation': 'Russia',
}

// Extracts the country from an athlete page's "Place of Birth" bio field and
// normalises it to a full country name. Returns undefined when the field is
// absent or blank; an unmapped country falls back to its raw value.
export function normalizeCountry(html: string): string | undefined {
  // "Place of Birth" label followed (within ~300 chars) by the value in the
  // field's c-bio__text element.
  const m = html.match(
    /Place of Birth[\s\S]{0,300}?<div[^>]*class="[^"]*c-bio__text[^"]*"[^>]*>\s*([^<]+?)\s*</,
  )
  if (!m) return undefined
  const place = m[1].trim()
  if (!place) return undefined
  // Country is the segment after the last comma, or the whole value if there is
  // no comma (some pages list only a country, no city).
  const country = place.includes(',')
    ? place.slice(place.lastIndexOf(',') + 1).trim()
    : place
  if (!country) return undefined
  return COUNTRY_ALIASES[country] ?? country
}
