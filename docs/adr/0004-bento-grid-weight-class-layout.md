# ADR 0004 — Bento grid layout for Weight Class Grid

**Status:** Accepted  
**Supersedes:** clip-path alternating card layout (see ADR 0001, ADR 0003)

## Context

The Weight Class Grid previously used alternating left/right cards with custom SVG `clipPath` geometry and an arc-cornered shape. Three problems drove the replacement:

1. The clip-path arc geometry caused the Frame Sweep stroke animation to fail at corners — the arc path math was complex and the segment did not travel smoothly through the curved corner.
2. The alternating left/right layout treated all 13 divisions identically, with no visual hierarchy between prestige divisions and the rest.
3. The clip-path shapes felt arbitrary rather than intentional — the geometry existed to be different, not to serve the content.

## Decision

Replace the alternating clip-path grid with a **bento grid** using Mantine `Card` components (`radius={0}`) and full-bleed champion photos.

### Men's layout (8 divisions)

Heavyweight (left, tall) and Lt. Heavyweight (right, tall) flank a center column containing the remaining six divisions. The center column stacks: Middleweight + Welterweight side by side, Lightweight full-width, then Featherweight + Bantamweight + Flyweight across the bottom. Order is descending by weight.

```
┌──────────┬──────────────┬──────────────┬──────────┐
│          │  MIDDLEWGT   │  WELTERWGT   │          │
│          ├──────────────┴──────────────┤          │
│ HEAVY-   │                             │  LT.     │
│ WEIGHT   │        LIGHTWEIGHT          │  HEAVY-  │
│          │                             │  WEIGHT  │
│          ├──────────┬────────┬─────────┤          │
│          │FEATHER-  │BANTAM- │FLY-     │          │
└──────────┴──────────┴────────┴─────────┴──────────┘
```

### Women's layout (4 divisions)

Bantamweight (left, tall) and Featherweight (right, tall) flank a center column with Strawweight and Flyweight stacked.

```
┌──────────┬──────────────┬──────────┐
│          │  STRAWWEIGHT │          │
│ BANTAM-  ├──────────────┤ FEATHER- │
│ WEIGHT   │  FLYWEIGHT   │ WEIGHT   │
└──────────┴──────────────┴──────────┘
```

### Card details

- **Base**: Mantine `Card`, `radius={0}`, full-bleed champion photo
- **Label**: bottom-left overlay on a dark gradient — division name + weight range (e.g. "206 – 265 LBS")
- **Frame Sweep**: SVG `<rect>` overlay. Perimeter is deterministic (`2 × (w + h)`), no arc geometry. Sweep + sheen run as one composed GSAP timeline — segment grows in, sweeps the perimeter, sheen fires as segment crosses center, both fade on leave.
- **Scroll entry**: flanking sentinel cells (HW/LHW for men's, BW/FW for women's) animate in from left/right first; center column fills in after.
- **Click**: GSAP Flip expand-to-fullscreen replacing the previous DOM clone hack.
- **Division Toggle**: integrated as a section header directly above the grid (not a separate floating section).

## Consequences

- ADR 0001 and ADR 0003 are fully superseded — `WEIGHT_CLASS_CARD_OUTLINE_PATHS`, `WEIGHT_CLASS_CARD_PATHS`, `WeightClassFrame`, and all clip-path infrastructure can be deleted.
- The Frame Sweep animation becomes trivially simple: a `<rect>` with `pathLength` or explicit perimeter math. No `getTotalLength()`, no objectBoundingBox coordinates.
- `weightClasses.ts` needs a `weightFloor` field added to each division so cards can display the full range (e.g. "206 – 265 LBS") rather than just the upper bound.
- The bento layout is hardcoded — the flanking sentinels are an editorial call, not data-driven. Changing which divisions get the large treatment requires a layout change, not a data change.
