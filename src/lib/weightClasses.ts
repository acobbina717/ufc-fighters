export type Gender = 'mens' | 'womens'

export interface WeightClassDef {
  key: string
  label: string
  division: 'mens' | 'womens'
  shortLabel: string
  abbr: string
  weightLimit: string
  /** Lower bound of the division. Empty string means the division has no floor (e.g. Strawweight). */
  weightFloor: string
}

export const MENS_DIVISIONS: WeightClassDef[] = [
  { key: 'mens-flyweight',        label: "Men's Flyweight",         shortLabel: 'Flyweight',        abbr: 'FLW',  division: 'mens',   weightLimit: '125 lbs', weightFloor: '116 lbs' },
  { key: 'mens-bantamweight',     label: "Men's Bantamweight",      shortLabel: 'Bantamweight',     abbr: 'BW',   division: 'mens',   weightLimit: '135 lbs', weightFloor: '126 lbs' },
  { key: 'mens-featherweight',    label: "Men's Featherweight",     shortLabel: 'Featherweight',    abbr: 'FW',   division: 'mens',   weightLimit: '145 lbs', weightFloor: '136 lbs' },
  { key: 'mens-lightweight',      label: "Men's Lightweight",       shortLabel: 'Lightweight',      abbr: 'LW',   division: 'mens',   weightLimit: '155 lbs', weightFloor: '146 lbs' },
  { key: 'mens-welterweight',     label: "Men's Welterweight",      shortLabel: 'Welterweight',     abbr: 'WW',   division: 'mens',   weightLimit: '170 lbs', weightFloor: '156 lbs' },
  { key: 'mens-middleweight',     label: "Men's Middleweight",      shortLabel: 'Middleweight',     abbr: 'MW',   division: 'mens',   weightLimit: '185 lbs', weightFloor: '171 lbs' },
  { key: 'mens-lightheavyweight', label: "Men's Light Heavyweight", shortLabel: 'Lt. Heavyweight',  abbr: 'LHW',  division: 'mens',   weightLimit: '205 lbs', weightFloor: '186 lbs' },
  { key: 'mens-heavyweight',      label: "Men's Heavyweight",       shortLabel: 'Heavyweight',      abbr: 'HW',   division: 'mens',   weightLimit: '265 lbs', weightFloor: '206 lbs' },
]

export const WOMENS_DIVISIONS: WeightClassDef[] = [
  { key: 'womens-strawweight',    label: "Women's Strawweight",     shortLabel: 'Strawweight',      abbr: 'STW',  division: 'womens', weightLimit: '115 lbs', weightFloor: '' },
  { key: 'womens-flyweight',      label: "Women's Flyweight",       shortLabel: 'Flyweight',        abbr: 'FLW',  division: 'womens', weightLimit: '125 lbs', weightFloor: '116 lbs' },
  { key: 'womens-bantamweight',   label: "Women's Bantamweight",    shortLabel: 'Bantamweight',     abbr: 'BW',   division: 'womens', weightLimit: '135 lbs', weightFloor: '126 lbs' },
  { key: 'womens-featherweight',  label: "Women's Featherweight",   shortLabel: 'Featherweight',    abbr: 'FW',   division: 'womens', weightLimit: '145 lbs', weightFloor: '136 lbs' },
]

/**
 * Formats a division's weight range for display, e.g. "206 – 265 LBS".
 * Divisions with no floor (empty weightFloor) render as "UP TO 115 LBS".
 */
export function formatWeightRange(def: WeightClassDef): string {
  const limit = parseInt(def.weightLimit, 10)
  if (def.weightFloor === '') return `UP TO ${limit} LBS`
  const floor = parseInt(def.weightFloor, 10)
  return `${floor} – ${limit} LBS`
}
