# UFC Fighter Explorer — Domain Glossary

## Project Purpose
A showcase/portfolio project demonstrating high-quality front-end animation and realtime data integration. Primary audiences: UFC fans and potential employers who appreciate Awwwards-level craft.

## Terms

### Experience Route
The cinematic, full-screen entry point at `/experience/`. No header. Contains the Hero Chapter, Division Toggle, Weight Class Grid, and End State in sequence.

### Hero Chapter
The opening pinned-scroll section of the Experience Route, structured as two acts that share the scroll timeline rather than the frame. Act 1 (initial state): the Face-off — both headliners of the next Event with a "VS" mark — plus the press pass and eyebrow. Act 2: the face-off dissolves while the red slash draws through and the title ("THE RANKINGS") reveals. The act transition is the Parting: each fighter drives toward and past their own edge with fade as the slash draws through the dissolving VS, then the title chars rise. The slash renders behind fighter imagery. On mobile (no pin) and under reduced motion, the acts stack as two normally-scrolled, fully visible sections in the same narrative order: face-off first, then the title section. Next-event data is server-rendered (loaded in the route loader), so "TBA" only ever appears when an opponent is genuinely unannounced — never as a loading state.

### Face-off
The Act 1 composition of the Hero Chapter, arranged in poster symmetry: the two headliners of the next Event bottom-anchored in opposite corners (mirrored masks fading toward center), corner-name captions beneath each, and a central "VS" sitting exactly on the future slash line — Act 2's slash draws through where the VS dissolves. The eyebrow sits top-center; the slimmed Press Pass reflows to a single centered strip near the bottom. Fighters render in full color with a shared seating grade (common contrast curve, bottom fade into the base, consistent edges) to equalize mismatched source photos; the red VS and a gold champion "C" badge are the only accent colors in the frame. Falls back to a single fighter when the opponent is TBA or has no photo.

### Press Pass
The vertical next-event panel on the left rail of the Hero Chapter. Slimmed to event name, date, and venue only — the matchup itself is carried by the Face-off imagery, never repeated as text here.

### Card Chapter
A normally-flowing (unpinned) chapter following the Hero Chapter ("THE CARD") that reveals the remaining Bouts of the next Event as a typographic fight-poster ledger — "NAME vs NAME" rows with weight class, grouped under Card Tier dividers, staggered in as they enter the viewport. No photography; robust to missing photos and contrasts with the photo-led Hero. Deliberately unpinned so the scroll journey reads pin → flow → pin (Hero → Card → Divisions), keeping the card skippable at the user's own pace and absorbing variable bout counts.

### Division Toggle
The Men's / Women's switcher that sits between the Hero Chapter and the Weight Class Grid in the Experience Route.

### Weight Class Grid
The bento grid of clickable division cards below the Division Toggle. Men's layout: Heavyweight (left, tall) and Lt. Heavyweight (right, tall) flank a center column of six divisions. Women's layout: Bantamweight (left, tall) and Featherweight (right, tall) flank a center column with Strawweight and Flyweight stacked. The flanking sentinel cells are fixed editorial picks, not data-driven.

### Weight Class Card
A single clickable card in the Weight Class Grid. Mantine Card with no border radius, full-bleed champion photo, and a bottom-left label showing the division name and weight range (e.g. "206 – 265 LBS"). Clicking triggers a GSAP Flip expand-to-fullscreen transition before navigating to the Division Route. On hover, displays the Frame Sweep effect.

### Division Toggle
The Men's / Women's switcher integrated as a section header directly above the Weight Class Grid. Toggling between genders swaps the full grid with a staggered animation.

### Frame Sweep
The hover effect on a Weight Class Card. A red (#D20A0A) stroke segment travels around the card's rectangular SVG `<rect>` outline as one composed GSAP timeline: the segment grows in, sweeps the full perimeter, a light sheen fires as the segment crosses center, then both fade on leave. The rectangular geometry makes the perimeter deterministic — no arc math or getTotalLength() required.

### Division Route
The per-division page at `/divisions/$gender/$weightClass`. Full-screen, no header, black background. Presents fighter beats in a GSAP-scrubbed pinned scroll.

### Fighter Beat
A single fighter entry in the Division Route timeline. The champion gets 2.0 scroll units; contenders get 1.0 each. Fighters fade in/out with directional x-movement during scrub.

### Fighter Spotlight
The visual component for a Fighter Beat. Shows: fighter photo (side determined by gender), ranking badge, name, weight, country, W-L record, and four stat rings.

### Stat Ring
A CSS conic-gradient ring (not SVG) representing one of four fighter stats: Striking Output (SLpM), Striking Accuracy (%), Takedown Avg, Submission Avg.

### App Routes
The utilitarian routes — Home (fighters list), Fighters, and Matchup pages — as opposed to the cinematic Experience and Division routes. Navigation is provided by the Floating Dock, not a header bar.

### Floating Dock
The single site-wide navigation element: a compact, collapsible floating pill present on every route (Experience, Fighters, Matchup, color-scheme toggle). Replaces the retired Header. Recedes/auto-hides during scroll-driven cinematic sequences so it never competes with chapter compositions.

### Event
A scheduled UFC event stored in the `events` table. Fields: name (e.g. "UFC 314"), date (Unix timestamp), venue, location, lastSynced. Indexed by date. Past events are kept indefinitely to power fight history. Scraped from `ufc.com/events` via a daily Convex cron — server-side, not client-triggered. All upcoming events (typically 2–4 months out) are stored, not just the next one.

### Bout
A single scheduled fight within an Event, stored in the `bouts` table. References `fighterAId` (always the known fighter) and optionally `fighterBId` (absent = TBA until opponent announced). Fields: eventId, weightClass, cardTier (main / prelim / early_prelim), boutOrder (1 = main event). Indexed by eventId, fighterAId, and fighterBId. Enables "NEXT FIGHT" badges and fight history per fighter without scanning all events.

### Card Tier
The broadcast tier of a Bout within an Event: `main` (PPV main card), `prelim` (ESPN prelims), or `early_prelim` (UFC Fight Pass). Determines display hierarchy on event cards.

### Fighter Activity
A fighter is considered active if they appear in the UFC rankings OR on an upcoming fight card. Activity is enforced structurally by the scraping strategy — we only store fighters with a live reason to be active. There is no stored `isActive` flag; presence in the database implies activity at last sync.

### Page Shell
The shared layout wrapper for App Routes, defining the only sanctioned container widths (content / wide / full), the type scale, and the vertical rhythm (section spacing in fixed steps of the theme spacing scale). App pages compose inside it rather than defining their own max-widths.

### Planned Features
Fighter Search, Head-to-Head Comparison, Stats Deep-Dive, Fight History, Mobile Improvements. Project is personal but intended to grow in robustness over time.
