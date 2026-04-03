/**
 * MatchupView — full-screen split-screen fighter matchup layout.
 *
 * Layout:
 *   [ Fighter A panel ] [ VS divider ] [ Fighter B panel ]
 *
 * Mirroring:
 *   The right panel wrapper is flipped with scaleX(-1) so Fighter B faces
 *   left (toward center). All children inside are un-mirrored so text and
 *   video content still reads correctly.
 *
 * Synchronized playback:
 *   Neither video starts until both panels have signalled "ready" (buffered
 *   or no video available). This keeps intros in sync for both fighters.
 *
 * Auto-generation:
 *   Each FighterVideoPanel independently submits a fal.ai job if no video
 *   exists yet — no need to wait for the other fighter to be selected.
 */

import { useState, useRef, useEffect } from 'react'
import FighterSearch from './FighterSearch'
import FighterVideoPanel, { type FighterVideoPanelHandle } from './FighterVideoPanel'
import type { Doc } from '../../convex/_generated/dataModel'
import classes from './MatchupView.module.css'

export default function MatchupView() {
  const [fighterA, setFighterA] = useState<Doc<'fighters'> | null>(null)
  const [fighterB, setFighterB] = useState<Doc<'fighters'> | null>(null)

  // Imperative handles let us call play() on the video elements directly
  const panelARef = useRef<FighterVideoPanelHandle>(null)
  const panelBRef = useRef<FighterVideoPanelHandle>(null)

  // Track which panels have finished buffering — reset when either fighter changes
  const readyRef = useRef({ a: false, b: false })

  useEffect(() => {
    readyRef.current = { a: false, b: false }
  }, [fighterA?._id, fighterB?._id])

  // Called by each panel when it's ready to play (or when it has no video).
  // Only triggers playback once both panels are ready AND both fighters are selected.
  function handleReady(side: 'a' | 'b') {
    readyRef.current[side] = true
    if (fighterA && fighterB && readyRef.current.a && readyRef.current.b) {
      panelARef.current?.play()
      panelBRef.current?.play()
    }
  }

  return (
    <div className={classes.root}>
      {/* ── Fighter selector bar ── */}
      <div className={classes.selector}>
        <FighterSearch
          label="Fighter A"
          value={fighterA}
          onChange={setFighterA}
          exclude={fighterB?._id}  // prevent selecting the same fighter on both sides
        />
        <div className={classes.selectorLabel}>VS</div>
        <FighterSearch
          label="Fighter B"
          value={fighterB}
          onChange={setFighterB}
          exclude={fighterA?._id}
        />
      </div>

      {/* ── Split-screen arena ── */}
      <div className={classes.arena}>

        {/* Left panel — normal orientation */}
        <div className={classes.panelLeft}>
          {fighterA ? (
            <FighterVideoPanel
              ref={panelARef}
              fighter={fighterA}
              onReady={() => handleReady('a')}
            />
          ) : (
            <div className={classes.emptyPanel}>
              <span className={classes.emptyPanelHint}>Select Fighter A</span>
            </div>
          )}
        </div>

        {/* Center VS divider */}
        <div className={classes.vsDivider}>
          <div className={classes.vsLine} />
          <span className={classes.vsText}>VS</span>
          <div className={classes.vsLine} />
        </div>

        {/* Right panel — wrapper is mirrored so fighter faces center;
            CSS un-mirrors the children so content is still readable */}
        <div className={classes.panelRight}>
          {fighterB ? (
            <FighterVideoPanel
              ref={panelBRef}
              fighter={fighterB}
              onReady={() => handleReady('b')}
            />
          ) : (
            <div className={classes.emptyPanel}>
              <span className={classes.emptyPanelHint}>Select Fighter B</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
