// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '#/lib/mantine'
import {
  COLOR_SCHEME_STORAGE_KEY,
  colorSchemeManager,
} from '#/lib/colorSchemeManager'
import FloatingDock from './FloatingDock'

// The router's Link is the dock's only external dependency. Render it as a
// plain anchor and emulate TanStack's active-link behaviour against a mocked
// current pathname so we can assert the active indicator behaviourally.
const route = vi.hoisted(() => ({ current: '/' }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, activeOptions, activeProps, children, ...rest }: any) => {
    const isActive = activeOptions?.exact
      ? route.current === to
      : route.current === to || route.current.startsWith(`${to}/`)
    return (
      <a href={to} {...rest} {...(isActive ? activeProps : {})}>
        {children}
      </a>
    )
  },
}))

function renderDock(pathname = '/') {
  route.current = pathname
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="light">
      <FloatingDock />
    </MantineProvider>,
  )
}

// Mirrors the root provider setup (ADR 0006): the shared localStorage manager
// the app mounts in __root.tsx, so persistence assertions exercise the real
// storage key. defaultColorScheme stays "light" — jsdom has no matchMedia.
function renderDockPersistent() {
  route.current = '/'
  return render(
    <MantineProvider
      theme={mantineTheme}
      defaultColorScheme="light"
      colorSchemeManager={colorSchemeManager}
    >
      <FloatingDock />
    </MantineProvider>,
  )
}

afterEach(() => {
  cleanup()
  // Mantine persists the user's explicit scheme choice — reset between tests.
  window.localStorage.clear()
  document.documentElement.setAttribute('data-mantine-color-scheme', 'light')
})

describe('FloatingDock', () => {
  it('is a nav landmark with an accessible name', () => {
    renderDock()
    expect(screen.getByRole('navigation', { name: 'Site navigation' })).toBeTruthy()
  })

  it('links to Experience, Fighters, and Matchup', () => {
    renderDock()
    expect(screen.getByRole('link', { name: 'Experience' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Fighters' }).getAttribute('href')).toBe('/fighters')
    expect(screen.getByRole('link', { name: 'Matchup' }).getAttribute('href')).toBe('/matchup')
  })

  it('marks the current route active (Fighters)', () => {
    renderDock('/fighters')
    const fighters = screen.getByRole('link', { name: 'Fighters' })
    expect(fighters.getAttribute('data-active')).toBe('true')
    expect(fighters.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Matchup' }).getAttribute('data-active')).toBeNull()
  })

  it('marks Experience active only on the exact root path', () => {
    renderDock('/')
    expect(
      screen.getByRole('link', { name: 'Experience' }).getAttribute('data-active'),
    ).toBe('true')
    cleanup()
    renderDock('/fighters')
    expect(
      screen.getByRole('link', { name: 'Experience' }).getAttribute('data-active'),
    ).toBeNull()
  })

  it('flips the Mantine color scheme when the toggle is clicked', () => {
    renderDock()
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle color scheme' }))
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle color scheme' }))
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light')
  })

  it('collapses to a single control and expands back', () => {
    renderDock()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Toggle color scheme' })).toBeNull()

    const expand = screen.getByRole('button', { name: 'Expand navigation' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    expect(screen.getAllByRole('link').length).toBe(3)
    expect(screen.getByRole('button', { name: 'Toggle color scheme' })).toBeTruthy()
  })

  it('persists an explicit toggle choice to localStorage (ADR 0006)', () => {
    renderDockPersistent()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle color scheme' }))
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle color scheme' }))
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light')
  })

  it('restores a persisted choice on remount', () => {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark')
    renderDockPersistent()
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark')
  })

  it('uses real links and buttons, so every item is keyboard operable', () => {
    const { container } = renderDock()
    // No click-handler divs: interactive elements are native <a> and <button>.
    expect(container.querySelectorAll('a').length).toBe(3)
    expect(container.querySelectorAll('button').length).toBe(2)
    expect(container.querySelector('[role="button"]:not(button)')).toBeNull()
  })
})

// Read via cwd-relative paths (NOT import.meta.url — the vitest harness shifts
// module mode and breaks import.meta.url; see project_behavioral_test_setup memory).
const experienceViewSource = readFileSync('src/components/experience/ExperienceView.tsx', 'utf8')
const rootRouteSource = readFileSync('src/routes/__root.tsx', 'utf8')
const dockCss = readFileSync('src/components/FloatingDock.module.css', 'utf8')

describe('FloatingDock site integration (#23)', () => {
  it('absorbs the Experience route standalone Sun/Moon toggle (removed)', () => {
    expect(experienceViewSource).not.toContain('useMantineColorScheme')
    expect(experienceViewSource).not.toContain('lucide-react')
    expect(experienceViewSource).not.toContain('<Sun')
    expect(experienceViewSource).not.toContain('<Moon')
  })

  it('renders from the root route so it covers every route tree', () => {
    expect(rootRouteSource).toContain('FloatingDock')
    expect(rootRouteSource).toContain('<Outlet />')
  })

  it('indicates the active route in the brand-interactive red token (ADR 0008)', () => {
    expect(dockCss).toContain('var(--mantine-color-ufcRed-6)')
  })
})

describe('Unified color scheme (#28, ADR 0006)', () => {
  it('boots in auto mode with the SSR no-flash script and shared manager', () => {
    expect(rootRouteSource).toContain('defaultColorScheme="auto"')
    expect(rootRouteSource).toContain('ColorSchemeScript')
    expect(rootRouteSource).toContain('colorSchemeManager={colorSchemeManager}')
    expect(rootRouteSource).toContain('localStorageKey={COLOR_SCHEME_STORAGE_KEY}')
  })

  it('App Route pages carry no hardcoded light/dark page surfaces', () => {
    for (const file of [
      // The Fighters page surface moved to the Page Shell (#29) — its old
      // index.module.css was removed in that retrofit; PageShell.module.css
      // owns the (mode-aware) surface and is asserted in PageShell.test.tsx.
      'src/components/PageShell.module.css',
      'src/routes/matchup/index.module.css',
      'src/routes/__root.module.css',
      'src/components/DivisionSplitView.module.css',
      'src/components/MatchupView.module.css',
      'src/components/DivisionPanel.module.css',
    ]) {
      const css = readFileSync(file, 'utf8')
      expect(css, file).not.toMatch(/background:\s*#(000|fff)\b/)
    }
  })
})
