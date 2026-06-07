# Production Debugging Log

## Symptoms

Observed on [ufc-fighters.vercel.app](https://ufc-fighters.vercel.app) but **not reproducible in local development**.

- Sections appear completely black while scrolling
- Fighter photos appear cropped or cut off mid-section
- Left-side navigation flashes in and out or disappears entirely
- Division names render as partial text (e.g. "AT", "FLv...", "RETR...") as if mid-animation
- After fast scrolling, content renders incorrectly for 1–2 seconds then snaps into place
- Scrolling away and back to a broken position causes it to render correctly on return
- Behavior correlates with time on page (worse after ~3–5 minutes)

Console logs observed in production:

```
WebSocket closed with code 1006
Attempting reconnect in 1385ms
WebSocket reconnected at t=201.2s after disconnect due to closed with code 1006
WebSocket closed with code 1006
Attempting reconnect in 1471ms
WebSocket reconnected at t=274.1s after disconnect due to closed with code 1006
```

---

## Environment

| | Dev | Production |
|---|---|---|
| Symptoms | Not observed | Consistently reproducible |
| WebSocket reconnects | Rare | Every ~60–200s (Vercel edge timeout) |
| Image latency | Near-zero (localhost) | CDN, real network |
| Scroll speed tested | Slow/controlled | Fast, continuous |

---

## Assumptions Investigated

None of the following have been confirmed as the definitive root cause. They are hypotheses that informed the fixes applied.

### Assumption 1 — Convex WebSocket reconnects cause `useQuery` to return `undefined`

**Hypothesis:** When the Convex WebSocket drops (code 1006 — Vercel edge proxy timeout) and reconnects, all `useQuery` hooks briefly return `undefined`. This could cause a cascade:

```
useQuery → undefined
  → allLoaded = false
  → beats = []
  → useGSAP cleanup fires (beats.length dependency changes)
  → ScrollTrigger.kill()
  → All spotlights stuck at opacity: 0
  → Black screen
```

The `onScrollReady` was also being called immediately after ScrollTrigger creation with a pre-refresh start value of `0`, potentially causing the nav to flash visible since `scrollY >= 0` is always true.

**Fixes applied:**

- Created `src/hooks/useStableQuery.ts` — wraps `useQuery` with a `useRef` cache that returns the last-known-good value when the live result is `undefined`
- Migrated all Convex `useQuery` calls in `DivisionsChapter`, `HeroChapter`, and `DivisionPanel` to use `useStableQuery`
- Replaced `beats.length` as the `useGSAP` dependency with a structural fingerprint (`${fighter._id}:${rank}` joined string) so the timeline only rebuilds on actual data changes, not reference identity shifts
- Removed the premature `onScrollReady` call outside `onRefresh`; the `onRefresh` callback now fires with the real start position
- Added guard in `ExperienceView` to reject `start` values of `0` before setting `mensScrollStart`/`womensScrollStart`
- Moved `syncedKeys` in `useStaleSync` from a per-instance `useRef` to a module-level `Set` to prevent duplicate scrape actions on component remount

**Result:** WebSocket reconnect handling is hardened. Whether this was causing the visual symptoms in production is **unconfirmed** — the symptoms continued after these changes.

---

### Assumption 2 — `scrub: 1.5` lag causes intermediate animation states on fast scroll

**Hypothesis:** The total scroll budget is roughly 5,000vh across Hero + Men's + Women's chapters. With `scrub: 1.5`, GSAP's internal tween takes 1.5 seconds to catch up to the scroll position. When the user scrolls fast:

1. The browser's compositor thread advances the scroll position instantly (off main thread)
2. GSAP's ScrollTrigger runs on the main thread via `requestAnimationFrame`, lagging behind
3. Spotlights are left mid-animation: `x: 30` instead of `x: 0`, cutting photos off at the `overflow: hidden` chapter boundary
4. After 1.5s, the scrub catches up and renders correctly — explaining "loads fully after some time away"
5. Scrolling back forces a new scrub target, which re-renders the element

This would explain why the bug doesn't appear in development (slower, more careful scrolling; images pre-cached; no real CDN latency).

**Fixes applied:**

- `scrub: 1.5` → `scrub: 0.8` in both `DivisionsChapter` and `HeroChapter` — reduces catch-up window by nearly half
- Added `fastScrollEnd: true` to both ScrollTrigger configs — when GSAP detects fast scrolling has stopped, it instantly completes the scrub tween rather than interpolating over 0.8s

**Result:** **Unconfirmed.** Whether these changes resolved the production symptoms has not yet been verified.

---

### Assumption 3 — `ScrollTrigger.refresh()` called at the wrong time

**Hypothesis:** A `useEffect` in `DivisionsChapter` calls `ScrollTrigger.refresh()` inside a `requestAnimationFrame` whenever `allLoaded` changes. If this fires while the user is mid-scroll, it recalculates all trigger positions and could reset the scrub, causing a momentary black frame.

**Fix applied:**

- Moved scrub-snap logic from immediately after timeline creation (where `progress` is unreliably `0`) into the `onRefresh` callback, which fires after ScrollTrigger has computed real layout values. Uses a `needsScrubSnap` one-shot flag.

**Result:** **Unconfirmed.** Timing improvement only; whether this was causing visible glitches is unknown.

---

## What Has NOT Been Ruled Out

- A browser-specific rendering issue (Safari vs Chrome; macOS vs iOS)
- Image loading latency causing a layout reflow that invalidates ScrollTrigger positions mid-scroll
- The `contain: layout style` on `FighterSpotlight.root` interacting unexpectedly with the GSAP `x` transform and `overflow: hidden` on the chapter
- A race condition in the `useGSAP` + `gsap.matchMedia()` lifecycle when both Men's and Women's chapters initialize simultaneously
- An issue specific to the `@tanstack/react-start` / `nitro` SSR/hydration layer affecting GSAP initialization timing

---

## Logging Plan

To find the actual culprit, production logging should be added before the next round of debugging.

### Useful data points to capture

| What to log | Where | Why |
|---|---|---|
| When `allLoaded` flips `false` after initial load | `DivisionsChapter` | Confirm whether WebSocket reconnects actually trigger a data gap after `useStableQuery` fix |
| `ScrollTrigger.refresh()` call timestamps | `DivisionsChapter` `useEffect` | Determine if refresh is firing mid-scroll |
| `onRefresh` start values (first call vs subsequent) | `DivisionsChapter` `onRefresh` | Detect if pre-refresh `0` value is still leaking through |
| GSAP timeline cleanup/rebuild events | `useGSAP` cleanup function | Confirm whether timeline is being torn down in production |
| `scrub` tween progress at the moment fast scroll stops | `onRefresh` or `onUpdate` | Measure how far behind the timeline is in real usage |
| Image load errors / slow loads | `FighterSpotlight` `<img>` | Rule out image latency causing reflows |

### Suggested approach

Add a lightweight `debugLog` utility gated behind a flag (e.g. `?debug=1` query param or a `VITE_DEBUG` env var) so logs only appear when needed and don't pollute production:

```typescript
const DEBUG = new URLSearchParams(window.location.search).has('debug')
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log('[scroll-debug]', ...args)
}
```

This avoids shipping `console.log` calls to all users while still letting you inspect production behavior by adding `?debug=1` to the URL.

---

## Commits

| Commit | Description |
|---|---|
| `897924c` | fix: prevent scroll animation teardown on WebSocket reconnect |
| `46213ce` | fix: migrate remaining useQuery calls to useStableQuery, fix scrub-snap timing |
| `a1e0d56` | fix: reduce scrub lag and add fastScrollEnd for fast-scroll resilience |
