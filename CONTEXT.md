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
The grid of clickable division cards below the Division Toggle. Each card shows the champion's photo with a custom clip-path shape and the division name.

### Weight Class Card
A single clickable card in the Weight Class Grid. Left/right variants alternate. Clicking triggers a GSAP expand-to-fullscreen transition before navigating to the Division Route.

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

### Planned Features
Fighter Search, Head-to-Head Comparison, Stats Deep-Dive, Fight History, Mobile Improvements. Project is personal but intended to grow in robustness over time.
