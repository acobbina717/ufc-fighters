import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

// Refresh upcoming events and their fight cards once a day. Server-side rather
// than client-triggered (unlike fighter scraping) so event data is fresh for the
// first visitor of the day without depending on user navigation.
crons.daily(
  'scrape upcoming events',
  { hourUTC: 9, minuteUTC: 0 }, // ~early morning US time
  api.scrape.scrapeEvents
)

// Refresh fighter rankings/records/stats for divisions that fought 24–48h ago.
// Event-driven rather than daily-for-all: fighter data only changes after a card
// finishes, so this targets just the weight classes that had bouts. See ADR 0010.
crons.daily(
  'scrape post-event weight classes',
  { hourUTC: 9, minuteUTC: 0 },
  api.scrape.scrapePostEventWeightClasses
)

export default crons
