import type { SupabaseClient } from '@supabase/supabase-js'
import type { ObjectFase } from './schemas'

/**
 * Gebruikslogboek (item 10.4, docs/roadmap.md § Fase 10): legt vast dat een
 * makelaar iets deed in de app — vooralsnog alleen het openen van een
 * dossier — en voedt daarmee "Recent bekeken" op /dashboard.
 *
 * Tabel `gebruik_events` bestaat pas nadat de hoofdsessie de bijbehorende
 * migratie (`supabase/migrations/20260923_gebruik_events.sql`) toepast via
 * `apply_migration` — dit bestand schrijft die migratie, past hem niet toe.
 * Tot die tijd faalt elke query hier op "relation … does not exist"; alle
 * functies vangen dat stil af (console.warn, nooit een pagina laten
 * crashen) zodat de rest van de app gewoon blijft werken.
 */

/** Vaste set — moet gelijk blijven aan de check-constraint in de migratie. */
export const GEBRUIK_EVENT_TYPES = ['dossier_bekeken'] as const
export type GebruikEventType = (typeof GEBRUIK_EVENT_TYPES)[number]

export type GebruikEvent = {
  kantoorId: string
  makelaarId: string
  /** Ontbreekt bij een event dat niet aan één dossier hangt (nu nog niet van toepassing). */
  objectId?: string | null
  type: GebruikEventType
}

/**
 * Legt één gebruiksevent vast. Server-only (importeer nooit vanuit een
 * client component — geef `supabase` altijd de sessie-gebonden client mee,
 * zodat RLS de kantoorscheiding regelt) en fire-and-forget: de aanroeper
 * hoeft dit niet te awaiten, en zelfs als hij dat wel doet gooit deze
 * functie nooit een fout die de pagina zou breken.
 */
export async function logGebruik(supabase: SupabaseClient, event: GebruikEvent): Promise<void> {
  try {
    const { error } = await supabase.from('gebruik_events').insert({
      kantoor_id: event.kantoorId,
      makelaar_id: event.makelaarId,
      object_id: event.objectId ?? null,
      type: event.type,
    })
    if (error) console.warn('[gebruik] kon event niet loggen:', error.message)
  } catch (err) {
    console.warn('[gebruik] kon event niet loggen:', err)
  }
}

export type RecentBekekenRij = {
  objectId: string
  address: string
  fase: ObjectFase
  /** ISO-tijdstip van het gebruik_event (niet van het dossier zelf). */
  bekekenOp: string
}

type RuweGebeurtenisRij = {
  object_id: string | null
  created_at: string
  objecten: { address: string; fase: ObjectFase } | { address: string; fase: ObjectFase }[] | null
}

/**
 * Haalt de "dossier_bekeken"-events van één makelaar op, nieuwste eerst,
 * met adres/fase van het bijbehorende dossier erbij (PostgREST-embed op de
 * foreign key naar objecten — zelfde patroon als de kantoor-embed in
 * lib/haalIngelogdeMakelaar.tsx). RLS beperkt dit al tot het eigen kantoor;
 * het `.eq('makelaar_id', …)`-filter hieronder beperkt het verder tot de
 * eigen kijkgeschiedenis, niet die van collega's.
 *
 * Geeft een lege lijst bij elke queryfout — inclusief een tabel die nog niet
 * bestaat — zodat RecentBekeken gewoon zijn lege staat toont i.p.v. de hele
 * startpagina te laten crashen.
 */
export async function haalRecentBekekenOp(
  supabase: SupabaseClient,
  makelaarId: string,
  limiet = 20,
): Promise<RecentBekekenRij[]> {
  try {
    const { data, error } = await supabase
      .from('gebruik_events')
      .select('object_id, created_at, objecten(address, fase)')
      .eq('makelaar_id', makelaarId)
      .eq('type', 'dossier_bekeken' satisfies GebruikEventType)
      .not('object_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limiet)

    if (error) {
      console.warn('[gebruik] kon recent-bekeken niet ophalen:', error.message)
      return []
    }

    return ((data as RuweGebeurtenisRij[] | null) ?? [])
      .map((rij): RecentBekekenRij | null => {
        if (!rij.object_id || !rij.objecten) return null
        // Supabase-JS typeert een embed op een *-1-relatie soms als array —
        // in de praktijk levert PostgREST hier altijd één object (object_id
        // is niet-nullable met een foreign key naar objecten.id).
        const object = Array.isArray(rij.objecten) ? rij.objecten[0] : rij.objecten
        if (!object) return null
        return { objectId: rij.object_id, address: object.address, fase: object.fase, bekekenOp: rij.created_at }
      })
      .filter((r): r is RecentBekekenRij => r !== null)
  } catch (err) {
    console.warn('[gebruik] kon recent-bekeken niet ophalen:', err)
    return []
  }
}

/**
 * Dedupliceert op dossier (houdt alleen het meest recente event per
 * object_id) en knipt af op `limiet`. Puur en test baar — verwacht invoer die
 * al aflopend op `bekekenOp` gesorteerd is, zoals haalRecentBekekenOp()
 * aanlevert (de database sorteert, niet deze functie).
 */
export function dedupliceerRecentBekeken(rijen: RecentBekekenRij[], limiet = 5): RecentBekekenRij[] {
  const gezien = new Set<string>()
  const resultaat: RecentBekekenRij[] = []
  for (const rij of rijen) {
    if (gezien.has(rij.objectId)) continue
    gezien.add(rij.objectId)
    resultaat.push(rij)
    if (resultaat.length >= limiet) break
  }
  return resultaat
}

/**
 * "X geleden" voor Recent bekeken. Zelfde granulariteit als
 * lib/utils.ts' relatieveDatum, maar met een expliciete `nu` i.p.v. intern
 * Date.now() — zie CLAUDE.md ⚠️ "Nooit new Date() in een client component":
 * de dashboardpagina rekent dit één keer server-side uit (met de `nu` die
 * hij toch al heeft) en geeft de kant-en-klare tekst door als prop, zodat
 * server en client altijd dezelfde string renderen.
 */
export function relatieveTijdVoorGebruik(iso: string, nu: Date): string {
  const diffSec = Math.floor((nu.getTime() - new Date(iso).getTime()) / 1000)
  if (diffSec < 60) return 'zojuist'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minuten geleden`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} uur geleden`

  const dagen = Math.floor(diffSec / 86400)
  if (dagen === 1) return 'gisteren'
  if (dagen < 7) return `${dagen} dagen geleden`
  if (dagen < 14) return 'vorige week'
  if (dagen < 30) return `${Math.floor(dagen / 7)} weken geleden`

  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}
