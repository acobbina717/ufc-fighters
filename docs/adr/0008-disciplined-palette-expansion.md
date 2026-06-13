# ADR 0008 — Disciplined palette expansion

**Status:** Accepted

## Context

The original palette was monochrome + UFC red (#D20A0A), with red doing every job: brand, interactive accent, emphasis, motion cues. The app section is growing data-dense (search, head-to-head, stats deep-dive, fight history), where a single accent cannot legibly encode win/loss, comparisons, and champion status.

## Decision

Keep monochrome + red as the identity, but assign colors strict, exclusive jobs in the Mantine theme:

- **Red** — brand and interactive elements only.
- **Neutral gray ramp** (Mantine tokens, mode-aware) — surfaces, borders, text hierarchy.
- **Champion gold** — exclusively title-holders (belt iconography, champion badges). Never decorative.
- **One semantic win/loss pair** — used only inside data visualization (records, matchup bars). Never in chrome or navigation.

Nothing else enters the palette. The discipline is the system; rejected alternatives were two-color purism (data screens become hard to scan) and expressive per-division hues (dilutes the black/red identity).

**Scope carve-out:** this ADR governs the UI palette (chrome — surfaces, borders, text, accents); full-color *photographic content* (e.g. fighter imagery in the Hero Face-off and the Card Chapter's Corner Thumbnails) is out of scope and does not count against it. See ADR 0009.
