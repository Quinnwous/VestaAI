import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { VerkoopkaartExplorerV2 } from '@/components/VerkoopkaartExplorerV2'
import { haalEigenVerkopen, dataTotEnMet, MET_COORDINATEN_KOLOMMEN } from '@/lib/transactiesQuery'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

export const metadata = { title: 'Verkoopkaart' }

/**
 * Verkoopkaart — volledig scherm, los van één woning (zie CLAUDE.md §
 * Hoofdstructuur). Toont alleen de eigen verkopen van het kantoor als
 * vlaggetje (besluit 16 sep 2026). Leeg totdat de transactiedataset is
 * geïmporteerd (zie /admin/transacties) — geen placeholder meer, gewoon een
 * kaart die zich vult zodra de data er is.
 *
 * `VerkoopkaartExplorerV2` (item 7.2, poort van
 * `docs/ontwerp/verkoopkaart.html`) is de enige weergave sinds item 7.4: de
 * oude Leaflet-explorer (`VerkoopkaartExplorer`/`VerkoopkaartClient`, met
 * `?kaart=v1` als terugval) is opgeruimd, net als het (inmiddels opgegane) `StraalKaartPaneel`s
 * eigen Leaflet-gebruik — beide draaien nu op `components/kaart/` (MapLibre).
 */
export default async function VerkoopkaartPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const [transacties, dataTot] = await Promise.all([
    haalEigenVerkopen<TransactieMetCoordinaten>(supabase, MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true }),
    dataTotEnMet(supabase),
  ])

  return <VerkoopkaartExplorerV2 transacties={transacties} dataTotEnMet={dataTot.laatsteVerkoopdatum} />
}
