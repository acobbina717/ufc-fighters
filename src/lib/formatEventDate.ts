const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const

/**
 * Formats an epoch-ms timestamp as an uppercase `MON D · YYYY` string
 * (e.g. `APR 18 · 2026`), used by the Hero press pass and the
 * FighterCard NEXT FIGHT badge. Pure; uses local time.
 */
export function formatEventDate(ms: number): string {
  const d = new Date(ms)
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${d.getFullYear()}`
}
