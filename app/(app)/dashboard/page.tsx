import { createServiceSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { bouwBranding } from '@/lib/branding'
import { filterOpLaatsteMaanden, tellFases, berekenVerkoopstatistieken, filterOpJaar } from '@/lib/kerncijfers'
import { StartBanner } from './StartBanner'
import { Kerncijfers } from './Kerncijfers'
import { AppPagina } from '@/components/ui'

export const metadata = { title: 'Overzicht' }

/**
 * Startpagina na inloggen (masterplan fase 1.6, zie docs/roadmap.md): een
 * landingspagina met een teambanner en kerncijfers — in plaats van
 * automatisch op de woningenlijst te landen. De lijst zelf staat op
 * /woningen. De snelkoppelingen zijn vervallen (item 1.9c, besluit Quinn
 * 17 sep 2026): rustigere startpagina, geen pitch-concept meer.
 *
 * "Recent bekeken" (op basis van gebruik_events) en een los `bannerfoto`-veld
 * in de admin staan nog open — die vereisen een nieuwe migratie resp. een
 * door Quinn goedgekeurde teamfoto, zie docs/roadmap.md § Stand van zaken.
 * De banner valt tot die tijd terug op het bestaande sfeerbeeld (hetzelfde
 * als op /kantoor) of een merkverloop.
 */
export default async function DashboardPage() {
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  const service = createServiceSupabaseClient()
  const huidigJaar = new Date().getFullYear()

  const [{ data: objectenFase }, { data: eigenVerkopen }] = await Promise.all([
    service.from('objecten').select('fase').eq('kantoor_id', makelaar.kantoorId),
    service
      .from('transacties')
      .select('verkoopprijs, vraagprijs, looptijd_dagen, verkoopdatum')
      .eq('kantoor_id', makelaar.kantoorId)
      .eq('eigen_verkoop', true),
  ])

  const fases = tellFases(objectenFase ?? [])

  // "Verkocht dit jaar" is een kalenderjaar-telling; "Gem. looptijd" en
  // "Prijs t.o.v. vraagprijs" draaien op een glijdend venster van de laatste
  // 12 maanden (spec 1.9c d) — dezelfde n voor beide tegels.
  const verkopenDitJaar = filterOpJaar(eigenVerkopen ?? [], huidigJaar)
  const verkopenLaatste12Mnd = filterOpLaatsteMaanden(eigenVerkopen ?? [], 12, r => r.verkoopdatum)
  const verkoopStatsLaatste12Mnd = berekenVerkoopstatistieken(verkopenLaatste12Mnd)

  const branding = bouwBranding(makelaar.kantoor)

  return (
    <AppPagina>
      <StartBanner url={branding.achtergrondUrl} naam={makelaar.naam} kantoornaam={branding.naam} />
      <Kerncijfers
        lopendeVerkoopadviezen={fases.acquisitie}
        inVerkoop={fases.inVerkoop}
        verkochtDitJaar={verkopenDitJaar.length}
        gemLooptijdDagen={verkoopStatsLaatste12Mnd.gemLooptijdDagen}
        gemPrijsTovVraagprijsPct={verkoopStatsLaatste12Mnd.gemPrijsTovVraagprijsPct}
        nEigenVerkopenLaatste12Mnd={verkoopStatsLaatste12Mnd.aantal}
      />
    </AppPagina>
  )
}
