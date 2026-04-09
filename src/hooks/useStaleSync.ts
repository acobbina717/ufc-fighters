import { useEffect } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

const STALE_MS = 24 * 60 * 60 * 1000

// Module-level dedup survives component unmount/remount cycles (e.g. GSAP
// teardown). Resets only on full page reload, which is the correct trigger
// to re-check staleness.
const syncedKeys = new Set<string>()

/**
 * Triggers a background scrape for a weight class when its data is missing or
 * older than 24 hours. Each unique `weightClassKey` is checked at most once per
 * page load, so re-renders and component remounts are safe.
 */
export function useStaleSync(
  fighters: Doc<'fighters'>[] | undefined,
  weightClassKey: string | null,
): void {
  const scrapeAction = useAction(api.scrape.scrapeWeightClass)

  useEffect(() => {
    if (fighters === undefined || !weightClassKey) return
    if (syncedKeys.has(weightClassKey)) return
    syncedKeys.add(weightClassKey)
    const oldest = fighters.length === 0 ? 0 : Math.min(...fighters.map(f => f.lastSynced))
    if (fighters.length === 0 || Date.now() - oldest > STALE_MS) {
      scrapeAction({ weightClassKey }).catch(console.error)
    }
  }, [fighters, weightClassKey, scrapeAction])
}
