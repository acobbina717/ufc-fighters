// SSR data for the experience route's hero (issue #25 — kill the TBA flash).
// The route loader runs this on the server during SSR via the Convex HTTP
// client, so the first paint already contains real event names/date/matchup.
// After hydration the live `useQuery` subscriptions in HeroChapter take over.
import { ConvexHttpClient } from 'convex/browser'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../convex/_generated/api'
import { formatEventDate } from './formatEventDate'

export type NextEventData = FunctionReturnType<typeof api.events.getNextEvent>
export type FeaturedFighterData = FunctionReturnType<typeof api.fighters.getFeaturedFighter>

export interface HeroLoaderData {
  nextEvent: NextEventData
  featuredFighter: FeaturedFighterData
}

export async function loadHeroData(): Promise<HeroLoaderData> {
  const url = import.meta.env.VITE_CONVEX_URL
  if (!url) throw new Error('missing envar VITE_CONVEX_URL')
  const client = new ConvexHttpClient(url)
  const [nextEvent, featuredFighter] = await Promise.all([
    client.query(api.events.getNextEvent, {}),
    client.query(api.fighters.getFeaturedFighter, {}),
  ])
  return { nextEvent, featuredFighter }
}

type Corner = NonNullable<NextEventData>['fighterA']

// Last name (final whitespace-delimited token), uppercased; "TBA" only for a
// corner that is genuinely unannounced (null fighter on a real bout).
export function cornerName(fighter: Corner): string {
  const last = fighter?.name?.trim().split(/\s+/).pop()
  return last ? last.toUpperCase() : 'TBA'
}

export interface PressPass {
  eventName: string
  matchup: string
  eventDate: string
}

// The TBA contract: no event (loading or genuinely none scheduled) renders no
// press pass at all — never placeholder text. "TBA" appears only inside a real
// event whose corner is genuinely unannounced.
export function derivePressPass(event: NextEventData): PressPass | null {
  if (!event) return null
  return {
    eventName: event.name,
    matchup: `${cornerName(event.fighterA)} vs ${cornerName(event.fighterB)}`,
    eventDate: formatEventDate(event.date),
  }
}
