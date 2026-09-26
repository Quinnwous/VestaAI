/**
 * Pure logica voor `/woningen` v2 (item 10.1, docs/roadmap.md § Fase 10) —
 * sortering en de kaartweergave, los van React zodat ze mét vitest getest
 * zijn vóór de UI (CLAUDE.md § Conventies). Zoeken/fase/makelaar-filters
 * lopen server-side via de Supabase-query in `page.tsx` (net als v1) — bij
 * een portefeuille van deze schaal (tientallen tot enkele honderden dossiers
 * per kantoor) is dat sneller te bouwen én te reviewen dan een aparte
 * RPC-laag, en blijft de tabel- én kaartweergave altijd op dezelfde,
 * server-gefilterde set werken.
 */
import type { ObjectFase } from './schemas'

export type WoningenSortering = 'nieuwste' | 'oudste' | 'adres'

export const WONINGEN_SORTEER_OPTIES: { value: WoningenSortering; label: string }[] = [
  { value: 'nieuwste', label: 'Nieuwste eerst' },
  { value: 'oudste', label: 'Oudste eerst' },
  { value: 'adres', label: 'Adres (a-z)' },
]

/** Zet een geldige sorteeroptie om naar een Supabase `.order()`-aanroep; onherkenbare invoer valt terug op "nieuwste". */
export function sorteerOptieNaarOrderBy(sorteer: string): { column: 'created_at' | 'address'; ascending: boolean } {
  if (sorteer === 'oudste') return { column: 'created_at', ascending: true }
  if (sorteer === 'adres') return { column: 'address', ascending: true }
  return { column: 'created_at', ascending: false }
}

/**
 * Bounding box `[[minLng,minLat],[maxLng,maxLat]]` voor `<BasisKaart bounds=…>`
 * over alle zichtbare woningpunten. Eén punt (of allemaal identiek) krijgt een
 * kleine minimumspreiding (~350 m) mee zodat `fitBounds` niet tot op
 * huisnummerniveau inzoomt — een straatnaam moet nog leesbaar zijn. `null`
 * zonder punten (kaart houdt dan zijn eigen standaardcentrum aan).
 */
export function berekenKaartBounds(
  punten: { lat: number; lng: number }[],
): [[number, number], [number, number]] | null {
  if (punten.length === 0) return null

  let minLat = punten[0].lat
  let maxLat = punten[0].lat
  let minLng = punten[0].lng
  let maxLng = punten[0].lng
  for (const p of punten) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }

  const MIN_SPREIDING = 0.006 // ≈ 350-450 m op de breedtegraad van Wassenaar
  if (maxLat - minLat < MIN_SPREIDING) {
    const midden = (minLat + maxLat) / 2
    minLat = midden - MIN_SPREIDING / 2
    maxLat = midden + MIN_SPREIDING / 2
  }
  if (maxLng - minLng < MIN_SPREIDING) {
    const midden = (minLng + maxLng) / 2
    minLng = midden - MIN_SPREIDING / 2
    maxLng = midden + MIN_SPREIDING / 2
  }

  return [[minLng, minLat], [maxLng, maxLat]]
}

/** Aantal dossiers per fase, voor de teller op elke fase-tab. Ontbrekende fases tellen als 0. */
export function telPerFase(rijen: { fase: ObjectFase }[]): Record<ObjectFase, number> {
  const telling: Record<ObjectFase, number> = { verkoopadvies: 0, in_verkoop: 0, verkocht: 0 }
  for (const r of rijen) {
    if (r.fase in telling) telling[r.fase] += 1
  }
  return telling
}
