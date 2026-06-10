# ADR 0005: Events and Bouts Data Architecture

**Status:** Accepted  
**Date:** 2026-06-10

## Context

The hero section needed live UFC event data (next event name, date, main event matchup). The app already scraped fighter rankings from `ufc.com/rankings` via a client-triggered action. We needed to decide how to model and scrape event data.

## Decision

### Schema: two new tables

`events` — one record per UFC event (upcoming and past):
- `name`, `date` (Unix timestamp), `venue`, `location`, `lastSynced`
- Indexed by `date` — enables "next upcoming event" in one query

`bouts` — one record per scheduled fight, referencing `events`:
- `eventId`, `fighterAId` (required), `fighterBId` (optional — absent means TBA)
- `weightClass`, `cardTier` (main / prelim / early_prelim), `boutOrder` (1 = main event)
- Indexed by `eventId`, `fighterAId`, `fighterBId`
- Separate table (not embedded in event) to enable per-fighter indexed queries

### Fighter activity enforcement

Fighters are only stored if they have a live reason to be active: either they appear in the UFC rankings, or they are on an upcoming fight card. Activity is enforced structurally by the scraping strategy — there is no `isActive` boolean flag. When a fighter appears on a card but is not yet in the `fighters` table, they are fully scraped (photo + stats + record) before the bout record is created. Presence on a scheduled card is proof of activity — no athlete page status check is required.

### Scraping: server-side cron, not client-triggered

Fighter scraping is client-triggered (fired when a user navigates to a division page, gated by a 24h staleness check). Event scraping uses a Convex scheduled function (`crons.daily`) instead, because:
- Event data must be fresh when the first visitor of the day hits the hero — it cannot depend on a user triggering it
- There is one global events list, not per-division data tied to navigation

### Scope: all upcoming events, past events kept

All scheduled events (typically 2–4 months out) are stored, not just the next one. This powers accurate "NEXT FIGHT" dates on fighter profiles — the bout table is queried by fighter ID, returning the earliest `event.date > now`. Past events are never purged; they are the source of truth for fight history (a planned feature).

### Scraping source

`ufc.com/events` (listing page) + `ufc.com/event/{slug}` (individual event pages). Both are server-side rendered and yield clean HTML. The listing page provides event slugs, names, and Unix timestamps via `data-main-card-timestamp`. Individual event pages provide fighter slugs, names, weight classes, and bout order via `c-listing-fight` elements.

## Consequences

- `events` and `bouts` tables must be kept in sync by the cron — if the cron fails, event data goes stale silently. A Convex cron failure is observable in the Convex dashboard.
- `fighterAId` is always the known fighter; `fighterBId` is absent when the opponent hasn't been announced (TBA). UI must handle the absent case.
- The `by_fighter_a` and `by_fighter_b` indexes on `bouts` must both be queried and unioned to answer "what is fighter X's next fight?" — fighter assignment to red/blue corner is not guaranteed to be consistent.
- Dropping `isActive` from `fighters` means stale/retired fighter records are never explicitly marked. They become naturally stale (old `lastSynced`) but are not deleted. A future cleanup pass could prune records not updated in >90 days.
