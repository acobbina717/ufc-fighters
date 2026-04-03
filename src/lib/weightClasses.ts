// abbr added in Phase 3 for the DivisionProgressBar track labels.
// Men's Strawweight + Women's Featherweight added to complete all 13 UFC divisions.
export interface WeightClassDef {
  key: string
  label: string
  division: 'mens' | 'womens'
  shortLabel: string
  abbr: string
  weightLimit: string
}

export const MENS_DIVISIONS: WeightClassDef[] = [
  { key: 'mens-flyweight',        label: "Men's Flyweight",         shortLabel: 'Flyweight',        abbr: 'FLW',  division: 'mens',   weightLimit: '125 lbs' },
  { key: 'mens-bantamweight',     label: "Men's Bantamweight",      shortLabel: 'Bantamweight',     abbr: 'BW',   division: 'mens',   weightLimit: '135 lbs' },
  { key: 'mens-featherweight',    label: "Men's Featherweight",     shortLabel: 'Featherweight',    abbr: 'FW',   division: 'mens',   weightLimit: '145 lbs' },
  { key: 'mens-lightweight',      label: "Men's Lightweight",       shortLabel: 'Lightweight',      abbr: 'LW',   division: 'mens',   weightLimit: '155 lbs' },
  { key: 'mens-welterweight',     label: "Men's Welterweight",      shortLabel: 'Welterweight',     abbr: 'WW',   division: 'mens',   weightLimit: '170 lbs' },
  { key: 'mens-middleweight',     label: "Men's Middleweight",      shortLabel: 'Middleweight',     abbr: 'MW',   division: 'mens',   weightLimit: '185 lbs' },
  { key: 'mens-lightheavyweight', label: "Men's Light Heavyweight", shortLabel: 'Lt. Heavyweight',  abbr: 'LHW',  division: 'mens',   weightLimit: '205 lbs' },
  { key: 'mens-heavyweight',      label: "Men's Heavyweight",       shortLabel: 'Heavyweight',      abbr: 'HW',   division: 'mens',   weightLimit: '265 lbs' },
]

export const WOMENS_DIVISIONS: WeightClassDef[] = [
  { key: 'womens-strawweight',    label: "Women's Strawweight",     shortLabel: 'Strawweight',      abbr: 'STW',  division: 'womens', weightLimit: '115 lbs' },
  { key: 'womens-flyweight',      label: "Women's Flyweight",       shortLabel: 'Flyweight',        abbr: 'FLW',  division: 'womens', weightLimit: '125 lbs' },
  { key: 'womens-bantamweight',   label: "Women's Bantamweight",    shortLabel: 'Bantamweight',     abbr: 'BW',   division: 'womens', weightLimit: '135 lbs' },
  { key: 'womens-featherweight',  label: "Women's Featherweight",   shortLabel: 'Featherweight',    abbr: 'FW',   division: 'womens', weightLimit: '145 lbs' },
]
