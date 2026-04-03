// Fixed bottom-right. Pulses at page bottom. Design to be finalized in polish pass.
import { ActionIcon } from '@mantine/core'
import { useWindowScroll } from '@mantine/hooks'
import cx from 'clsx'
import classes from './BackToTopChevron.module.css'

export default function BackToTopChevron() {
  const [scroll, scrollTo] = useWindowScroll()

  const visible = scroll.y > 100
  const atBottom = typeof window !== 'undefined'
    && scroll.y + window.innerHeight >= document.body.scrollHeight - 60

  return (
    <ActionIcon
      variant="filled"
      color={atBottom ? 'ufcRed' : 'gray'}
      size="lg"
      radius="sm"
      aria-label="Back to top"
      onClick={() => scrollTo({ y: 0 })}
      className={cx(classes.root, { [classes.visible]: visible, [classes.atBottom]: atBottom })}
    >
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
        <path d="M1 9L8 2L15 9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </ActionIcon>
  )
}
