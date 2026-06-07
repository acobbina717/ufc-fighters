import { Link } from '@tanstack/react-router'
import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core'
import { Sun, Moon } from 'lucide-react'
import classes from './Header.module.css'

export default function Header() {
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true })

  return (
    <header className={classes.header}>
      <nav className={classes.nav}>
        <Link to="/" className={classes.logo}>
          <span className={classes.logoText}>UFC</span>
          <span className={classes.logoSub}>Fighter Explorer</span>
        </Link>
        <div className={classes.navLinks}>
          <Link
            to="/fighters"
            className={classes.navLink}
            activeProps={{ 'data-active': 'true' }}
          >
            Fighters
          </Link>
          <Link
            to="/matchup"
            className={classes.navLink}
            activeProps={{ 'data-active': 'true' }}
          >
            Matchup
          </Link>
          
          <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
            variant="default"
            size="lg"
            aria-label="Toggle color scheme"
            className={classes.themeToggle}
          >
            {computedColorScheme === 'light' ? (
              <Moon className={classes.icon} strokeWidth={1.5} size={20} />
            ) : (
              <Sun className={classes.icon} strokeWidth={1.5} size={20} />
            )}
          </ActionIcon>
        </div>
      </nav>
    </header>
  )
}
