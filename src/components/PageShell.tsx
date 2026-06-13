import type { ElementType, ReactNode } from 'react'
import classes from './PageShell.module.css'

/**
 * Page Shell (#29) — the shared layout wrapper for App Routes.
 *
 * It owns the ONLY sanctioned container widths, the type scale, and the
 * vertical rhythm (CONTEXT.md "Page Shell"). App pages compose `Section`s
 * inside `<PageShell>` instead of inventing their own max-widths or one-off
 * spacing. Every value resolves to a Mantine theme token; the surface is
 * mode-aware per ADR 0006.
 */

/** The only sanctioned container widths. */
export type ContainerVariant = 'content' | 'wide' | 'full'

/** Vertical rhythm in fixed steps of the theme spacing scale. */
export type Rhythm = 'none' | 'compact' | 'default'

export function PageShell({ children }: { children: ReactNode }) {
  return <main className={classes.shell}>{children}</main>
}

export function Section({
  container = 'wide',
  rhythm = 'default',
  component: Component = 'section',
  className,
  children,
}: {
  container?: ContainerVariant
  rhythm?: Rhythm
  component?: ElementType
  className?: string
  children: ReactNode
}) {
  return (
    <Component
      className={className ? `${classes.section} ${className}` : classes.section}
      data-container={container}
      data-rhythm={rhythm}
    >
      {children}
    </Component>
  )
}

/** Type-scale primitives — heading / body / data, per the shell's scale. */

export function ShellHeading({
  order = 1,
  className,
  children,
}: {
  order?: 1 | 2 | 3
  className?: string
  children: ReactNode
}) {
  const Tag = `h${order}` as ElementType
  return (
    <Tag
      className={className ? `${classes.heading} ${className}` : classes.heading}
      data-order={order}
    >
      {children}
    </Tag>
  )
}

export function ShellBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p className={className ? `${classes.body} ${className}` : classes.body}>{children}</p>
  )
}

export function ShellData({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <span className={className ? `${classes.data} ${className}` : classes.data}>
      {children}
    </span>
  )
}
