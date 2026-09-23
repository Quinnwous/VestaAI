'use server'

/**
 * Server actions voor de concurrentie-explorer v2 (item 6.3): ververst de
 * regionale aggregaties (RPC's, migratie `20260924_rpc_concurrentie_v2.sql`
 * — nog niet toegepast) op elke filterwijziging, zonder de pagina te
 * herladen. Dit is de enige plek buiten `lib/transactiesQuery.ts` die deze
 * RPC-wrappers aanroept — de eigenlijke `.rpc(...)`-aanroepen blijven daar
 * (guard-test).
 *
 * Elke RPC afzonderlijk met `.catch(() => null)`: zolang de migratie niet is
 * toegepast geeft de database "function does not exist" terug. `null` per
 * blok laat de rest van de pagina gewoon werken — de explorer toont per blok
 * een nette "nog niet beschikbaar"-melding i.p.v. de hele pagina te laten
 * crashen (DoD-eis, zie roadmap.md § 4).
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import {
  concurrentieRanglijst,
  concurrentieWijVsMarkt,
  concurrentieAandeelJaar,
  concurrentieMatrix,
  concurrentieProfiel,
} from '@/lib/transactiesQuery'
import type { RanglijstRij, WijVsMarkt, AandeelJaarRij, MatrixCel, ConcurrentProfielV2 } from '@/lib/concurrentie'
import type { TransactieFilter } from '@/lib/schemas'

export type ConcurrentieData = {
  /** `null` = RPC (nog) niet beschikbaar. */
  ranglijst: RanglijstRij[] | null
  wijVsMarkt: WijVsMarkt | null
  /** Alle kantoren, alle jaren — de explorer kiest zelf "wij" + top 3 concurrenten voor de trendgrafiek. */
  aandeelJaar: AandeelJaarRij[] | null
  matrix: MatrixCel[] | null
}

/**
 * `filters` geldt voor de tegels/wij-vs-markt/matrix; `filtersZonderPeriode`
 * voor de trendgrafiek (marktaandeel per jaar), die het periodefilter bewust
 * negeert (roadmap 6.3). `opWijkniveau` = de matrix splitst naar wijk zodra
 * de explorer precies één plaats geselecteerd heeft.
 */
export async function haalConcurrentieData(
  filters: TransactieFilter,
  filtersZonderPeriode: TransactieFilter,
  opWijkniveau: boolean,
): Promise<ConcurrentieData> {
  const supabase = createServerSupabaseClient()
  const [ranglijst, wijVsMarktData, aandeelJaar, matrix] = await Promise.all([
    concurrentieRanglijst(supabase, filters).catch(() => null),
    concurrentieWijVsMarkt(supabase, filters).catch(() => null),
    concurrentieAandeelJaar(supabase, filtersZonderPeriode).catch(() => null),
    concurrentieMatrix(supabase, filters, opWijkniveau).catch(() => null),
  ])
  return { ranglijst, wijVsMarkt: wijVsMarktData, aandeelJaar, matrix }
}

/** Concurrentprofiel voor de drawer, op aanvraag (klik op een kantoor) — `null` bij een nog niet toegepaste migratie. */
export async function haalConcurrentProfiel(filters: TransactieFilter, kantoor: string): Promise<ConcurrentProfielV2 | null> {
  const supabase = createServerSupabaseClient()
  return concurrentieProfiel(supabase, filters, kantoor).catch(() => null)
}
