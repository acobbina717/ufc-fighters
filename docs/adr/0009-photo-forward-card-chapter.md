# ADR 0009 — Photo-forward Card Chapter

**Status:** Accepted (reverses the "no photography" stance of issue #30)
**Date:** 2026-06-13

## Context

THE CARD (the Card Chapter, issue #30) was deliberately built **type-only — "No photography."** The recorded rationale was a *journey rhythm*: the scroll reads **pin → flow → pin** (photo-heavy Hero → type-only Card → photo-heavy Divisions), so the type-only middle acted as a palette-cleanser between two image-led chapters.

We now want THE CARD to be more photo-forward. This contradicts the #30 decision, so it is recorded here rather than silently flipped.

## Decision

Add restrained **full-color** fighter imagery to the ledger **without changing its identity**: it stays a typographic "NAME vs NAME" ledger, rows still read as a list, and the chapter stays **unpinned normal flow**.

- **Form:** a sharp **square, no-radius** head/shoulder crop flanks each corner — `□ NAME vs NAME □` — mirrored, echoing the Hero Face-off at row scale. Matches the Weight Class Card's "no border radius" language.
- **Color:** photos render in **full color.** This does not violate ADR 0008 — that ADR governs the *UI palette* (surfaces, borders, text, accents), not photographic content; the Hero already carries full-color photography and complies. Red remains the only *chrome* accent in the chapter (eyebrow + vs marks).
- **Missing photo / TBA:** every row keeps an identical photo slot. A corner with no photo on file — including a genuinely TBA opponent — renders a neutral **fighter silhouette** in the same square (Mantine `Avatar` `radius={0}` fallback). No empty/blank squares, no per-row layout divergence.
- **No upscaling:** the square is always a *downscale* of the full-body source photo (`object-fit: cover; object-position: top`). Respects the removed-feature landmine (a prior Flip transition was deleted for degrading photo quality on upscale).
- **Entry:** photos ride the existing `ScrollTrigger.batch` row stagger — no new per-photo choreography — to keep the chapter the calm middle of the journey.

## Consequences

- The journey-rhythm rationale is **reframed**: the contrast is no longer photo vs. no-photo, but **scale and pacing** — small inline thumbnails in calm unpinned flow vs. large full-screen *pinned* compositions on either side. The pin → flow → pin shape is the thing being preserved, not the absence of imagery.
- `getNextEventCard` (`convex/events.ts`) must return a **photo ref per corner** (it currently returns names only). `cardLedger.ts`'s `LedgerBout` gains photo fields; the silhouette fallback is a render concern, not a query concern.
- Rejected: full photo-card layout (declined — pushes THE CARD into a third photo chapter and dissolves the contrast entirely); grayscale/duotone photos (declined — user chose full color); per-corner "show whatever exists" fallback (declined — asymmetric rows look lopsided against the centered vs mark).

## Amendment — 2026-06-13

The "full photo-card layout" rejection above has been reversed. Each bout is now a UFC-website-style bordered card (`light-dark` adaptive background) with photo-driven height (~280px) and large rectangular fighter photos (`object-fit: cover; object-position: top`, head/shoulders crop) bleeding to the card edges. Fighter names and country flags occupy a center strip. The journey-rhythm contrast (pin → flow → pin) is now carried entirely by scale and pacing — the Card Chapter's bordered cards are visually quieter than the full-screen pinned compositions flanking it — not by the absence of large imagery.
