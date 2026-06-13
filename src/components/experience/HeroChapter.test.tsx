// Source/CSS invariants for the Hero Chapter polish (#42). The silhouette fade
// is GSAP-on-scroll — jsdom can't scrub a ScrollTrigger — so the wiring is
// asserted against the component source, per the established CardChapter /
// #15 pattern. The background + image treatment are pure CSS invariants.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const src = readFileSync('src/components/experience/HeroChapter.tsx', 'utf8')
const css = readFileSync('src/components/experience/HeroChapter.module.css', 'utf8')

describe('HeroChapter background (#42)', () => {
  it('drops the red radial-gradient — the hero base is plain light-dark only', () => {
    expect(css).not.toContain('radial-gradient')
    expect(css).toContain('light-dark(#fff, #000)')
  })

  it('renders the fighter PNG clean — no desaturating filter or blend treatment', () => {
    expect(css).not.toContain('mix-blend-mode')
    expect(css).not.toMatch(/filter:\s*grayscale/)
  })
})

describe('HeroChapter silhouette fade (#42)', () => {
  it('fades the silhouette out at the head of the scrubbed timeline (position 0)', () => {
    // Joins the existing scroll-hint / press-pass fade at timeline position 0 —
    // no new ScrollTrigger, no new timeline.
    expect(src).toMatch(
      /\[scrollHintRef\.current, pressPassRef\.current, silhouetteRef\.current\]/,
    )
    expect((src.match(/ScrollTrigger/g) ?? []).length).toBe(0) // still no explicit ST in source
  })

  it('keeps the silhouette visible under reduced motion (set, not faded)', () => {
    // The ref appears in both the reduced-motion gsap.set and the timeline fade.
    expect((src.match(/silhouetteRef\.current/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(src).toContain('const silhouetteRef = useRef')
  })
})
