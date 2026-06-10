# ADR 0003 — Frame Sweep hover effect on Weight Class Cards

**Status:** Superseded by [ADR 0004](0004-bento-grid-weight-class-layout.md)  
**Supersedes:** [ADR 0001](0001-svg-stroke-for-clippath-border.md)

## Context

ADR 0001 established a 2px animated SVG stroke with a spinning monochrome `linearGradient` as the hover border effect on Weight Class Cards. In practice this read as too thin and decorative — the effect was barely perceptible against the structural 8px frame and the monochrome shimmer competed poorly with the card content.

The desired effect is a **Frame Sweep**: a red stroke segment that visibly travels around the full clip-path outline — including the curved corner — continuously while the card is hovered. The effect must live entirely on the frame stroke; no interior overlay, no change to the champion photo layer.

## Decision

- **Stroke width**: 8px, matching the structural `outlinePath` exactly. The sweep sits flush over the frame line so the frame itself appears to conduct the color.
- **Color**: solid `#D20A0A` (UFC red). No gradient — the motion of the segment is the visual, not a color transition.
- **Animation**: `stroke-dasharray: "0.3 0.7"` (30% visible segment) + `strokeDashoffset` animating from `0` to `-1`, `repeat: -1`, `ease: "none"`, duration ~3s. Creates a continuous slow loop around the full path.
- **Trigger**: existing `onMouseEnter` / `onMouseLeave` handlers on the `.linkLayer` element. `useHover` is not used — the hover state is local to the animation callbacks and does not need to be shared.
- **On leave**: kill the GSAP tween, fade `opacity` to `0` over 0.35s.
- **Removed**: `linearGradient` SVG element, `borderGradientRef`, `borderStopRefs`, `parseBorderGradientStops`, `--border-gradient-stops` CSS custom property, and the spinning `gradientTransform` animation from ADR 0001.

## Consequences

- The `borderPath` and `outlinePath` remain the single shared source-of-truth path coordinates (`WEIGHT_CLASS_CARD_OUTLINE_PATHS`).
- `pathLength={1}` normalization means dasharray/dashoffset values are resolution-independent fractions.
- The sheen (`sheenRef`) animation is unaffected — it operates on a separate layer.
- Swapping the segment color or speed requires only changing the `stroke` attribute value or `duration` in one place.
