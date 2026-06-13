// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '#/lib/mantine'
import {
  PageShell,
  Section,
  ShellBody,
  ShellData,
  ShellHeading,
} from './PageShell'

function renderShell(ui: ReactNode) {
  return render(<MantineProvider theme={mantineTheme}>{ui}</MantineProvider>)
}

afterEach(cleanup)

describe('PageShell container variants', () => {
  it('renders each variant with its children and an externally distinguishable data-container', () => {
    const { container } = renderShell(
      <PageShell>
        <Section container="content">
          <span>content child</span>
        </Section>
        <Section container="wide">
          <span>wide child</span>
        </Section>
        <Section container="full">
          <span>full child</span>
        </Section>
      </PageShell>,
    )

    expect(screen.getByText('content child')).toBeTruthy()
    expect(screen.getByText('wide child')).toBeTruthy()
    expect(screen.getByText('full child')).toBeTruthy()

    expect(container.querySelector('[data-container="content"]')).not.toBeNull()
    expect(container.querySelector('[data-container="wide"]')).not.toBeNull()
    expect(container.querySelector('[data-container="full"]')).not.toBeNull()
  })

  it('defaults to the wide container and default rhythm', () => {
    const { container } = renderShell(
      <PageShell>
        <Section>
          <span>defaulted</span>
        </Section>
      </PageShell>,
    )
    const section = container.querySelector('section')
    expect(section?.getAttribute('data-container')).toBe('wide')
    expect(section?.getAttribute('data-rhythm')).toBe('default')
  })

  it('exposes the rhythm step as an external data attribute', () => {
    const { container } = renderShell(
      <PageShell>
        <Section rhythm="none">
          <span>stage</span>
        </Section>
      </PageShell>,
    )
    expect(container.querySelector('[data-rhythm="none"]')).not.toBeNull()
  })

  it('renders the shell as a single <main> landmark', () => {
    const { container } = renderShell(
      <PageShell>
        <Section>
          <span>x</span>
        </Section>
      </PageShell>,
    )
    expect(container.querySelectorAll('main')).toHaveLength(1)
  })

  it('lets a Section override its rendered element', () => {
    const { container } = renderShell(
      <PageShell>
        <Section component="div" container="full">
          <span>div stage</span>
        </Section>
      </PageShell>,
    )
    const stage = container.querySelector('[data-container="full"]')
    expect(stage?.tagName).toBe('DIV')
  })
})

describe('PageShell type scale', () => {
  it('renders heading / body / data primitives with the right semantics', () => {
    const { container } = renderShell(
      <PageShell>
        <Section>
          <ShellHeading order={2}>Heavyweight</ShellHeading>
          <ShellBody>Body copy</ShellBody>
          <ShellData>26-3-0</ShellData>
        </Section>
      </PageShell>,
    )
    const heading = screen.getByText('Heavyweight')
    expect(heading.tagName).toBe('H2')
    expect(heading.getAttribute('data-order')).toBe('2')
    expect(container.querySelector('p')?.textContent).toBe('Body copy')
    expect(screen.getByText('26-3-0').tagName).toBe('SPAN')
  })
})

// Source-level guarantees per the project's behavioral-test pattern: the shell
// owns the only sanctioned widths/spacing as Mantine tokens (no raw px), and the
// full/none stage stays layout-neutral so GSAP pinned descendants aren't broken.
const shellCss = readFileSync('src/components/PageShell.module.css', 'utf8')
const fightersSource = readFileSync('src/routes/fighters/index.tsx', 'utf8')

describe('PageShell tokens & Fighters retrofit (#29)', () => {
  it('sizes containers from theme breakpoint tokens, not raw px', () => {
    expect(shellCss).toContain('max-width: var(--mantine-breakpoint-md)')
    expect(shellCss).toContain('max-width: var(--mantine-breakpoint-lg)')
    expect(shellCss).not.toMatch(/max-width:\s*\d+px/)
  })

  it('spaces rhythm from theme spacing tokens, not raw px', () => {
    expect(shellCss).toContain('padding-block: var(--mantine-spacing-lg)')
    expect(shellCss).toContain('padding-block: var(--mantine-spacing-xl)')
    expect(shellCss).not.toMatch(/padding-block:\s*\d+px/)
  })

  it('keeps the full/none stage layout-neutral for pinned scroll (no transform/overflow)', () => {
    // `text-transform` is fine — it does not establish a containing block;
    // a geometric `transform:` on a pinned ancestor would break ScrollTrigger.
    expect(shellCss).not.toMatch(/(?<!text-)transform:/)
    expect(shellCss).not.toContain('overflow:')
  })

  it('uses a mode-aware surface, never a hardcoded light/dark background', () => {
    expect(shellCss).toContain('light-dark(')
    expect(shellCss).not.toMatch(/background:\s*#(fff|000|ffffff|000000)\b/i)
  })

  it('composes the Fighters page inside the shell with no ad-hoc module css', () => {
    expect(fightersSource).toContain('PageShell')
    expect(fightersSource).toContain('Section')
    expect(fightersSource).toContain('container="full"')
    expect(fightersSource).not.toContain('index.module.css')
  })
})
