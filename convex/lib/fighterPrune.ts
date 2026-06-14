// Pure decision logic for fighter pruning (ADR 0010). No Convex runtime imports —
// unit-tested with plain data, matching eventParse.ts. The pruning mutation
// (fighters.ts) supplies the ranked slug set and each fighter's bout counts;
// this module decides whether a fighter may be deleted.

// A fighter is removed only when all three conditions hold: they are absent from
// the current rankings page for their weight class, they have no upcoming bouts,
// and they have no past bouts. Any bout history keeps them — past bouts power
// future matchup analysis, upcoming bouts mean they're on a scheduled card.
export function shouldPruneFighter(
  rankedSlugs: ReadonlySet<string> | readonly string[],
  ufcUrl: string,
  upcomingBoutCount: number,
  pastBoutCount: number,
): boolean {
  const ranked = Array.isArray(rankedSlugs)
    ? new Set(rankedSlugs)
    : (rankedSlugs as ReadonlySet<string>)
  if (ranked.has(ufcUrl)) return false
  return upcomingBoutCount === 0 && pastBoutCount === 0
}
