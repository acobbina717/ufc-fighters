import { createTheme, type MantineColorsTuple } from '@mantine/core'

const ufcRed: MantineColorsTuple = [
  '#fff0f0',
  '#ffd9d9',
  '#ffb3b3',
  '#ff8080',
  '#ff4d4d',
  '#ff1a1a',
  '#D20A0A',
  '#a80808',
  '#7a0606',
  '#520404',
]

// --- Disciplined palette (ADR 0008) ---
// Each ramp owns one exclusive job. Brand red (`ufcRed`) stays brand + interactive;
// the tokens below carry data meaning and champion status and must never bleed into
// chrome/navigation. For mode-aware data text, reference shade -6 in light mode and a
// lighter shade (-4) in dark mode via `light-dark()` — the deep shades fail contrast
// on a dark surface.

// Champion gold — title-holders only (belt iconography, champion badges). Index 5 is
// the canonical gold (#E0A82E); never decorative.
const gold: MantineColorsTuple = [
  '#fdf6e3',
  '#f9ecc4',
  '#f2d98c',
  '#ebc451',
  '#e6b53a',
  '#E0A82E',
  '#c8901f',
  '#a4741a',
  '#7e5914',
  '#553b0d',
]

// Semantic win color — data visualization only (records, matchup bars). Green.
const win: MantineColorsTuple = [
  '#e7f9ee',
  '#d0f2dd',
  '#a3e6bd',
  '#73d99b',
  '#4ade80',
  '#2ecb66',
  '#16a34a',
  '#12893e',
  '#0d6c31',
  '#084d22',
]

// Semantic loss color — data visualization only. A distinct crimson, deliberately a
// different hue from brand `ufcRed` so brand red is never repurposed to mean "loss".
const loss: MantineColorsTuple = [
  '#fcebec',
  '#f6d5d6',
  '#ecacae',
  '#e28387',
  '#e06b70',
  '#cf4a50',
  '#B4232A',
  '#991d23',
  '#7c171c',
  '#5a1014',
]

export const mantineTheme = createTheme({
  primaryColor: 'ufcRed',
  colors: { ufcRed, gold, win, loss },
  fontFamily: 'Inter, Barlow, sans-serif',
  fontFamilyMonospace: 'monospace',
  headings: {
    fontFamily: "'Barlow Condensed', Impact, sans-serif",
    fontWeight: '800',
  },
  defaultRadius: 'xs',
  // Explicitly defined to match postcss.config.cjs — GSAP uses theme.breakpoints.sm
  // directly in matchMedia queries, so these must be verified, never assumed.
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  components: {
    Overlay: { defaultProps: { transitionProps: { duration: 0 } } },
    Modal: { defaultProps: { transitionProps: { duration: 0 } } },
  },
})
