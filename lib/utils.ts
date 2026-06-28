export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents)
}

export function formatM2(value: number): string {
  return `${value.toLocaleString('nl-NL')} m²`
}

export function relatieveDatum(iso: string): string {
  const nu = Date.now()
  const dan = new Date(iso).getTime()
  const diff = Math.floor((nu - dan) / 1000)

  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)} minuten geleden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`

  const dagen = Math.floor(diff / 86400)
  if (dagen === 1) return 'gisteren'
  if (dagen < 7) return `${dagen} dagen geleden`
  if (dagen < 14) return 'vorige week'
  if (dagen < 30) return `${Math.floor(dagen / 7)} weken geleden`

  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
