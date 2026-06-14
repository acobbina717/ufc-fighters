// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '#/lib/mantine'

// Router Link is the card's only external dependency — render it as a plain
// anchor so each card contributes exactly one <a> we can count.
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

// GSAP entry animation is irrelevant to layout structure — stub it out.
vi.mock('#/lib/gsap', () => ({
  gsap: { fromTo: () => {} },
  useGSAP: () => {},
}))

// No Convex in jsdom — return an empty champions list so every card renders
// its placeholder.
vi.mock('#/hooks/useStableQuery', () => ({
  useStableQuery: () => [],
}))

vi.mock('../../../convex/_generated/api', () => ({
  api: { fighters: { getChampionsByGender: 'getChampionsByGender' } },
}))

import WeightClassGrid, { DESKTOP_MOTION_QUERY } from './WeightClassGrid'

// The grid now owns gender state and renders its own DivisionToggle header, so
// reaching the women's grid means clicking the toggle rather than passing a prop.
function renderGrid(gender: 'mens' | 'womens') {
  const result = render(
    <MantineProvider theme={mantineTheme}>
      <WeightClassGrid />
    </MantineProvider>,
  )
  if (gender === 'womens') {
    fireEvent.click(result.getByText("Women's Division"))
  }
  return result
}

afterEach(cleanup)

describe('WeightClassGrid bento layout', () => {
  it("renders 8 cards for the men's grid", () => {
    const { container } = renderGrid('mens')
    expect(container.querySelectorAll('a').length).toBe(8)
  })

  it("renders 3 cards for the women's grid", () => {
    const { container } = renderGrid('womens')
    expect(container.querySelectorAll('a').length).toBe(3)
  })

  it("marks the two flanking sentinels in the men's grid", () => {
    const { container } = renderGrid('mens')
    expect(container.querySelectorAll('[data-sentinel]').length).toBe(2)
    expect(container.querySelector('[data-sentinel="left"]')).not.toBeNull()
    expect(container.querySelector('[data-sentinel="right"]')).not.toBeNull()
  })

  it("marks Bantamweight as the only sentinel in the women's grid (no right)", () => {
    const { container } = renderGrid('womens')
    // 3 divisions: Bantamweight is the single left sentinel; Strawweight and
    // Flyweight are full-width landscape bands. There is no right sentinel.
    expect(container.querySelectorAll('[data-sentinel]').length).toBe(1)
    expect(container.querySelector('[data-sentinel="left"]')).not.toBeNull()
    expect(container.querySelector('[data-sentinel="right"]')).toBeNull()
  })

  it('leaves no clip-path-era custom properties in the grid CSS', () => {
    const css = readFileSync(
      'src/components/experience/WeightClassGrid.module.css',
      'utf8',
    )
    expect(css).not.toContain('--curve-r')
    expect(css).not.toContain('--frame-color')
  })
})

// #15 — scroll-entry flanking animation. The behaviour is GSAP-on-scroll, which
// jsdom can't exercise, so we assert the wiring against the component source.
describe('#15 scroll-entry flanking animation', () => {
  const src = readFileSync(
    'src/components/experience/WeightClassGrid.tsx',
    'utf8',
  )

  it('gates the entrance to desktop with no-preference motion via matchMedia', () => {
    expect(src).toContain('gsap.matchMedia()')
    expect(src).toContain('DESKTOP_MOTION_QUERY')
    // The query is derived from theme.breakpoints.sm — assert the resolved
    // value so a theme change that would shift the breakpoint is caught.
    expect(DESKTOP_MOTION_QUERY).toBe(
      '(min-width: 48.0625em) and (prefers-reduced-motion: no-preference)',
    )
  })

  it('drives the timeline from a ScrollTrigger at "top 80%"', () => {
    expect(src).toContain('scrollTrigger:')
    expect(src).toContain("start: 'top 80%'")
  })

  it('animates the sentinels from their edges and the center column after', () => {
    expect(src).toContain(':scope > [data-sentinel="left"]')
    expect(src).toContain(':scope > [data-sentinel="right"]')
    expect(src).toContain(':scope > :not([data-sentinel])')
    expect(src).toContain('x: -120')
    expect(src).toContain('x: 120')
  })

  it('re-runs cleanly on gender swap via revertOnUpdate', () => {
    expect(src).toContain('dependencies: [gender]')
    expect(src).toContain('revertOnUpdate: true')
  })
})
