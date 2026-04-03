/**
 * FighterVideoPanel — displays a single fighter's intro video (or fallback).
 *
 * State machine (component-local):
 *   idle       → no video, not yet submitted
 *   submitting → generateVideo action fired; fal.subscribe blocks until done,
 *                then sets fighter.videoUrl reactively via Convex
 *   failed     → action threw or attempts exhausted (max 2)
 *
 * On final failure (2 attempts): shows fighter photo + fires a Mantine toast.
 */

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useAction } from 'convex/react'
import { Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import classes from './FighterVideoPanel.module.css'

export interface FighterVideoPanelHandle {
  play: () => void
}

interface FighterVideoPanelProps {
  fighter: Doc<'fighters'>
  onReady: () => void  // called when the panel is ready to play (or has no video)
}

const MAX_ATTEMPTS = 2

function getRankingLabel(ranking: number | undefined) {
  if (ranking === 0) return 'Champion'
  if (ranking !== undefined) return `Ranked #${ranking}`
  return ''
}

const FighterVideoPanel = forwardRef<FighterVideoPanelHandle, FighterVideoPanelProps>(
  ({ fighter, onReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    // Controls whether the name/record overlay is visible
    const [overlayVisible, setOverlayVisible] = useState(false)
    // 'submitting' means fal.subscribe is blocking — videoUrl will be set reactively when done
    const [status, setStatus] = useState<'idle' | 'submitting' | 'failed'>('idle')
    // Tracks submission attempts — keyed per fighter so changing selection resets it
    const attemptCount = useRef(0)

    const generateVideo = useAction(api.videoGenerate.generateVideo)

    // Reset all local state when the selected fighter changes
    useEffect(() => {
      setOverlayVisible(false)
      setStatus('idle')
      attemptCount.current = 0
    }, [fighter._id])

    // Auto-submit — fires generateVideo which blocks until fal.ai finishes
    useEffect(() => {
      if (fighter.videoUrl) return
      if (status === 'submitting') return
      if (status === 'failed') return
      if (attemptCount.current >= MAX_ATTEMPTS) return

      setStatus('submitting')
      attemptCount.current += 1

      generateVideo({ fighterId: fighter._id })
        .then(() => setStatus('idle'))
        .catch((err) => {
          console.error(`generateVideo failed for ${fighter.name}:`, err)
          if (attemptCount.current >= MAX_ATTEMPTS) {
            setStatus('failed')
            notifications.show({
              title: 'Video generation failed',
              message: fighter.name,
              color: 'red',
            })
          } else {
            setStatus('idle')
          }
        })
    }, [fighter._id, fighter.videoUrl, status, generateVideo])

    // Signal ready immediately when there's no video (don't block the matchup)
    useEffect(() => {
      if (!fighter.videoUrl) onReady()
    }, [fighter._id, fighter.videoUrl])

    // Expose play() so MatchupView can trigger both panels simultaneously
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
    }))

    const rankingLabel = getRankingLabel(fighter.ranking)
    const isLoading = status === 'submitting' && !fighter.videoUrl

    return (
      <div className={classes.panel}>
        {fighter.videoUrl ? (
          // Video stored permanently in Convex File Storage
          <video
            ref={videoRef}
            src={fighter.videoUrl}
            className={classes.video}
            muted
            autoPlay
            playsInline
            loop={false}
            preload="auto"
            onCanPlayThrough={onReady}          // signal ready once buffered
            onEnded={() => setOverlayVisible(true)}  // freeze + show overlay
          />
        ) : fighter.photoUrl ? (
          // Static full-body photo while video is being generated
          <img src={fighter.photoUrl} alt={fighter.name} className={classes.photo} />
        ) : (
          // Last resort: plain name text if no photo either
          <div className={classes.placeholder}>
            <span className={classes.placeholderText}>{fighter.name}</span>
          </div>
        )}

        {/* Spinner overlay — shown while fal.ai is rendering */}
        {isLoading && (
          <div className={classes.spinnerWrap}>
            <Loader color="ufcRed" size="md" type="dots" />
            <span className={classes.spinnerLabel}>Generating video…</span>
          </div>
        )}

        {/* Subtle gradient at the bottom to help the name overlay read over the video */}
        <div className={classes.fadeBottom} aria-hidden="true" />

        {/* Name / record overlay — always visible when no video, fades in after video ends */}
        <div className={classes.overlay} data-visible={overlayVisible || !fighter.videoUrl ? 'true' : 'false'}>
          {rankingLabel && <div className={classes.ranking}>{rankingLabel}</div>}
          <div className={classes.name}>{fighter.name}</div>
          <div className={classes.record}>
            {fighter.record.wins}W · {fighter.record.losses}L
            {fighter.record.draws > 0 && ` · ${fighter.record.draws}D`}
          </div>
        </div>
      </div>
    )
  }
)

FighterVideoPanel.displayName = 'FighterVideoPanel'
export default FighterVideoPanel
