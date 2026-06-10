# ADR 0001 — SVG stroke for animated clip-path border

**Status:** Superseded by [ADR 0003](0003-frame-sweep-hover-effect.md)

## Context

Weight Class Cards use a custom SVG `clipPath` to create shaped cards. A spinning gradient border is required on hover as a premium effect. CSS `border` and `outline` are clipped by `clip-path` and cannot follow the custom shape edge.

## Decision

Draw a `<path>` with the same coordinates as the clip-path directly inside each card's existing `<svg>` element and animate its stroke with GSAP. The gradient stops are defined via a CSS custom property (`--border-gradient-stops`) so the color scheme can be changed in one place without touching the animation logic.

Initial color scheme: monochrome shimmer (white → gray → white). Chosen over red/white or gold to avoid competing with the red accent already present in card content.

## Consequences

- The SVG `<path>` must stay in sync with the clip-path coordinates — a single source of truth constant handles both.
- GSAP animates the stroke rather than a CSS `@property` spin, keeping animation on the GSAP timeline for scrub compatibility.
- Swapping to a red or gold gradient requires only a token change, not a component rewrite.
