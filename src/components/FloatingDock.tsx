// Floating Dock (ADR 0007) — the single site-wide navigation element.
// A compact, collapsible pill rendered from the root layout so it appears on
// every route (Experience, Division, App Routes). Carries the three primary
// links and the single color-scheme toggle (ADR 0006), absorbing the
// Experience route's former standalone Sun/Moon toggle.
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { Menu, Moon, Sun, X } from 'lucide-react'
import classes from './FloatingDock.module.css'

export const DOCK_LINKS = [
  { to: '/', label: 'Experience', exact: true },
  { to: '/fighters', label: 'Fighters', exact: false },
  { to: '/matchup', label: 'Matchup', exact: false },
] as const

export default function FloatingDock() {
  const [collapsed, setCollapsed] = useState(false)
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })

  return (
    <nav
      className={classes.dock}
      aria-label="Site navigation"
      data-collapsed={collapsed || undefined}
    >
      {!collapsed && (
        <>
          {DOCK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={classes.link}
              activeOptions={{ exact: link.exact }}
              activeProps={{ 'data-active': 'true', 'aria-current': 'page' }}
            >
              {link.label}
            </Link>
          ))}

          <span className={classes.divider} aria-hidden="true" />

          <ActionIcon
            onClick={() =>
              setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')
            }
            variant="subtle"
            size="lg"
            radius="xl"
            aria-label="Toggle color scheme"
            className={classes.iconButton}
          >
            {computedColorScheme === 'light' ? (
              <Moon strokeWidth={1.5} size={18} />
            ) : (
              <Sun strokeWidth={1.5} size={18} />
            )}
          </ActionIcon>
        </>
      )}

      <ActionIcon
        onClick={() => setCollapsed((c) => !c)}
        variant="subtle"
        size="lg"
        radius="xl"
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        aria-expanded={!collapsed}
        className={classes.iconButton}
      >
        {collapsed ? (
          <Menu strokeWidth={1.5} size={18} />
        ) : (
          <X strokeWidth={1.5} size={18} />
        )}
      </ActionIcon>
    </nav>
  )
}
