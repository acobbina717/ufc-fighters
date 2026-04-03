import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Flip type file casing differs by platform
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip)

export { gsap, ScrollTrigger, SplitText, Flip, useGSAP }
