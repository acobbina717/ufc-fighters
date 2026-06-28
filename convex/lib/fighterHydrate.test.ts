import { afterEach, describe, expect, it, vi } from 'vitest'
import { hydrateFighter, type StorageLike } from './fighterHydrate'

// ─── Synthetic HTML builders ──────────────────────────────────────────────────
// Minimal markup that satisfies the parsers' regexes — not real UFC pages.

// Athlete page with an optional full-body image and an optional Place of Birth
// block ("City, Country" — the field UFC now uses instead of Nationality).
function athletePage(opts: { fullBody?: string; placeOfBirth?: string } = {}): string {
  const img = opts.fullBody
    ? `<img src="${opts.fullBody}" />`
    : ''
  const pob = opts.placeOfBirth
    ? `<div class="c-bio__field"><div class="c-bio__label">Place of Birth</div>` +
      `<div class="c-bio__text">${opts.placeOfBirth}</div></div>`
    : ''
  return `<html><body>${img}${pob}</body></html>`
}

// One ufcstats search result row. searchUfcStats needs ≥10 <td> cells with
// cells[0]=given-name anchor (href contains fighter-details), cells[1]=family,
// cells[2]=nickname, cells[7/8/9]=W/L/D.
function searchPage(opts: {
  detailsUrl: string
  given: string
  family: string
  nickname?: string
  wins: number
  losses: number
  draws: number
}): string {
  const cells = [
    `<a href="${opts.detailsUrl}" class="b-link b-link_style_black">${opts.given}</a>`,
    opts.family,
    opts.nickname ?? '',
    '', '', '', '', // cells[3..6] — unused weight/height/etc columns
    String(opts.wins),
    String(opts.losses),
    String(opts.draws),
  ]
  const tds = cells.map((c) => `<td class="b-statistics__table-col">${c}</td>`).join('')
  return `<table><tbody><tr class="b-statistics__table-row" onclick="fighter-details">${tds}</tr></tbody></table>`
}

// ufcstats search page with no matching fighter row.
function emptySearchPage(): string {
  return `<table><tbody></tbody></table>`
}

// Fighter detail page with the bio stat list searchUfcStats's hit then parses.
function detailPage(): string {
  const item = (label: string, val: string) =>
    `<li class="b-list__box-list-item b-list__box-list-item_type_block">${label}: ${val}</li>`
  return `<html><body>` +
    `<p class="b-content__Nickname">The Eagle</p>` +
    `<ul class="b-list__box-list">` +
    item('SLpM', '4.10') +
    item('Str. Acc.', '49%') +
    item('SApM', '1.75') +
    item('Str. Def', '57%') +
    item('TD Avg.', '5.36') +
    item('TD Acc.', '48%') +
    item('TD Def.', '85%') +
    item('Sub. Avg.', '0.80') +
    item('Weight', '155 lbs.') +
    `</ul></body></html>`
}

// ─── fetch + storage mocks ────────────────────────────────────────────────────
const DETAILS_URL = 'http://www.ufcstats.com/fighter-details/abc123'

// Builds a fetch stub that dispatches by URL substring. `responses` lets a test
// override the body returned for athlete / search / detail requests.
function stubFetch(responses: {
  athlete?: string
  search?: string
  detail?: string
  photoOk?: boolean
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input)
      // Photo download (the full-body image URL).
      if (url.includes('/images/styles/athlete_bio_full_body/')) {
        return responses.photoOk === false
          ? new Response(null, { status: 404 })
          : new Response(new Blob(['img-bytes']), { status: 200 })
      }
      if (url.includes('ufcstats.com') && url.includes('/search')) {
        return new Response(responses.search ?? emptySearchPage(), { status: 200 })
      }
      if (url.includes('fighter-details')) {
        return new Response(responses.detail ?? detailPage(), { status: 200 })
      }
      if (url.includes('ufc.com/athlete/')) {
        return new Response(responses.athlete ?? athletePage(), { status: 200 })
      }
      return new Response(null, { status: 404 })
    }),
  )
}

// Mock store: hands back a deterministic served URL for any stored blob.
const STORED_URL = 'https://files.convex.dev/stored-photo'
const mockStorage: StorageLike = {
  store: async () => 'storage-id-1',
  getUrl: async () => STORED_URL,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hydrateFighter', () => {
  it('extracts the full-body photo through storage', async () => {
    stubFetch({
      athlete: athletePage({
        fullBody: 'https://ufc.com/images/styles/athlete_bio_full_body/khabib.png',
      }),
    })

    const h = await hydrateFighter(mockStorage, 'khabib-nurmagomedov', 'Khabib Nurmagomedov')

    expect(h.photoUrl).toBe(STORED_URL)
  })

  it('leaves photoUrl undefined when the athlete page has no full-body image', async () => {
    stubFetch({ athlete: athletePage() })

    const h = await hydrateFighter(mockStorage, 'no-photo', 'No Photo')

    expect(h.photoUrl).toBeUndefined()
  })

  it('extracts the country from the Place of Birth block', async () => {
    stubFetch({ athlete: athletePage({ placeOfBirth: 'Makhachkala, Dagestan, Russia' }) })

    const h = await hydrateFighter(mockStorage, 'khabib-nurmagomedov', 'Khabib Nurmagomedov')

    expect(h.country).toBe('Russia')
  })

  it('leaves country undefined when no Place of Birth block is present', async () => {
    stubFetch({ athlete: athletePage() })

    const h = await hydrateFighter(mockStorage, 'unknown', 'Unknown Fighter')

    expect(h.country).toBeUndefined()
  })

  it('returns zeros and falls back to the athlete URL on a ufcstats miss', async () => {
    stubFetch({
      athlete: athletePage({ placeOfBirth: 'Houston, United States' }),
      search: emptySearchPage(),
    })

    const h = await hydrateFighter(mockStorage, 'jane-doe', 'Jane Doe')

    expect(h.wins).toBe(0)
    expect(h.losses).toBe(0)
    expect(h.draws).toBe(0)
    expect(h.ufcStatsUrl).toBe('https://www.ufc.com/athlete/jane-doe')
    expect(h.stats).toEqual({
      slpm: 0, strikingAccuracy: 0, sapm: 0, strikingDefense: 0,
      takedownAvg: 0, takedownAccuracy: 0, takedownDefense: 0, submissionAvg: 0,
    })
    // The bug fix: country is still populated on the no-ufcstats path.
    expect(h.country).toBe('United States')
  })

  it('populates record and stats on a ufcstats hit', async () => {
    stubFetch({
      athlete: athletePage({ placeOfBirth: 'Makhachkala, Russia' }),
      search: searchPage({
        detailsUrl: DETAILS_URL,
        given: 'Khabib',
        family: 'Nurmagomedov',
        nickname: 'The Eagle',
        wins: 29,
        losses: 0,
        draws: 0,
      }),
      detail: detailPage(),
    })

    const h = await hydrateFighter(mockStorage, 'khabib-nurmagomedov', 'Khabib Nurmagomedov')

    expect(h.ufcStatsUrl).toBe(DETAILS_URL)
    expect(h.wins).toBe(29)
    expect(h.losses).toBe(0)
    expect(h.draws).toBe(0)
    expect(h.nickname).toBe('The Eagle')
    expect(h.weight).toBe('155 lbs')
    expect(h.stats).toEqual({
      slpm: 4.1, strikingAccuracy: 49, sapm: 1.75, strikingDefense: 57,
      takedownAvg: 5.36, takedownAccuracy: 48, takedownDefense: 85, submissionAvg: 0.8,
    })
  })
})
