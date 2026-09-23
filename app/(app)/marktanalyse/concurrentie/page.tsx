import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { KantoorInstellingenSchema } from '@/lib/schemas'
import { plaatsenWijken, dataTotEnMet, type PlaatsWijkRij } from '@/lib/transactiesQuery'
import { standaardConcurrentieFilter, concurrentieFilterNaarTransactieFilter, concurrentieFilterZonderPeriode } from '@/lib/concurrentie'
import { ConcurrentieExplorer } from '@/components/ConcurrentieExplorer'
import { haalConcurrentieData } from './actions'

export const metadata = { title: 'Concurrentie' }

/**
 * Concurrentieanalyse v2 (item 6.3, docs/roadmap.md § 5 Fase 6 — port van
 * `docs/ontwerp/concurrentie.html`). Werkt volledig via de RPC's op
 * `verkopend_kantoor_norm` (patroon 2, § 3.1) — geen enkele rij komt meer
 * client-side binnen (was ~5,5 s via `haalTransactiesVoorVerkenner`, nu de
 * geaggregeerde tegels/matrix/ranglijst al vóór de eerste paint). De
 * standaardfilter (werkgebied van het kantoor) wordt hier al opgehaald zodat
 * de pagina meteen met cijfers rendert; elke volgende filterwijziging
 * ververst via de server actions in `actions.ts` vanuit de client component.
 *
 * ⚠️ De RPC's in `supabase/migrations/20260924_rpc_concurrentie_v2.sql` zijn
 * nog niet toegepast — tot dat gebeurt geeft elk blok een "nog niet
 * beschikbaar"-melding i.p.v. de pagina te laten crashen (zie actions.ts en
 * ConcurrentieExplorer.tsx).
 */
export default async function ConcurrentieAnalysePage() {
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  const service = createServiceSupabaseClient()
  const sessie = createServerSupabaseClient()

  const [{ data: kantoorRow }, dataTot] = await Promise.all([
    service.from('kantoren').select('instellingen_json').eq('id', makelaar.kantoorId).single(),
    dataTotEnMet(sessie),
  ])

  const instellingenGeparsed = KantoorInstellingenSchema.safeParse(kantoorRow?.instellingen_json ?? {})
  const werkgebiedPlaatsen = instellingenGeparsed.success ? instellingenGeparsed.data.werkgebied?.plaatsen ?? [] : []

  // `transacties_plaatsen_wijken` staat klaar sinds item 6.1 (migratie
  // 20260923_marktanalyse_verdeling_en_plaatsen.sql) — val terug op het
  // werkgebied zodat de plaats-dropdown nooit leeg is als de RPC om wat voor
  // reden dan ook faalt.
  let plaatsenLijst: PlaatsWijkRij[]
  try {
    plaatsenLijst = await plaatsenWijken(sessie)
  } catch {
    plaatsenLijst = werkgebiedPlaatsen.map(plaats => ({ plaats, wijk: null, n: 0 }))
  }

  const standaardFilter = standaardConcurrentieFilter(werkgebiedPlaatsen)
  const rpcFilter = concurrentieFilterNaarTransactieFilter(standaardFilter, { datumTot: dataTot.laatsteVerkoopdatum })
  const rpcFilterZonderPeriode = concurrentieFilterZonderPeriode(standaardFilter)
  const opWijkniveau = standaardFilter.plaatsen.length === 1

  const initieel = await haalConcurrentieData(rpcFilter, rpcFilterZonderPeriode, opWijkniveau)

  return (
    <ConcurrentieExplorer
      werkgebiedPlaatsen={werkgebiedPlaatsen}
      plaatsenLijst={plaatsenLijst}
      dataTotEnMet={dataTot.laatsteVerkoopdatum}
      initieel={initieel}
    />
  )
}
