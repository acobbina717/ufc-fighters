import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Flip type file casing differs by platform
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip)

/** Coalesce ScrollTrigger.refresh() to one call per animation frame (e.g. multiple chapters loading). */
let scrollTriggerRefreshRaf: number | null = null

export function scheduleScrollTriggerRefresh(): void {
  if (scrollTriggerRefreshRaf !== null) return
  scrollTriggerRefreshRaf = requestAnimationFrame(() => {
    scrollTriggerRefreshRaf = null
    ScrollTrigger.refresh()
  })
}

export { gsap, ScrollTrigger, SplitText, Flip, useGSAP }
