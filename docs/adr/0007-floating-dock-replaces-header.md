# ADR 0007 — Site-wide floating dock replaces the Header

**Status:** Accepted (supersedes the "no nav on Experience" clause of ADR 0002)

## Context

Navigation chrome was split: a conventional Header injected via the `_app` pathless layout, and nothing at all on `/experience` and `/divisions/*` (ADR 0002 forbade persistent nav there). That left the cinematic routes as dead ends — no way out except the browser back button — and the `_app` layout existed solely to carry the Header.

## Decision

One floating dock (compact, collapsible pill: Experience, Fighters, Matchup, color-scheme toggle) renders from the root layout on every route. The Header is retired, the `_app` pathless layout collapses, and the route tree flattens. ADR 0002's two-mode information architecture stands — cinematic vs. utility surfaces remain distinct — but its "the Experience route must never gain a persistent header or utility nav" clause is revised: the prohibition was against a header *bar*; a discreet dock that stays out of the composition honors that intent while fixing the dead-end.

## Consequences

- Route files under `src/routes/_app/` move up a level; route IDs lose the `_app` prefix (e.g. `/_app/fighters/` → `/fighters/`).
- The dock must be designed to recede on the cinematic routes (collapsed/auto-hidden during scroll-driven sequences) so it never competes with the chapters.
- The dock carries the single color-scheme toggle (ADR 0006); the Experience route's separate floating Sun/Moon toggle is absorbed into it.
- One nav system to maintain instead of two.
