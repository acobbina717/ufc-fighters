# ADR 0002 — Two-mode information architecture

**Status:** Accepted

## Context

The project has two competing needs: a cinematic, Awwwards-quality entry experience and a utilitarian app (fighter search, head-to-head, stats, fight history). Merging them risks compromising both.

## Decision

Maintain two distinct modes with separate URL trees and navigation shells:

- `/experience` and `/divisions/*` — cinematic, no header, full-screen, animation-first
- `/_app/*` — utilitarian, persistent header, search always reachable

The Experience route is the "front door" and showcase moment. The App section is the tool.

## Consequences

- New utilitarian features (search, head-to-head, stats deep-dive, fight history) live exclusively under `/_app/`
- The Experience route must never gain a persistent header or utility nav
- The App header needs a design pass to accommodate search, navigation between features, and eventual mobile improvements
