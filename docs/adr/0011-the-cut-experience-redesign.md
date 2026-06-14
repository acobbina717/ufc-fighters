# ADR 0011 — "The Cut": Slash-as-Spine Experience Redesign

## Status
**Superseded by [ADR 0012](0012-remove-the-cut-slash-motif.md) (2026-06-14).** The slash-as-spine motif and everything built on it (the teaser/completing slashes, `RankingsIntro`, the divider-grammar echo, and the global Scroll Rail) were removed; the Hero is now photo-only. Sections below are retained as historical record. The **Seating Grade** photo treatment (§5) and the palette/reduced-motion discipline (§7–8) survive the reversal.

_Originally: Accepted — superseded the Hero/slash decisions in PRD #54 and the unbuilt plan in issue #58._

## Context

The Experience Route's narrative was incoherent: the Hero served two stories (event hook in Act 1, a "THE RANKINGS" slash + title in Act 2) and pivoted to rankings *before* THE CARD finished the event story.

Two prior attempts left the codebase mid-pivot and self-contradictory:

- **PRD #54 / issue #58** decided to make the Hero a single pure event hook, *remove the slash from the Hero entirely*, and relocate it to a new standalone `RankingsIntro` divider.
- **Issue #55** (shipped) did the opposite half: it stripped the Hero's title/eyebrow/subtitle but *kept* the slash inside the Hero as a slash-only "Act 2" beat that draws through an empty frame — which points "rankings" right before more event content (THE CARD).

Meanwhile `CONTEXT.md` describes a richer **Face-off** two-headliner VS poster Hero that was never built (the current Hero is a single right-anchored silhouette).

The project's purpose (per `CONTEXT.md`) is Awwwards-level craft for a portfolio/employer audience — distinctiveness is the priority over utility. A design exploration across narrative, visual, and interaction lenses produced three directions ("Fight Poster", "The Cut", "Press Dossier"). **The Cut** was chosen, with one hard constraint added by the project owner about how the slash relates to content.

## Decision

**The red slash (`ufcRed-6` = `#D20A0A`) becomes the structural spine of the entire Experience Route** — one diagonal gesture, drawn at `-6°` (the existing `.slashWrapper` rotation), that recurs as the chapter-divider grammar across the whole route. The slash is promoted from a one-off effect to the route's organizing motif.

### 1. The slash lives in negative space (hard rule)

The cut **only ever travels through empty frame, gutters, and dividers — never across a face, photo, or text block.** Compositions are arranged so the diagonal passes *between* content, not over it. This is non-negotiable and overrides any visual ambition: if a layout would force the slash across content, the layout changes, not the rule.

This explicitly rejects a `clip-path` diagonal that masks/cuts fighter photos along the seam. Fighters occupy their zones; the slash runs through the gap between them.

### 2. Face-off Hero with a negative-space teaser slash

Build `CONTEXT.md`'s **Face-off**: two headliners of the next Event, bottom-anchored in opposite corners with mirrored masks fading toward center, corner-name captions, a central red **VS** on the slash line. Falls back to a single fighter when the opponent is TBA or has no photo.

The Hero plants an **incomplete "teaser" slash** that draws through the empty center gap between the two fighters (born from behind the VS, extending outward). It is deliberately unfinished — a question, not an answer. The eyebrow and a slimmed single-strip Press Pass remain; no title text in the Hero.

### 3. Rankings Intro completes the slash (double-slash motif)

The slash **completes** in a new standalone, normally-flowing `RankingsIntro` chapter inserted between THE CARD and the Weight Class Grid — same x-position/angle as the Hero teaser, drawing to full width, with "THE RANKINGS" resolving on it (`SplitText` chars, masked). Generous vertical padding gives breathing room after the last bout card.

