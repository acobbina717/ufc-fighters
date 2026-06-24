// Shared HTML scalar helpers. No Convex imports — pure string utilities used by
// both the rankings parser (scrape.ts) and the fighter hydration parsers
// (fighterHydrate.ts).

// Strips tags + decodes the handful of HTML entities the UFC pages emit, then
// collapses whitespace. Good enough for the markup we scrape; not a full decoder.
export function strip(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ').trim()
}

// Parses a stat value that may carry a trailing "%" (e.g. "53%" → 53). Returns
// 0 for anything non-numeric so callers always get a number.
export function parseNum(val: string): number {
  const n = parseFloat(val.replace('%', ''))
  return isNaN(n) ? 0 : n
}
