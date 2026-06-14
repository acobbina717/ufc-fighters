# ADR 0010 — Event-Driven Server-Side Fighter Scraping

## Status
Accepted

## Context

Fighter data (rankings, records, stats) was previously refreshed client-side via a `useStaleSync` hook that fired `scrapeWeightClass` whenever a user visited a division with stale or missing data. This created several problems:

- Divisions nobody visited accumulated stale data indefinitely.
- Multiple clients could race to trigger the same scrape simultaneously.
- The client was the source of truth for data freshness, which is architecturally wrong.

Event data was already server-side (daily cron). The asymmetry had no justification beyond historical accident.

UFC rankings and fighter stats only change meaningfully after events occur — a fighter's record, stats, and ranking position shift because of fight results, not the passage of time. Scraping daily was wasting requests on data that hadn't changed.

## Decision

**Fighter scraping is moved entirely server-side.** The `useStaleSync` hook is deleted. The daily events cron (`scrapeEvents`) is extended to also trigger post-event fighter scraping.

**Trigger rule:** approximately 24 hours after an event's date passes, the cron scrapes the weight classes represented in that event's bouts. This window is sufficient for UFC rankings to update on ufc.com in nearly all cases.

**Idempotency:** a `fightersScrapedAt` field (optional number, Unix ms) is added to the `events` table. After successful fighter scraping triggered by an event, that field is stamped. The cron only targets events where `date < now - 24h` AND `fightersScrapedAt` is null. A failed cron run will retry on the next daily execution rather than silently skipping.

**Fighter pruning:** a fighter is removed from the database only when all three conditions are met: (1) absent from the current rankings page for their weight class, (2) no upcoming bouts, (3) no past bouts. Fighters with any bout history are retained indefinitely — past bouts are used for matchup analysis.

## Consequences

- Rankings and stats are always server-fresh after each event, regardless of whether any user visits the app.
- No client-side scrape logic to reason about, test, or debug.
- The `fightersScrapedAt` field doubles as an audit trail — it's always clear when each event's fighter data was last refreshed.
- The scrape volume is lower overall: instead of potentially scraping every division daily, only the weight classes that actually had fights are refreshed after each event.
- The 24h window means rankings are never more than ~48h stale in the worst case (event happens, cron misses one run).

## Alternatives Rejected

**Daily cron for all weight classes:** Correct data would require scraping 12 divisions every day. UFC rankings don't change on most days — this burns ~192 outbound requests per day for data that is identical to what's already in the DB.

**Client-triggered scraping retained as fallback:** Keeping `useStaleSync` as a safety net reintroduces the race condition and splits the source of truth. The server cron is sufficient; client-side triggering is not needed.

## Addendum (2026-06-13): Cold-start seed & empty divisions

Deleting `useStaleSync` removed the implicit bootstrap that populated an empty division on first visit. The event-driven crons don't cover a cold start: `scrapeEvents` only adds fight-card fighters (no ranking), and the post-event cron only targets divisions from events that ended 24–48h ago. A wiped or freshly-deployed DB therefore had no path to populate the ranked divisions. Two additions close this gap, server-side only — no return to client triggering:

- **`seedDatabase` action** — one-shot full reseed (`scrapeEvents` + `scrapeAllWeightClasses`). The single command to rebuild everything after a wipe: `npx convex run scrape:seedDatabase`. `scrapeAllWeightClasses` loops every ranked division sequentially.
- **Cold-start self-heal** — `scrapePostEventWeightClasses` checks `fighters.hasRankedFighters` (presence of any champion) at the start. When false, it runs the full backfill instead of the post-event diff. No new cron was added; the existing daily fighter cron now repairs an empty DB on its next run.

**Empty divisions are excluded, not scraped.** Women's Featherweight has no active UFC rankings section, so it would only ever scrape empty. It is removed from `RANKINGS_SECTION_TITLE` (scraper), from which `ALL_RANKING_KEYS` is derived, and from `WOMENS_DIVISIONS` (UI). A one-off women's featherweight *bout* still renders via its `cardLedger` label — only the ranked *division* is dropped.
