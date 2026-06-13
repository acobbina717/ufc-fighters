# ADR 0006 — Site-wide unified color scheme

**Status:** Accepted

## Context

The Experience route supports light/dark via `light-dark()` tokens and a floating Sun/Moon toggle (ADR 0002), while the `/_app/` section was built light-only on a white base. A user who chooses dark in the Experience and then navigates to `/_app/` is dropped onto a hard-white page that ignores their preference.

## Decision

One color-scheme preference governs the entire site. The `/_app/` section adopts `light-dark()` tokenization, and both modes (cinematic and utility) read and write the same Mantine color-scheme value. The earlier "white base, no dark mode in the app section" convention is superseded.

## Considered Options

- **Intentional split** (experience = theater with its own lighting, app = light-only utility) — rejected: the dark-to-white transition between modes reads as a bug, not editorial intent.
- **Dark-first everywhere, drop light mode** — rejected: light mode and the toggle already exist by design (ADR 0002) and broaden the showcase.

## Consequences

- Every `/_app/` surface (Header, fighter cards, matchup, overlays) needs mode-aware tokens; no hardcoded `#fff` backgrounds.
- The color-scheme toggle must be reachable from the App header as well as the Experience route's floating toggle, both driving the same preference.
- Default is `auto` (follow `prefers-color-scheme`); the user's explicit toggle choice persists. Because light-OS visitors land on the light hero, light mode must be art-directed to the same standard as dark — it is not a fallback.
