# ADR 0012 — Remove "The Cut" slash motif

## Status
Accepted (2026-06-14) — supersedes [ADR 0011](0011-the-cut-experience-redesign.md).

## Context

ADR 0011 made a red `-6°` slash (`ufcRed-6`) the structural spine of the Experience Route: a teaser slash in the Hero, a completing slash in a new `RankingsIntro` chapter, a hairline "echo" of the slash as THE CARD's tier-divider grammar, and a global red Scroll Rail as the route's progress spine.

Wave 1 of that build shipped (issues #59–#65). On review, the slash motif was judged not worth the implementation and maintenance cost it was generating — geometry-matching across chapters, the negative-space hard rule, per-component slash tuning — for the value it returned. The project owner decided to remove it entirely rather than continue investing in it.

## Decision

**Remove every trace of the slash motif from the Experience Route.** Specifically:

1. **No slash anywhere.** The Hero's teaser slash and the `RankingsIntro` completing slash are deleted. The Hero is now **photo-only**: the featured fighter holds the frame while the scroll chrome (press pass + scroll hint) fades on pinned scroll.
2. **`RankingsIntro` chapter removed.** Its only purpose was the slash completing; the route order returns to **Hero → THE CARD → Weight Class Grid → End State**. The event → rankings pivot is carried by chapter order alone, as in PRD #54.
3. **Divider grammar reverted.** THE CARD's tier rules return to a neutral hairline (no `-6°` red echo).
4. **Global Scroll Rail removed.** The red progress spine was part of the same motif and is deleted.
5. **No teaser/completing slash in the not-yet-built Face-off Hero (#60).** #60 proceeds as a photo-composition Face-off only.

### What survives

These were independent of the slash and are kept:

- **Seating Grade** photo treatment (ADR 0011 §5, issue #59) — the shared contrast/saturation + bottom-fade util consumed by Hero, Corner Thumbnails, and Weight Class Cards. Still the foundation for coherent photography.
- **Palette discipline** (ADR 0011 §7): `ufcRed-6` stays the reserved accent (press-pass label, dot, scroll line); `gold-5` champion-only.
- **Reduced-motion & light/dark** discipline (ADR 0011 §8).
- The `@mixin` → raw `@media` bugfix (#65) and the WeightClassGrid breakpoint fix.

## Consequences

- Issues **#61** (RankingsIntro), **#63** (Scroll Rail), and **#64** (divider grammar) are closed as won't-do; their shipped code is reverted.
- Issue **#60** (Face-off Hero) loses its teaser-slash requirement and becomes a photo-only composition.
- Issue **#62** (VS glyph Flip hand-off) is unaffected — the VS glyph is the matchup mark, not the slash.
- The Hero's desktop pin (`+=200%`) is now disproportionate to its single chrome-fade beat; #60 rebuilds that timeline, so the pin is left as-is until then.
- `CONTEXT.md` glossary entries for The Cut, Rankings Intro, and Scroll Rail are removed; Face-off and Hero Chapter entries drop their slash language.

## Alternatives Rejected

- **Keep the slash only in the Hero** (revert to the issue #55 slash-only Act 2): rejected — leaves the motif half-present and re-opens the #54-vs-#55 incoherence ADR 0011 was written to resolve. Clean removal is simpler.
- **Keep the Scroll Rail as a standalone progress indicator** (decoupled from the slash): rejected for now — it was conceived as part of the motif and adds a moving element the owner didn't want; can be reconsidered independently later.
