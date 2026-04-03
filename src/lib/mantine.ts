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

export const mantineTheme = createTheme({
  primaryColor: 'ufcRed',
  colors: { ufcRed },
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
