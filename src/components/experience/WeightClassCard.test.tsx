// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '#/lib/mantine'
import { MENS_DIVISIONS, WOMENS_DIVISIONS } from '#/lib/weightClasses'
import type { WeightClassDef } from '#/lib/weightClasses'
import WeightClassCard, { NO_HOVER } from './WeightClassCard'

// The router's Link is the card's only external dependency. Render it as a plain
// anchor with the resolved href so we can assert navigation target behaviourally.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...rest }: any) => {
    const href = String(to)
      .replace('$gender', params.gender)
      .replace('$weightClass', params.weightClass)
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  },
}))

const heavyweight = MENS_DIVISIONS.find((d) => d.key === 'mens-heavyweight')!

function renderCard(division: WeightClassDef, championImageUrl?: string) {
  return render(
    <MantineProvider theme={mantineTheme}>
      <WeightClassCard division={division} championImageUrl={championImageUrl} />
    </MantineProvider>,
  )
}

afterEach(cleanup)

describe('WeightClassCard', () => {
  it('shows the division name', () => {
    renderCard(heavyweight)
    expect(screen.getByText('Heavyweight')).toBeTruthy()
  })

  it('shows the full weight range', () => {
    renderCard(heavyweight)
    expect(screen.getByText('206 – 265 LBS')).toBeTruthy()
  })

  it('shows the upper-bound-only range for a floorless division', () => {
    const strawweight = WOMENS_DIVISIONS.find((d) => d.key === 'womens-strawweight')!
    renderCard(strawweight)
    expect(screen.getByText('UP TO 115 LBS')).toBeTruthy()
  })

  it('links to its division route', () => {
    const { container } = renderCard(heavyweight)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/divisions/mens/heavyweight')
  })

  it('renders the champion photo when one is provided', () => {
    const { container } = renderCard(heavyweight, 'https://img.example/champ.png')
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://img.example/champ.png')
  })

  it('renders a placeholder (no photo) when no champion image is available', () => {
    const { container } = renderCard(heavyweight)
    expect(container.querySelector('img')).toBeNull()
  })

  it('exposes a frame slot rect for the hover sweep', () => {
    const { container } = renderCard(heavyweight)
    expect(container.querySelector('rect')).not.toBeNull()
  })
})

// Read via cwd-relative paths (NOT import.meta.url — the new vitest harness shifts
// module mode and breaks import.meta.url; see project_behavioral_test_setup memory).
const cardSource = readFileSync('src/components/experience/WeightClassCard.tsx', 'utf8')
const cardCss = readFileSync('src/components/experience/WeightClassCard.module.css', 'utf8')

describe('WeightClassCard frame-sweep hover (#11)', () => {
  it('sweeps a plain <rect>, never a custom <path>', () => {
    const { container } = renderCard(heavyweight)
    const svg = container.querySelector('svg')
    expect(svg?.querySelector('rect')).not.toBeNull()
    expect(svg?.querySelector('path')).toBeNull()
  })

  it('strokes the sweep in UFC red (ufcRed-6 token === #D20A0A)', () => {
    // Project rule: reference the Mantine token, not a raw hex. ufcRed[6] === #D20A0A.
    expect(cardCss).toContain('stroke: var(--mantine-color-ufcRed-6)')
  })

  it('wires mouse enter/leave hover handlers', () => {
    expect(cardSource).toContain('onMouseEnter')
    expect(cardSource).toContain('onMouseLeave')
  })

  it('derives the perimeter geometrically, never via getTotalLength', () => {
    expect(cardSource).not.toContain('getTotalLength')
    expect(cardSource).toContain('getBoundingClientRect')
  })

  it('composes sweep + sheen on one timeline referencing both', () => {
    expect(cardSource).toContain('classes.sheen')
    expect(cardSource).toContain('gsap.timeline')
    expect(cardSource).toMatch(/rectRef/)
    expect(cardSource).toMatch(/sheenRef/)
  })

  it('suppresses hover on touch devices and small viewports', () => {
    // Derived from theme.breakpoints.sm — assert the resolved value so a theme
    // change that would shift the guard is caught.
    expect(NO_HOVER).toBe(
      '(max-width: 48em), (hover: none), (prefers-reduced-motion: reduce)',
    )
  })
})
