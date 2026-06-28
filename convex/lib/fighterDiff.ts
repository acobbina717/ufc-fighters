// Pure diff logic for the patchFighter mutation. No Convex runtime imports —
// unit-tested with plain objects, matching the pattern in country.ts /
// postEventSync.ts / fighterHydrate.ts. The Convex mutation (fighters.ts)
// reads the existing fighter row and writes the resulting patch; this module
// just decides which fields actually changed.
//
// Replicates the original imperative handler exactly: scalar fields are guarded
// by the same conditions (photoUrl/weightClass/division use a truthy guard, so
// an empty-string incoming value is ignored; the rest use a strict
// !== undefined guard, so an empty string that differs IS patched). Nested
// record/stats are compared field-by-field and included whole if anything
// differs. lastSynced is included whenever it is provided.
export interface FighterRecord {
  wins: number
  losses: number
  draws: number
  noContests: number
}

export interface FighterStats {
  slpm: number
  strikingAccuracy: number
  sapm: number
  strikingDefense: number
  takedownAvg: number
  takedownAccuracy: number
  takedownDefense: number
  submissionAvg: number
}

export type Division = 'mens' | 'womens'

export interface ExistingFighter {
  ranking?: number
  photoUrl?: string
  nickname?: string
  weightClass?: string
  division?: Division
  record: FighterRecord
  stats: FighterStats
  weight?: string
  country?: string
}

export interface IncomingFighter {
  ranking?: number
  photoUrl?: string
  nickname?: string
  weightClass?: string
  division?: Division
  record?: FighterRecord
  stats?: FighterStats
  weight?: string
  country?: string
  lastSynced?: number
}

export type FighterPatch = Partial<Omit<ExistingFighter, 'record' | 'stats'>> & {
  record?: FighterRecord
  stats?: FighterStats
  lastSynced?: number
}

export function diffFighter(existing: ExistingFighter, incoming: IncomingFighter): FighterPatch {
  const patch: FighterPatch = {}

  if (incoming.ranking !== undefined && incoming.ranking !== existing.ranking)
    patch.ranking = incoming.ranking
  if (incoming.photoUrl && incoming.photoUrl !== existing.photoUrl)
    patch.photoUrl = incoming.photoUrl
  if (incoming.nickname !== undefined && incoming.nickname !== existing.nickname)
    patch.nickname = incoming.nickname
  if (incoming.weightClass && incoming.weightClass !== existing.weightClass)
    patch.weightClass = incoming.weightClass
  if (incoming.division && incoming.division !== existing.division)
    patch.division = incoming.division
  if (incoming.record) {
    const r = existing.record
    const n = incoming.record
    if (n.wins !== r.wins || n.losses !== r.losses || n.draws !== r.draws || n.noContests !== r.noContests)
      patch.record = incoming.record
  }
  if (incoming.stats) {
    const s = existing.stats
    const n = incoming.stats
    const changed = (Object.keys(n) as Array<keyof typeof n>).some((k) => n[k] !== s[k])
    if (changed) patch.stats = incoming.stats
  }
  if (incoming.weight !== undefined && incoming.weight !== existing.weight)
    patch.weight = incoming.weight
  if (incoming.country !== undefined && incoming.country !== existing.country)
    patch.country = incoming.country
  if (incoming.lastSynced !== undefined)
    patch.lastSynced = incoming.lastSynced

  return patch
}
