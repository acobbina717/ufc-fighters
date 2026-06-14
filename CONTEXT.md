# UFC Fighter Explorer — Domain Glossary

## Project Purpose
A showcase/portfolio project demonstrating high-quality front-end animation and realtime data integration. Primary audiences: UFC fans and potential employers who appreciate Awwwards-level craft.

## Terms

### Experience Route
The cinematic, full-screen entry point at `/experience/`. No header. Narrative arc: **event first, rankings as depth** — Hero Chapter → Card Chapter → Rankings Intro → Weight Class Grid → End State. The Hero hooks with the headline fight; THE CARD fleshes out the full event; the Rankings Intro declares the transition into rankings territory; the Weight Class Grid delivers the rankings themselves. The route's organizing motif is The Cut (see below) — the red slash threaded through the whole arc. See ADR 0011.

### The Cut
The route-wide design motif (ADR 0011): a single red (`ufcRed-6`) diagonal at `-6°` that recurs as the chapter-divider grammar across the entire Experience — planted as a teaser in the Hero, completed at the Rankings Intro, and echoed at chapter boundaries (e.g. THE CARD tier rules) as the same cut at different scales. **Hard rule: the slash lives in negative space — it only ever travels through empty frame, gutters, and dividers, never across a face, photo, or text block.** Compositions are arranged so the cut passes between content, not over it.

### Hero Chapter
The opening pinned-scroll section of the Experience Route. The upcoming-event hook: the Face-off composition + the slimmed Press Pass. It carries a single **teaser slash** — an incomplete cut that draws through the empty center gap between the two headliners (never over them), planting The Cut motif that the Rankings Intro later completes. No title text in the Hero. On Hero unpin, the central VS glyph Flips into THE CARD's first bout `vs` mark (glyph only — never a scaled photo). Next-event data is server-rendered (loaded in the route loader), so "TBA" only ever appears when an opponent is genuinely unannounced — never as a loading state.

### Rankings Intro
A standalone normally-flowing section between the Card Chapter and the Weight Class Grid. The slash **completes** here — same x-position and angle as the Hero teaser, drawing to full width — with the "THE RANKINGS" title resolving on it (SplitText chars, masked). This is the moment the page pivots from event content to rankings content; the slash is the pivot's gesture, paid off after being planted in the Hero. Deliberately generous padding creates breathing room after the last bout card before the bento grid opens.

### Face-off
The composition of the Hero Chapter, arranged in poster symmetry: the two headliners of the next Event bottom-anchored in opposite corners (mirrored masks fading toward center), corner-name captions beneath each, and a central "VS" on the slash line. The teaser slash draws through the empty center gap between the two fighters — never across a face or photo (the negative-space rule of The Cut). The eyebrow sits top-center; the slimmed Press Pass reflows to a single centered strip near the bottom. Fighters render in full color with the shared Seating Grade to equalize mismatched source photos; the red VS and a gold champion "C" badge are the only accent colors in the frame. Falls back to a single fighter when the opponent is TBA or has no photo.

### Seating Grade
The single shared photo treatment applied identically wherever a fighter photo appears (Hero Face-off, Corner Thumbnails, Weight Class Cards), so mismatched UFC source PNGs read as one shoot: a common contrast/saturation curve, a bottom-fade `mask-image` into the active base, the crop contract `object-fit: cover; object-position: top` (**downscale only, never upscale**), and a mirrored neutral-silhouette fallback in an identical slot. Lives as a shared token/util, not duplicated per module. Prerequisite for the Experience redesign — see ADR 0011.

### Scroll Rail
A thin `ufcRed-6` progress rail down a page edge of the Experience Route, its fill driven by one page-level scrubbed `ScrollTrigger`, tying all chapters into one authored read. Recedes/auto-hides during pinned cinematic sequences so it never competes with the Floating Dock or chapter compositions.

### Press Pass
The vertical next-event panel on the left rail of the Hero Chapter. Slimmed to event name, date, and venue only — the matchup itself is carried by the Face-off imagery, never repeated as text here.

### Card Chapter
A normally-flowing (unpinned) chapter following the Hero Chapter ("THE CARD") that reveals the remaining Bouts of the next Event as a fight-poster ledger, grouped under Card Tier dividers, staggered in as they enter the viewport. Deliberately unpinned so the scroll journey reads pin → flow → pin (Hero → Card → Divisions).

**Desktop layout (≥ md breakpoint):** Each bout is a UFC-website-style bordered card (`light-dark` adaptive background, `border-radius: md`, box-shadow) with a centered weight-class label strip at the top and a photo-driven matchup area below (~280px tall). Large rectangular fighter photos (`width: clamp(130px, 15vw, 200px)`, `object-fit: cover; object-position: top`, head/shoulders crop) bleed to the card's top and bottom edges. Fighter names and Country Flag rows occupy a `nameCol` strip between the photo and the VS mark — left corner names are right-aligned (pushing toward center), right corner names are left-aligned.

