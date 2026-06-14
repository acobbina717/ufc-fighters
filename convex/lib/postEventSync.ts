// Pure decision logic for post-event fighter scraping eligibility (ADR 0010).
// No Convex runtime imports — unit-tested with plain data fixtures, matching the
// pattern in eventParse.ts. The Convex action (scrape.ts) supplies real event
// rows and the current timestamp; this module decides what to scrape.

const HOUR_MS = 60 * 60 * 1000
const FLOOR_MS = 24 * HOUR_MS // event must have passed at least 24h ago
const CEILING_MS = 48 * HOUR_MS // …but no more than 48h ago

export interface PostEventCandidate {
  date: number // event date, Unix ms
  fightersScrapedAt: number | null | undefined // null/undefined = not yet scraped
  weightClasses: string[] // gendered keys, e.g. "mens-welterweight"
}

// An event needs post-event fighter scraping when it passed between 24h and 48h
// ago and its fighters haven't been scraped yet. The 24h floor lets ufc.com
// publish updated rankings; the 48h ceiling means an event lingering past the
// window (only possible after repeated failures) is left for operational repair
// rather than re-scraped indefinitely.
export function isPostEventSyncEligible(
  candidate: PostEventCandidate,
  now: number,
): boolean {
  if (candidate.fightersScrapedAt != null) return false
  const age = now - candidate.date
  return age >= FLOOR_MS && age <= CEILING_MS
}

// Given all candidate events and the current time, returns the distinct gendered
// weight-class keys that need post-event fighter scraping. Deduplicated across
// every eligible event so an overlapping division is scraped only once.
export function getEligiblePostEventWeightClasses(
  candidates: PostEventCandidate[],
  now: number,
): string[] {
  const weightClasses = new Set<string>()
  for (const candidate of candidates) {
    if (!isPostEventSyncEligible(candidate, now)) continue
    for (const wc of candidate.weightClasses) weightClasses.add(wc)
  }
  return [...weightClasses]
}
