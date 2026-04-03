import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useHotkeys } from '@mantine/hooks'
import {
  Box,
  Text,
  Badge,
  Group,
  Stack,
  SimpleGrid,
  RingProgress,
  ActionIcon,
  Title,
  Divider,
} from '@mantine/core'
import { X } from 'lucide-react'
import { gsap, Flip, useGSAP } from '#/lib/gsap'
import type { Doc } from '../../convex/_generated/dataModel'
import classes from './FighterDetailOverlay.module.css'

interface FighterDetailOverlayProps {
  fighter: Doc<'fighters'>
  sourceEl: HTMLElement
  onClose: () => void
}

const STAT_LABELS: Record<string, string> = {
  slpm: 'SLpM',
  strikingAccuracy: 'Str. Acc.',
  sapm: 'SApM',
  strikingDefense: 'Str. Def.',
  takedownAvg: 'TD Avg.',
  takedownAccuracy: 'TD Acc.',
  takedownDefense: 'TD Def.',
  submissionAvg: 'Sub. Avg.',
}

const STAT_MAX: Record<string, number> = {
  slpm: 12,
  strikingAccuracy: 100,
  sapm: 12,
  strikingDefense: 100,
  takedownAvg: 10,
  takedownAccuracy: 100,
  takedownDefense: 100,
  submissionAvg: 5,
}

function StatRing({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)

  return (
    <Stack gap={4} align="center" className={classes.statWrap}>
      <RingProgress
        size={70}
        thickness={6}
        roundCaps
        sections={[{ value: pct, color: 'ufcRed' }]}
        label={
          <Text fw={700} ta="center" size="xs" style={{ fontFamily: 'var(--mantine-font-family-headings)' }}>
            {value % 1 === 0 ? value : value.toFixed(1)}
          </Text>
        }
      />
      <Text className={classes.statLabel}>{label}</Text>
    </Stack>
  )
}

export default function FighterDetailOverlay({ fighter, sourceEl, onClose }: FighterDetailOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const overlay = overlayRef.current
    const content = contentRef.current
    if (!overlay || !content) return

    const flipState = Flip.getState(sourceEl)
    Flip.from(flipState, {
      targets: overlay,
      duration: 0.7,
      ease: 'power3.inOut',
      scale: true,
      onComplete: () => {
        if (content) {
          gsap.from(content.children, {
            opacity: 0,
            y: 20,
            stagger: 0.06,
            duration: 0.5,
            ease: 'power2.out',
          })
        }
      },
    })
  }, { scope: overlayRef })

  function handleClose() {
    const overlay = overlayRef.current
    if (!overlay) {
      onClose()
      return
    }

    gsap.to(overlay, {
      opacity: 0,
      scale: 0.96,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: onClose,
    })
  }

  useHotkeys([['Escape', handleClose]])

  const isChamp = fighter.ranking === 0
  const stats = fighter.stats

  const content = (
    <div className={classes.root} ref={overlayRef}>
      <div className={classes.backdrop} onClick={handleClose} aria-label="Close overlay" />

      <div className={classes.panel}>
        <ActionIcon
          className={classes.closeBtn}
          onClick={handleClose}
          variant="outline"
          radius="xl"
          size="lg"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2.5} />
        </ActionIcon>

        <div className={classes.photoCol}>
          {fighter.photoUrl ? (
            <img src={fighter.photoUrl} alt={fighter.name} className={classes.photo} />
          ) : (
            <div className={classes.initials}>
              {fighter.name.split(' ').map((n: string) => n[0]).join('').slice(0, 3)}
            </div>
          )}
        </div>

        <div className={classes.details} ref={contentRef}>
          <Badge
            variant="filled"
            color={isChamp ? 'ufcRed' : 'dark.9'}
            radius="xs"
            className={classes.rankBadge}
          >
            {isChamp ? 'CHAMPION' : fighter.ranking !== undefined ? `#${fighter.ranking} RANKED` : 'UNRANKED'}
          </Badge>

          <Title order={1} className={classes.name}>{fighter.name.toUpperCase()}</Title>

          {fighter.nickname && (
            <Text className={classes.nickname}>"{fighter.nickname}"</Text>
          )}

          <Group gap="xs" mb="lg">
            {fighter.country && (
              <Badge variant="light" color="gray" radius="xs" className={classes.metaBadge}>
                {fighter.country}
              </Badge>
            )}
            <Badge variant="light" color="gray" radius="xs" className={classes.metaBadge}>
              {fighter.weightClass.replace(/([A-Z])/g, ' $1').trim()}
            </Badge>
          </Group>

          <Group className={classes.record} gap={0}>
            <Stack gap={0} align="center" px="lg" py="sm">
              <Text className={classes.recordNum} data-type="wins">{fighter.record.wins}</Text>
              <Text className={classes.recordLabel}>Wins</Text>
            </Stack>
            <Divider orientation="vertical" />
            <Stack gap={0} align="center" px="lg" py="sm">
              <Text className={classes.recordNum} data-type="losses">{fighter.record.losses}</Text>
              <Text className={classes.recordLabel}>Losses</Text>
            </Stack>
            {fighter.record.draws > 0 && (
              <>
                <Divider orientation="vertical" />
                <Stack gap={0} align="center" px="lg" py="sm">
                  <Text className={classes.recordNum} data-type="draws">{fighter.record.draws}</Text>
                  <Text className={classes.recordLabel}>Draws</Text>
                </Stack>
              </>
            )}
          </Group>

          <Text className={classes.statsLabel}>Fighter Statistics</Text>
          <SimpleGrid cols={4} spacing="md" className={classes.statsGrid}>
            {(Object.keys(STAT_LABELS) as Array<keyof typeof STAT_LABELS>).map((key) => (
              <StatRing
                key={key}
                label={STAT_LABELS[key]}
                value={stats[key as keyof typeof stats]}
                max={STAT_MAX[key]}
              />
            ))}
          </SimpleGrid>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