**Mobile layout (< md breakpoint):** The card border and background wrap a three-column grid — photos anchored on the extreme sides, fighter names and Country Flag rows stacked vertically in the center column (`FIGHTER A / vs / FIGHTER B`). Photos are `clamp(80px, 18vw, 130px)` wide on mobile. Photos remain visible; the center column is the primary read.

### Corner Thumbnail
The per-corner fighter image in a Card Chapter row: a sharp **square, no-radius** head/shoulder crop in **full color**, flanking each side of the matchup (mirrored, echoing the Hero Face-off at row scale). Always a downscale of the full-body source photo — never upscaled. A corner with no photo on file — including a genuinely TBA opponent — shows a neutral fighter silhouette in the same square, so every row keeps an identical photo slot. Rendered with Mantine `Avatar` (`radius={0}`); its silhouette fallback is the missing-photo state. No background backstop or border on the thumbnail container — the transparent PNG sits directly against the chapter background, which follows the active color scheme. Full color here does not break ADR 0008 (which governs UI palette, not photographic content).

### Country Flag Row
The per-corner metadata line that sits directly below the Corner Thumbnail in a Card Chapter row. Renders as a Unicode flag emoji followed by the fighter's full country name in uppercase (e.g. `🇬🇪 GEORGIA`). Absent — no placeholder — when the fighter has no country on record or the corner is TBA. Country data comes from the `country` field on the `fighters` table, joined in `getNextEventCard`.

### Division Toggle
The Men's / Women's switcher that sits between the Hero Chapter and the Weight Class Grid in the Experience Route.

### Weight Class Grid
The bento grid of clickable division cards below the Division Toggle. Men's layout: Heavyweight (left, tall) and Lt. Heavyweight (right, tall) flank a center column of six divisions. Women's layout: three active divisions — Strawweight, Flyweight, Bantamweight. Women's Featherweight is omitted because the UFC has no active ranked division for it. The women's bento layout uses Bantamweight as the single left sentinel with Strawweight and Flyweight stacked in the remaining space. The flanking sentinel cells are fixed editorial picks, not data-driven.

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
The single site-wide navigation element: a compact, collapsible floating pill anchored to the **top-right** of every route. **Starts collapsed** (sessionStorage remembers the last open/closed state across page transitions). In collapsed state only two controls are visible: the color-scheme toggle (leftmost) and the hamburger icon (rightmost). On expand, the pill grows leftward — the color-scheme toggle moves left as nav links stagger in via GSAP — revealing `[ ☀️/🌙 ] [ 🏠 ] Fighters  Matchup  —  [ ✕ ]`. The hamburger is replaced by ✕ when open; never both visible. The Experience link renders as a Lucide `Home` icon (no label). Recedes/auto-hides during scroll-driven cinematic sequences so it never competes with chapter compositions.

### Event
A scheduled UFC event stored in the `events` table. Fields: name, date (Unix ms), venue, location, slug, lastSynced, fightersScrapedAt (optional). Past events are kept indefinitely to power fight history and matchup analysis. Scraped from `ufc.com/events` via a daily Convex cron. `fightersScrapedAt` is stamped when post-event fighter scraping completes for that event, enabling retry semantics.

### Bout
A single scheduled fight within an Event, stored in the `bouts` table. References `fighterAId` (always the known fighter) and optionally `fighterBId` (absent = TBA until opponent announced). Fields: eventId, weightClass, cardTier (main / prelim / early_prelim), boutOrder (1 = main event). Indexed by eventId, fighterAId, and fighterBId. Used for upcoming fights (NEXT FIGHT badges) and retained indefinitely for past fight history and matchup analysis.

### Card Tier
The broadcast tier of a Bout within an Event: `main` (PPV main card), `prelim` (ESPN prelims), or `early_prelim` (UFC Fight Pass). Determines display hierarchy on event cards.

### Fighter Activity
Fighter data is refreshed server-side by a Convex cron, triggered approximately 24 hours after each event using the weight classes present in that event's bouts. Rankings and stats only change meaningfully after fights occur, so post-event scraping is the single source of truth — no client-triggered scraping. A fighter is pruned from the database only when all three conditions are met: absent from current rankings, no upcoming bouts, and no past bouts. Fighters with fight history are retained even if unranked, because past bouts are used for matchup analysis.

### Page Shell
The shared layout wrapper for App Routes, defining the only sanctioned container widths (content / wide / full), the type scale, and the vertical rhythm (section spacing in fixed steps of the theme spacing scale). App pages compose inside it rather than defining their own max-widths.

### Planned Features
Fighter Search, Head-to-Head Comparison, Stats Deep-Dive, Fight History, Mobile Improvements. Project is personal but intended to grow in robustness over time.
