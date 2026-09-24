import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { KantoorInstellingenSchema } from '@/lib/schemas'
import {
  haalEigenVerkopen,
  zoekTransacties,
  marktanalyseSamenvatting,
  plaatsenWijken,
  dataTotEnMet,
  ALLE_TRANSACTIE_KOLOMMEN,
  type PlaatsWijkRij,
} from '@/lib/transactiesQuery'
import {
  standaardTransactiesFilterState,
  transactiesFilterNaarTransactieFilter,
  sorteringVoorRpc,
  PER_PAGINA,
} from '@/lib/transactiesZoeken'
import type { TransactieRow } from '@/lib/supabase'
import { TransactiesZoeken } from '@/components/TransactiesZoeken'

export const metadata = { title: 'Transacties opzoeken' }

/**
 * Transacties opzoeken v2 (item 6.2, docs/roadmap.md § 5 Fase 6 — port van
 * `docs/ontwerp/transacties.html`). Vervangt de tussenfase-implementatie van
 * item 2.2: geen `haalTransactiesVoorVerkenner` meer (haalde de hele,
 * niet-uitgesloten dataset op — ~6-7 s bij duizenden rijen), maar:
 *  - de eigen verkopen één keer, compact (patroon 1, ≤ 2.000 rijen) — voor de
 *    "alleen eigen verkopen"-schakelaar en de client-side CSV-export
 *    (`lib/transactiesZoeken.ts` `filtreerEigenVoorExport`);
 *  - de eerste pagina + tegelrij-samenvatting via de RPC's (patroon 2), voor
 *    de standaardfilter (werkgebied van het kantoor) al vóór de eerste paint;
 *    elke volgende filter-/sorteer-/paginawijziging ververst via de server
 *    action `actions.ts` (`haalTransactiesData`) vanuit de client component.
 * Prestatie-eis: < ~1,5 s (was ~6-7 s).
 */
export default async function TransactiesPage() {
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  const service = createServiceSupabaseClient()
  const sessie = createServerSupabaseClient()

  const [{ data: kantoorRow }, eigenVerkopen, dataTot] = await Promise.all([
    service.from('kantoren').select('name, instellingen_json').eq('id', makelaar.kantoorId).single(),
    haalEigenVerkopen<TransactieRow>(sessie, ALLE_TRANSACTIE_KOLOMMEN),
    dataTotEnMet(sessie),
  ])

  const instellingenGeparsed = KantoorInstellingenSchema.safeParse(kantoorRow?.instellingen_json ?? {})
  const werkgebiedPlaatsen = instellingenGeparsed.success ? instellingenGeparsed.data.werkgebied?.plaatsen ?? [] : []
  const kantoorNaam = (kantoorRow?.name as string | undefined) ?? 'ons kantoor'

  // `transacties_plaatsen_wijken` (migratie 20260923_marktanalyse_verdeling_en_plaatsen.sql,
  // toegepast op 23 sep) — val terug op het werkgebied als de RPC onverhoopt ontbreekt.
  let plaatsenLijst: PlaatsWijkRij[]
  try {
    plaatsenLijst = await plaatsenWijken(sessie)
  } catch {
    plaatsenLijst = werkgebiedPlaatsen.map(plaats => ({ plaats, wijk: null, n: 0 }))
  }

  const standaardFilter = standaardTransactiesFilterState(werkgebiedPlaatsen)
  const rpcFilter = transactiesFilterNaarTransactieFilter(standaardFilter, { datumTot: dataTot.laatsteVerkoopdatum })
  const sortering = sorteringVoorRpc(standaardFilter.sortKey, standaardFilter.sortDir)

  const [resultaat, samenvatting] = await Promise.all([
    zoekTransacties(sessie, rpcFilter, { sortering, limiet: PER_PAGINA, offset: 0 }),
    marktanalyseSamenvatting(sessie, rpcFilter),
  ])

  return (
    <TransactiesZoeken
      werkgebiedPlaatsen={werkgebiedPlaatsen}
      plaatsenLijst={plaatsenLijst}
      eigenVerkopen={eigenVerkopen}
      dataTotEnMet={dataTot.laatsteVerkoopdatum}
      kantoorNaam={kantoorNaam}
      initieel={{ resultaat, samenvatting }}
    />
  )
}
