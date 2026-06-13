import { useEffect } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

const STALE_MS = 24 * 60 * 60 * 1000
const SCRAPE_COOLDOWN_MS = 30_000

// Plain object records the last scrape timestamp per key. A short cooldown
// absorbs GSAP teardown/remount storms while still allowing a re-scrape if
// data genuinely disappears mid-session (e.g. manual DB deletion).
const lastScrapeAt: Record<string, number> = {}

export function useStaleSync(
  fighters: Doc<'fighters'>[] | undefined,
  weightClassKey: string | null,
): void {
  const scrapeAction = useAction(api.scrape.scrapeWeightClass)

  useEffect(() => {
    if (fighters === undefined || !weightClassKey) return

    const lastAt = lastScrapeAt[weightClassKey] ?? 0
    if (Date.now() - lastAt < SCRAPE_COOLDOWN_MS) return

    const oldest = fighters.length === 0 ? 0 : Math.min(...fighters.map(f => f.lastSynced))
    if (fighters.length === 0 || Date.now() - oldest > STALE_MS) {
      lastScrapeAt[weightClassKey] = Date.now()
      scrapeAction({ weightClassKey }).catch(console.error)
    }
  }, [fighters, weightClassKey, scrapeAction])
}