The pivot from event → rankings therefore lives at the Rankings Intro (content logic matches PRD #54: the event finishes in THE CARD), but the slash *spans* the arc: planted in the Hero, harvested at the Intro. This supersedes PRD #54's "remove the slash from the Hero entirely" — the Hero keeps a slash, but reassigned as a *motif seed*, not a rankings label.

### 4. VS glyph Flip hand-off — never a photo Flip

On Hero unpin, the Hero's **VS glyph** (only the glyph) morphs via `Flip` into THE CARD's first bout `.vs` mark. Flipping a single glyph sidesteps the photo-quality graveyard: a prior fullscreen photo Flip was built then removed because upscaling a raster degraded quality (see project memory / `CONTEXT.md`'s aspirational "expand-to-fullscreen" note). **No interaction in this redesign scales a raster photo.**

### 5. Shared "seating grade" for all photography (prerequisite)

A single shared photo treatment is applied identically wherever a fighter photo appears (Hero Face-off, THE CARD Corner Thumbnails, Weight Class Cards), to equalize mismatched UFC source PNGs:

- common contrast/saturation curve,
- bottom-fade `mask-image` into the active base,
- crop contract `object-fit: cover; object-position: top`, **downscale only, never upscale**,
- mirrored neutral-silhouette fallback in an identical slot.

This becomes a shared token/util, not per-module duplication. It is a prerequisite for every other slice — mismatched photos are the single biggest coherence risk.

### 6. Global scroll-progress rail

A thin `ufcRed-6` rail down a page edge, its fill driven by one page-level `ScrollTrigger` scrub, ties all chapters into one authored read. It recedes/auto-hides during pinned cinematic sequences so it never competes with the Floating Dock (ADR 0007) or chapter compositions.

### 7. Palette discipline (unchanged, tightened)

`ufcRed-6` is reserved almost entirely for the cut/slash/VS/Frame Sweep — because the red is now load-bearing structure, it must never appear as a casual highlight (tightens ADR 0008). `gold-5` (`#E0A82E`) appears only as a champion "C" badge. Everything else is the neutral ramp via `light-dark()`. No win/loss hues in the Experience route.

### 8. Reduced motion & light/dark

Under reduced motion both slashes render complete and static, every chapter is a static legible panel, no scrub/parallax/Flip. The cut is scheme-independent; the seating-grade bottom-fade resolves into `#fff` (light) or `#000` (dark), and light mode is art-directed to the same standard (ADR 0006), not treated as a fallback.

## Consequences

- The `#54`-vs-`#55` conflict is resolved: the Hero keeps a slash, but as a motif seed that the Rankings Intro pays off — the arc *earns* the pivot.
- `HeroChapter` is rebuilt from a single silhouette to the two-headliner Face-off; the current slash-only Act 2 (issue #55) is replaced.
- A new `RankingsIntro` component is added and `ExperienceView` order becomes **Hero → THE CARD → Rankings Intro → Weight Class Grid → End State**.
- The slash recurs as divider grammar, so chapter boundaries (e.g. THE CARD tier rules) read as the same cut at different scales — strong, single-gesture art direction.
- Risk concentrated in the Face-off seating grade: if mismatched photos aren't equalized, the composition looks broken regardless of the motion polish. The seating-grade slice is therefore foundational and ships first.

## Alternatives Rejected

- **① Fight Poster / Clean Pivot** (ship PRD #54 verbatim): symmetric VS poster, slash removed from Hero into Rankings Intro. Lowest risk and zero doc churn, but spends the slash on a divider and loses the Hero's most cinematic beat. Rejected for being safe rather than distinctive.
- **③ Press Dossier / Event Spine**: editorial magazine treatment, mono captions, CARD re-ordered to climax at the main event, slash *wipe* into the grid with no standalone divider. Strongest design *system* but least visceral first impression and the most doc churn (retires the Rankings Intro). Rejected for under-delivering the visceral hit a fight hook wants.
- **`clip-path` diagonal through fighter photos** (the original "The Cut" composition): masking each fighter to a wedge with the slash on the seam. Rejected by the project owner because the slash would overlay/cut the actual content; replaced by the negative-space rule (decision 1).
- **Re-pinning THE CARD** for a shared Hero→Card cinematic cut: contradicts the intentional pin → flow → pin rhythm (`CONTEXT.md`). Rejected.
