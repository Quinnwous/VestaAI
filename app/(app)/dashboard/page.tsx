import { createServiceSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { bouwBranding } from '@/lib/branding'
import { berekenPitchCijfers, filterOpLaatsteMaanden, tellFases, berekenVerkoopstatistieken, filterOpJaar } from '@/lib/kerncijfers'
import { StartBanner } from './StartBanner'
import { Snelkoppelingen } from './Snelkoppelingen'
import { Kerncijfers } from './Kerncijfers'
import { AppPagina } from '@/components/ui'

export const metadata = { title: 'Overzicht' }

/**
 * Startpagina na inloggen (masterplan fase 1.6, zie docs/roadmap.md): een
 * landingspagina met een teambanner, kerncijfers en snelkoppelingen — in
 * plaats van automatisch op de woningenlijst te landen. De lijst zelf staat
 * nu op /woningen.
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

  const [{ data: objectenFase }, { data: acquisitieRows }, { data: eigenVerkopen }] = await Promise.all([
    service.from('objecten').select('fase').eq('kantoor_id', makelaar.kantoorId),
    service.from('objecten').select('pitch_uitslag, created_at').eq('kantoor_id', makelaar.kantoorId).eq('fase', 'acquisitie'),
    service
      .from('transacties')
      .select('verkoopprijs, vraagprijs, looptijd_dagen, verkoopdatum')
      .eq('kantoor_id', makelaar.kantoorId)
      .eq('eigen_verkoop', true),
  ])

  const fases = tellFases(objectenFase ?? [])
  const pitchesLaatste12Mnd = filterOpLaatsteMaanden(acquisitieRows ?? [], 12)
  const { winratio } = berekenPitchCijfers(pitchesLaatste12Mnd)
  const verkopenDitJaar = filterOpJaar(eigenVerkopen ?? [], huidigJaar)
  const verkoopStats = berekenVerkoopstatistieken(verkopenDitJaar)

  const branding = bouwBranding(makelaar.kantoor)

  return (
    <AppPagina>
      <StartBanner url={branding.achtergrondUrl} naam={makelaar.naam} kantoornaam={branding.naam} />
      <Snelkoppelingen />
      <Kerncijfers
        acquisities={fases.acquisitie}
        winratio={winratio}
        inVerkoop={fases.inVerkoop}
        verkochtDitJaar={verkoopStats.aantal}
        gemLooptijdDagen={verkoopStats.gemLooptijdDagen}
        gemPrijsTovVraagprijsPct={verkoopStats.gemPrijsTovVraagprijsPct}
        nEigenVerkopenDitJaar={verkoopStats.aantal}
      />
    </AppPagina>
  )
}
