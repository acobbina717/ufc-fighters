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

export default crons
