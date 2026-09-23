import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { KantoorInstellingenSchema } from '@/lib/schemas'
import {
  haalEigenVerkopen,
  marktanalyseReeks,
  marktanalyseSamenvatting,
  marktanalyseVerdelingPrijsklasse,
  plaatsenWijken,
  dataTotEnMet,
  type PlaatsWijkRij,
} from '@/lib/transactiesQuery'
import { standaardFilterState, filterStateNaarTransactieFilter } from '@/lib/marktanalyse'
import type { TransactieRow } from '@/lib/supabase'
import { MarktanalyseExplorer } from '@/components/MarktanalyseExplorer'

export const metadata = { title: 'Marktanalyse' }

/** Kolommen voor de eigen-verkopenreeks ("wij", patroon 1 — client-side filteren, § 3.1). */
const EIGEN_VERKOOP_KOLOMMEN = [
  'id', 'plaats', 'wijk', 'verkoopprijs', 'vraagprijs', 'verkoopdatum', 'looptijd_dagen',
  'woonoppervlak_m2', 'perceel_m2', 'bouwjaar', 'energielabel', 'kamers', 'garage', 'tuin',
  'woningtype_groep', 'woningtype_sub', 'prijs_m2',
] as const

/**
 * Marktanalyse-explorer v2 (item 6.1, docs/roadmap.md § 5 Fase 6 — port van
 * `docs/ontwerp/marktanalyse.html`). Prestatie-eis: van ~6 s naar < ~1,5 s —
 * dit haalt niet langer de hele transactietabel op (dat deed de v1-pagina via
 * `haalTransactiesVoorVerkenner`), maar:
 *  - de eigen verkopen één keer, compact (patroon 1, ≤ 2.000 rijen) — voor de
 *    "wij"-lijn/sparklines, client-side gefilterd (`lib/marktanalyse.ts`
 *    `filterEigenRijen`/`wijKwartaalReeks`);
 *  - de regionale aggregaties via de RPC's (patroon 2), voor de standaardfilter
 *    (werkgebied van het kantoor) al vóór de eerste paint, zodat de pagina
 *    meteen met data rendert i.p.v. een lege skeleton. Elke volgende
 *    filterwijziging ververst via de server action `actions.ts`
 *    (`haalMarktanalyseData`) vanuit de client component.
 */
export default async function MarktanalysePage() {
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  const service = createServiceSupabaseClient()
  const sessie = createServerSupabaseClient()

  const [{ data: kantoorRow }, eigenVerkopen, dataTot] = await Promise.all([
    service.from('kantoren').select('instellingen_json').eq('id', makelaar.kantoorId).single(),
    haalEigenVerkopen<TransactieRow>(sessie, EIGEN_VERKOOP_KOLOMMEN),
    dataTotEnMet(sessie),
  ])

  const instellingenGeparsed = KantoorInstellingenSchema.safeParse(kantoorRow?.instellingen_json ?? {})
  const werkgebiedPlaatsen = instellingenGeparsed.success ? instellingenGeparsed.data.werkgebied?.plaatsen ?? [] : []

  // `transacties_plaatsen_wijken` staat klaar in dezelfde (nog niet
  // toegepaste) migratie als de verdeling-RPC hieronder — val tot die tijd
  // terug op het werkgebied, zodat de plaats-dropdown nooit leeg is.
  let plaatsenLijst: PlaatsWijkRij[]
  try {
    plaatsenLijst = await plaatsenWijken(sessie)
  } catch {
    plaatsenLijst = werkgebiedPlaatsen.map(plaats => ({ plaats, wijk: null, n: 0 }))
  }

  const standaardFilter = standaardFilterState(werkgebiedPlaatsen)
  const rpcFilter = filterStateNaarTransactieFilter(standaardFilter, { datumTot: dataTot.laatsteVerkoopdatum })

  const [reeksMarkt, samenvatting, verdeling] = await Promise.all([
    marktanalyseReeks(sessie, rpcFilter),
    marktanalyseSamenvatting(sessie, rpcFilter),
    marktanalyseVerdelingPrijsklasse(sessie, rpcFilter).catch(() => null),
  ])

  return (
    <MarktanalyseExplorer
      werkgebiedPlaatsen={werkgebiedPlaatsen}
      plaatsenLijst={plaatsenLijst}
      eigenVerkopen={eigenVerkopen}
      dataTotEnMet={dataTot.laatsteVerkoopdatum}
      initieel={{ reeksMarkt, reeksB: null, samenvatting, verdeling }}
    />
  )
}
