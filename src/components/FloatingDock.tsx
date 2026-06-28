// Floating Dock (ADR 0007) — the single site-wide navigation element.
// A compact, collapsible pill rendered from the root layout so it appears on
// every route (Experience, Division, App Routes). Carries the three primary
// links and the single color-scheme toggle (ADR 0006), absorbing the
// Experience route's former standalone Sun/Moon toggle.
import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
import { Home, Menu, Moon, Sun, X } from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP } from '#/lib/gsap'
import classes from './FloatingDock.module.css'

// Per-session memory of the dock's open state (#44). Collapsed is the default;
// once a visitor opens the dock it stays open for the rest of the session.
const DOCK_OPEN_KEY = 'dock-open'

// The primary nav links. The root link renders as a Home icon (no text label);
// the rest are uppercase word links.
export const DOCK_LINKS = [
  { to: '/', label: 'Home', exact: true, Icon: Home },
  { to: '/fighters', label: 'Fighters', exact: false },
  { to: '/matchup', label: 'Matchup', exact: false },
] as const

function readOpen() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(DOCK_OPEN_KEY) === 'true'
}

export default function FloatingDock() {
  const navRef = useRef<HTMLElement>(null)
  // `collapsed` drives the icon, aria-expanded, and sessionStorage immediately.
  // `mounted` keeps the links in the DOM through the collapse out-stagger so it
  // can play before they unmount; under reduced motion it tracks `collapsed`.
  const [collapsed, setCollapsed] = useState(() => !readOpen())
  const [mounted, setMounted] = useState(() => readOpen())
  const reduceMotion = useReducedMotion()
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })

  function toggleCollapsed() {
    const next = !collapsed
    try {
      window.sessionStorage.setItem(DOCK_OPEN_KEY, String(!next))
    } catch {
      // Private-mode / disabled storage: degrade to in-memory state only.
    }
    // Expanding mounts the links up front so the entrance stagger has targets;
    // collapsing leaves them mounted for the GSAP effect to animate out first.
    if (!next) setMounted(true)
    setCollapsed(next)
  }

  // Recede choreography (issue #27): watch the hero's pinned scroll zone and
  // auto-collapse the dock out of view so it doesn't occlude the cinematic
  // Face-off animation. The pin zone mirrors HeroChapter's ScrollTrigger
  // (start: 'top top', end: '+=60%'). A CSS transition handles the visual — no
  // GSAP tween needed. Skipped on mobile (hero pin is desktop-only) and under
  // reduced motion. Operates independently of the user's expand/collapse toggle.
  useGSAP(
    () => {
      if (reduceMotion) return

      // matchMedia mirrors HeroChapter's desktop breakpoint (sm = 48em).
      const mm = gsap.matchMedia()
      mm.add('(min-width: 48em)', () => {
        const hero = document.querySelector('[data-hero-pin]')
        if (!hero || !navRef.current) return

        const nav = navRef.current
        const st = ScrollTrigger.create({
          trigger: hero,
          start: 'top top',
          end: '+=60%',
          onEnter: () => { nav.dataset.receded = 'true' },
          onLeave: () => { delete nav.dataset.receded },
          onEnterBack: () => { nav.dataset.receded = 'true' },
          onLeaveBack: () => { delete nav.dataset.receded },
        })

        return () => {
          st.kill()
          if (navRef.current) delete navRef.current.dataset.receded
        }
      })

      return () => mm.revert()
    },
    { dependencies: [reduceMotion] },
  )

  // GSAP drives only the link stagger (the pill's geometry follows its content).
  // Expand: links slide in left-to-right. Collapse: reverse stagger, then the
  // links unmount on completion. Reduced motion skips the tween entirely.
  useGSAP(
    () => {
      const links = gsap.utils.toArray<HTMLElement>(
        '[data-dock-link]',
        navRef.current,
      )
      if (links.length === 0) return

      if (reduceMotion) {
        // No motion: links are visible by default (no opacity: 0 in CSS), so an
        // expand needs nothing; a collapse just unmounts them instantly.
        if (collapsed) setMounted(false)
        return
      }

      if (!collapsed) {
        gsap.fromTo(
          links,
          { x: 12, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.25,
            stagger: 0.06,
            ease: 'power2.out',
            // Scoped to the animated props — a blanket clearProps wipes inline
            // styles via style.cssText = ''.
            clearProps: 'transform,opacity',
          },
        )
      } else {
        gsap.to(links, {
          x: 12,
          opacity: 0,
          duration: 0.2,
          stagger: { each: 0.06, from: 'end' },
          ease: 'power2.in',
          onComplete: () => setMounted(false),
        })
      }
    },
    { scope: navRef, dependencies: [collapsed, mounted, reduceMotion] },
  )

  return (
    <nav
      ref={navRef}
      className={classes.dock}
      aria-label="Site navigation"
      data-collapsed={collapsed || undefined}
    >
      {/* Color-scheme toggle — always rendered, leftmost (ADR 0006). */}
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

      {mounted && (
        <>
          {DOCK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={classes.link}
              data-dock-link
              activeOptions={{ exact: link.exact }}
              activeProps={{ 'data-active': 'true', 'aria-current': 'page' }}
              aria-label={'Icon' in link ? link.label : undefined}
            >
              {'Icon' in link ? (
                <link.Icon strokeWidth={1.5} size={16} aria-hidden="true" />
              ) : (
                link.label
              )}
            </Link>
          ))}

          <span className={classes.divider} aria-hidden="true" />
        </>
      )}

      <ActionIcon
        onClick={toggleCollapsed}
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
