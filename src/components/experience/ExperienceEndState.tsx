// Static end section — no pin, no animation. A deliberate exhale after the experience.
import { Button, Group } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import classes from './ExperienceEndState.module.css'

export default function ExperienceEndState() {
  return (
    <section className={classes.root}>
      <p className={classes.copy}>You've seen the rankings.</p>
      <p className={classes.copy}>Now explore them.</p>
      <Group gap="md" wrap="wrap" mt={48}>
        <Button
          component={Link}
          to="/fighters"
          color="ufcRed"
          variant="filled"
          size="lg"
          radius="xs"
          tt="uppercase"
          fw={800}
          classNames={{ label: classes.cta }}
        >
          Enter the Rankings →
        </Button>
        <Button
          component={Link}
          to="/matchup"
          variant="outline"
          color="gray"
          size="lg"
          radius="xs"
          tt="uppercase"
          fw={800}
          classNames={{ label: classes.cta }}
        >
          Build a Matchup ↗
        </Button>
      </Group>
    </section>
  )
}
