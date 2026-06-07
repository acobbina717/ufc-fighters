import type { Gender } from '#/lib/weightClasses'
import classes from './DivisionToggle.module.css'

export type { Gender }

interface DivisionToggleProps {
  value: Gender
  onChange: (value: Gender) => void
}

export default function DivisionToggle({ value, onChange }: DivisionToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent, current: Gender) => {
    const next: Gender = current === 'mens' ? 'womens' : 'mens'
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault()
      onChange(next)
    }
  }

  return (
    <div className={classes.wrapper}>
      <div className={classes.toggle} role="radiogroup" aria-label="Select Division">
        <button
          type="button"
          role="radio"
          aria-checked={value === 'mens'}
          tabIndex={value === 'mens' ? 0 : -1}
          className={classes.segment}
          data-active={value === 'mens'}
          onClick={() => onChange('mens')}
          onKeyDown={(e) => handleKeyDown(e, 'mens')}
        >
          {value === 'mens' && <span className={classes.dot} aria-hidden="true" />}
          Men's Division
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'womens'}
          tabIndex={value === 'womens' ? 0 : -1}
          className={classes.segment}
          data-active={value === 'womens'}
          onClick={() => onChange('womens')}
          onKeyDown={(e) => handleKeyDown(e, 'womens')}
        >
          {value === 'womens' && <span className={classes.dot} aria-hidden="true" />}
          Women's Division
        </button>
      </div>
    </div>
  )
}
