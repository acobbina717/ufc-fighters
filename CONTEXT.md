# UFC Fighter Explorer — Domain Glossary

## Project Purpose
A showcase/portfolio project demonstrating high-quality front-end animation and realtime data integration. Primary audiences: UFC fans and potential employers who appreciate Awwwards-level craft.

## Terms

### Experience Route
The cinematic, full-screen entry point at `/experience/`. No header. Contains the Hero Chapter, Division Toggle, Weight Class Grid, and End State in sequence.

### Hero Chapter
The opening pinned-scroll section of the Experience Route. Animates a red slash, title ("THE RANKINGS"), eyebrow text, and a featured fighter silhouette. Pins for 200vh of scroll on desktop.

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
Standard routes under `/_app/` that include the site Header: Home (fighters list), Fighters, and Matchup pages.

### Event
A scheduled UFC event stored in the `events` table. Fields: name (e.g. "UFC 314"), date (Unix timestamp), venue, location, lastSynced. Indexed by date. Past events are kept indefinitely to power fight history. Scraped from `ufc.com/events` via a daily Convex cron — server-side, not client-triggered. All upcoming events (typically 2–4 months out) are stored, not just the next one.

### Bout
A single scheduled fight within an Event, stored in the `bouts` table. References `fighterAId` (always the known fighter) and optionally `fighterBId` (absent = TBA until opponent announced). Fields: eventId, weightClass, cardTier (main / prelim / early_prelim), boutOrder (1 = main event). Indexed by eventId, fighterAId, and fighterBId. Enables "NEXT FIGHT" badges and fight history per fighter without scanning all events.

### Card Tier
The broadcast tier of a Bout within an Event: `main` (PPV main card), `prelim` (ESPN prelims), or `early_prelim` (UFC Fight Pass). Determines display hierarchy on event cards.

### Fighter Activity
A fighter is considered active if they appear in the UFC rankings OR on an upcoming fight card. Activity is enforced structurally by the scraping strategy — we only store fighters with a live reason to be active. There is no stored `isActive` flag; presence in the database implies activity at last sync.

### Planned Features
Fighter Search, Head-to-Head Comparison, Stats Deep-Dive, Fight History, Mobile Improvements. Project is personal but intended to grow in robustness over time.
