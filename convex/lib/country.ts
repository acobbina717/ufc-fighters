// Pure country-normalisation logic for fighter scraping. No Convex runtime
// imports — unit-tested with plain HTML fixtures, matching the pattern in
// eventParse.ts / postEventSync.ts / fighterPrune.ts. fighterHydrate.ts feeds in
// an athlete page's raw HTML; this module extracts the nationality demonym and
// normalises it to a full country name written to the DB `country` field.
//
// SEAM: the DB `country` field is the boundary between this Convex-side
// normalisation and the frontend's flag lookup (COUNTRY_ISO / countryFlag in
// src/lib/cardLedger.ts). There is no cross-boundary import in either direction —
// both sides agree on the full English country name as the shared contract.

// UFC athlete pages encode nationality as a demonym (e.g. "American", "Brazilian").
// We normalise to a full country name so it matches the COUNTRY_ISO map the
// frontend uses for flag display. UK home-nation demonyms all collapse to
// "United Kingdom" — the DB never stores "England"/"Scotland"/"Wales".
export const DEMONYM_TO_COUNTRY: Record<string, string> = {
  American: 'United States', Brazilian: 'Brazil', Russian: 'Russia',
  Canadian: 'Canada', Mexican: 'Mexico', Australian: 'Australia',
  'New Zealander': 'New Zealand', Irish: 'Ireland', British: 'United Kingdom',
  English: 'United Kingdom', Scottish: 'United Kingdom', Welsh: 'United Kingdom',
  Polish: 'Poland', Georgian: 'Georgia', French: 'France', German: 'Germany',
  Dutch: 'Netherlands', Swedish: 'Sweden', Norwegian: 'Norway', Finnish: 'Finland',
  Danish: 'Denmark', Spanish: 'Spain', Italian: 'Italy', Portuguese: 'Portugal',
  Swiss: 'Switzerland', Austrian: 'Austria', Belgian: 'Belgium', Croatian: 'Croatia',
  Serbian: 'Serbia', Czech: 'Czechia', Slovak: 'Slovakia', Lithuanian: 'Lithuania',
  Moldovan: 'Moldova', Ukrainian: 'Ukraine', Belarusian: 'Belarus', Turkish: 'Turkey',
  Greek: 'Greece', Icelandic: 'Iceland', Chinese: 'China', Japanese: 'Japan',
  'South Korean': 'South Korea', Korean: 'South Korea', Thai: 'Thailand',
  Filipino: 'Philippines', Singaporean: 'Singapore', Indian: 'India',
  Indonesian: 'Indonesia', Kazakhstani: 'Kazakhstan', Kyrgyz: 'Kyrgyzstan',
  Uzbek: 'Uzbekistan', Azerbaijani: 'Azerbaijan', Armenian: 'Armenia',
  Iranian: 'Iran', Peruvian: 'Peru', Ecuadorian: 'Ecuador', Colombian: 'Colombia',
  Venezuelan: 'Venezuela', Argentinian: 'Argentina', Chilean: 'Chile',
  Bolivian: 'Bolivia', Paraguayan: 'Paraguay', Uruguayan: 'Uruguay',
  Jamaican: 'Jamaica', Puerto: 'Puerto Rico', Nigerian: 'Nigeria',
  'South African': 'South Africa', Cameroonian: 'Cameroon', Congolese: 'DR Congo',
  Moroccan: 'Morocco', Egyptian: 'Egypt', Jordanian: 'Jordan', Bahraini: 'Bahrain',
  Israeli: 'Israel', Iraqi: 'Iraq',
}

// Extracts the nationality from an athlete page's HTML and normalises it to a
// full country name. Returns undefined when the Nationality block is absent;
// an unmapped demonym falls back to its raw value.
export function normalizeCountry(html: string): string | undefined {
  // UFC athlete pages list nationality as a labelled bio field.
  // Pattern: "Nationality" label followed (within ~300 chars) by the value in a text element.
  const m = html.match(/Nationality[\s\S]{0,300}?<div[^>]*class="[^"]*c-bio__text[^"]*"[^>]*>\s*([^<]+?)\s*</)
  if (!m) return undefined
  const raw = m[1].trim()
  return DEMONYM_TO_COUNTRY[raw] ?? raw
}
