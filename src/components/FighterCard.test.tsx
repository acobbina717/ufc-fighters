// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '#/lib/mantine'
import FighterCard from './FighterCard'

// The card's only runtime dependencies beyond Mantine are the live next-fight query
// and GSAP (fired on hover, never on render). Stub both so we can render in isolation.
vi.mock('#/hooks/useStableQuery', () => ({ useStableQuery: () => undefined }))
vi.mock('#/lib/gsap', () => ({ gsap: { to: vi.fn() } }))

const fighter = {
  _id: 'f1',
  _creationTime: 0,
  name: 'Jon Jones',
  weightClass: 'heavyweight',
  ranking: 0,
  record: { wins: 27, losses: 1, draws: 0 },
} as any

function renderCard() {
  return render(
    <MantineProvider theme={mantineTheme}>
      <FighterCard fighter={fighter} onClick={() => {}} />
    </MantineProvider>,
  )
}

afterEach(cleanup)

describe('FighterCard record (#31 — disciplined win/loss pair)', () => {
  it('exposes wins with win semantics, independent of color', () => {
    renderCard()
    // Behavioural contract: the record names its win count externally (aria-label),
    // so meaning is conveyed without relying on a color value.
    expect(screen.getByLabelText('27 wins')).toBeTruthy()
  })

  it('exposes losses with loss semantics, independent of color', () => {
    renderCard()
    expect(screen.getByLabelText('1 losses')).toBeTruthy()
  })
})

// Read via cwd-relative paths (NOT import.meta.url — the vitest harness shifts module
// mode and breaks import.meta.url; see project_behavioral_test_setup memory).
const cardCss = readFileSync('src/components/FighterCard.module.css', 'utf8')

describe('FighterCard palette discipline (ADR 0008)', () => {
  it('renders wins and losses with the semantic win/loss tokens', () => {
    expect(cardCss).toContain('var(--mantine-color-win-6)')
    expect(cardCss).toContain('var(--mantine-color-loss-6)')
  })

  it('never repurposes brand red to mean "loss"', () => {
    // The loss color must be its own semantic token, not the brand/interactive red.
    const lossRule = cardCss.slice(cardCss.indexOf('.losses'))
    expect(lossRule).not.toContain('primary-color')
    expect(lossRule).not.toContain('ufcRed')
  })

  it('reserves champion gold for the belt, with no red in champion iconography', () => {
    const beltRule = cardCss.slice(cardCss.indexOf('.champBelt'))
    expect(beltRule).toContain('var(--mantine-color-gold-')
    expect(beltRule).not.toContain('primary-color')
  })
})
