# UFC Fighter Rankings

> A cinematic, scroll-driven web app for exploring UFC fighter data across all weight classes — browse rankings, compare fighters, or enter a fully animated narrative experience driven by GSAP and live Convex data.

---

## Why This Exists

The UFC publishes fighter rankings across 13 divisions, but consuming that data as a flat list misses the storytelling opportunity. This app turns the rankings into three experiences: a browsable database, a head-to-head comparison tool, and a scroll-driven cinematic journey through 12 of those divisions — champion first, contenders in sequence, men's then women's.

---

## Quick Start

After completing the [Prerequisites](#prerequisites) and [Environment Setup](#environment-setup) sections below, run:

```bash
# Terminal 1 — Convex backend
npx convex dev

# Terminal 2 — Vite frontend
yarn dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

---

## Prerequisites

Before you start, make sure you have the following installed and configured:

- **Node.js** 20 or later
- **Yarn** 1.22 or later (`npm install -g yarn`)
- A free [Convex account](https://convex.dev) — the database backend runs on Convex

Verify your versions:

```bash
node --version   # should print v20.x.x or later
yarn --version   # should print 1.22.x or later
```

---

## Installation

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd ufc-fighters
yarn install
```

---

## Environment Setup

The app needs two environment variables to connect to your Convex deployment. Create a `.env.local` file at the project root:

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOYMENT=<your-deployment-name>
```

**To get these values automatically**, run:

```bash
npx convex init
```

This command creates a new Convex deployment linked to your account and writes both variables to `.env.local` for you.

> **If you see a Convex connection error on startup**, confirm `.env.local` exists and both variables are populated. The frontend will not load data without a running Convex backend.

---

## Running the App

The app requires two processes running simultaneously — the Convex backend and the Vite frontend.

**Terminal 1 — start the Convex backend:**

```bash
npx convex dev
```

This starts the Convex dev server, pushes your schema and functions, and opens a live sync connection. Keep it running throughout development.

**Terminal 2 — start the Vite frontend:**

```bash
yarn dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Routes

| Route | What you'll find |
|---|---|
| `/` | Cinematic, scroll-driven narrative through all 12 divisions — no header, full-screen |
| `/fighters` | Browsable fighter rankings — searchable by division, sortable by record |
| `/matchup` | Head-to-head fighter comparison tool |

`/` renders without the global header — it is a full-screen immersive environment with its own navigation system. The `/_app` pathless layout applies the header only to `/fighters` and `/matchup`.

---

## The Experience (Home Route)

`/` is a scroll-driven narrative built with GSAP ScrollTrigger and live Convex data. It is structured as three chapters plus a closing end state:

**Chapter 01 — Hero**
A full-viewport pinned section (~200vh of scroll). The red slash, title, and subtitle reveal in sequence as you scroll down. On mobile, the entrance animation plays on load instead.

**Chapter 02 — Men's Divisions**
Eight weight classes (flyweight through heavyweight), each with a ~8-scroll-length beat sequence: a SplitText division name crash-in, a 2× champion spotlight, and five 1× contender spotlights. Pinned on desktop, a stacked card feed on mobile.

**Chapter 03 — Women's Divisions**
The same beat structure as Chapter 02, with the fighter photo mirrored to the left side. Four divisions (strawweight, flyweight, bantamweight, featherweight).

**End State**
A static section with links to `/fighters` and `/matchup`.

A **Global Division Nav** — a fixed vertical rail on the right edge of the screen — tracks your position and lets you jump to any of the 12 divisions without scrolling back. It is hidden on mobile.

---

## Project Structure

```
src/
  routes/
    __root.tsx                  # Root layout — providers only, no header
    _app.tsx                    # Pathless layout — wraps /fighters and /matchup with Header
    _app/
      fighters/index.tsx        # Fighter rankings
      matchup/index.tsx         # Head-to-head comparison
    index.tsx                   # / — cinematic experience, no header (renders ExperienceView)

  components/
    experience/
      ExperienceView.tsx        # Root scroll container + nav coordination layer
      HeroChapter.tsx           # Chapter 01
      DivisionsChapter.tsx      # Chapter 02 (Men's) and 03 (Women's) — shared template
      FighterSpotlight.tsx      # Single fighter beat — champion and contenders share this
      ExperienceNav.tsx         # Fixed vertical division nav (right rail, desktop only)
      ExperienceEndState.tsx    # Final CTA section
      BackToTopChevron.tsx      # Fixed bottom-right, pulses at page bottom

  lib/
    gsap.ts                     # GSAP plugin registry — always import GSAP from here
    mantine.ts                  # Mantine theme — colors, breakpoints, typography
    weightClasses.ts            # MENS_DIVISIONS and WOMENS_DIVISIONS definitions

  integrations/
    convex/provider.tsx         # ConvexReactClient provider
    tanstack-query/             # TanStack Query root provider and devtools

convex/
  schema.ts                     # fighters table definition
  fighters.ts                   # Convex queries and mutations
  scrape.ts                     # UFC.com data scraper (HTTP action)
  videoGenerate.ts              # fal.ai video generation action
```

---

## Data Model

All fighter data lives in the `fighters` table in Convex:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Fighter's full name |
| `nickname` | `string?` | Fighter's nickname |
| `weightClass` | `string` | e.g. `"mens-heavyweight"` |
| `division` | `"mens" \| "womens"` | Gender division |
| `ranking` | `number?` | `0` = champion, `1–15` = ranked, `undefined` = unranked |
| `record` | `object` | `{ wins, losses, draws, noContests }` |
| `stats` | `object` | `{ slpm, strikingAccuracy, sapm, strikingDefense, takedownAvg, takedownAccuracy, takedownDefense, submissionAvg }` |
| `country` | `string?` | Fighter's country of origin |
| `weight` | `string?` | Fighter's official weight (e.g. `"265 lbs"`) |
| `photoUrl` | `string?` | Fighter photo — stored in Convex File Storage |
| `videoUrl` | `string?` | Generated highlight video — stored in Convex File Storage |
| `ufcUrl` | `string` | Canonical UFC.com URL — used as the unique key for upserts |
| `ufcStatsUrl` | `string` | UFC Stats URL — used to sync per-fight statistics |
| `isActive` | `boolean` | Whether the fighter appears in the app |
| `lastSynced` | `number` | Unix ms timestamp of the last data sync |

---

## Available Scripts

```bash
yarn dev          # Start Vite dev server on :3000
yarn build        # Production build
yarn preview      # Preview the production build locally
npx convex dev    # Start Convex backend (run alongside yarn dev)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) |
| UI Library | [Mantine v8](https://mantine.dev/) — components, hooks, CSS Modules, PostCSS |
| Animation | [GSAP 3.14](https://gsap.com/) — ScrollTrigger, SplitText, Flip |
| Database | [Convex](https://convex.dev/) — realtime, type-safe serverless backend |
| Data Fetching | [TanStack Query](https://tanstack.com/query) + `@convex-dev/react-query` |
| Language | TypeScript 5 |
| Build tool | Vite 7 |
---

## GSAP Notes

All GSAP plugins (ScrollTrigger, SplitText, Flip) are registered once in `src/lib/gsap.ts`. **Always import GSAP from that module** — never directly from the `gsap` package — to guarantee plugins are registered before any component uses them:

```ts
// Correct
import { gsap, ScrollTrigger, SplitText, useGSAP } from '#/lib/gsap'

// Incorrect — plugins may not be registered yet
import gsap from 'gsap'
```

**Reduced motion:** Every animated component respects `prefers-reduced-motion`. When the preference is enabled, all elements are set to their final visible state immediately with no transitions. Turn off Reduce Motion in your OS settings if animations aren't running during development.

**Breakpoints in GSAP:** Never hardcode `768px` in `gsap.matchMedia()`. Pull the value from the Mantine theme so GSAP and CSS always use the same breakpoint:

```ts
import { useMantineTheme } from '@mantine/core'

const theme = useMantineTheme()

mm.add(`(min-width: ${theme.breakpoints.sm})`, () => {
  // desktop animations
})
```

---

## Styling Notes

This project uses Mantine CSS Modules with PostCSS. A few conventions to follow:

- **Colors**: Use `var(--mantine-color-ufcRed-6)` — never hardcode `#D20A0A`
- **Spacing**: Use `var(--mantine-spacing-*)` tokens — avoid hardcoded `px` values for spacing
- **Breakpoints in CSS**: Use `@mixin smaller-than sm` — Mantine's PostCSS mixin, already configured
- **`cx` utility**: Import from `clsx` directly — do not destructure `{ cx }` from `@mantine/core` as this causes errors in this project:

```ts
import cx from 'clsx'         // correct
import { cx } from '@mantine/core'  // incorrect — causes errors
```
