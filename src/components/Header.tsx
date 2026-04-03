import { Link } from '@tanstack/react-router'
import classes from './Header.module.css'

export default function Header() {
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
        </div>
      </nav>
    </header>
  )
}
