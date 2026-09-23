import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { bouwBranding } from '@/lib/branding'
import {
  tellFases,
  filterOpLaatsteMaanden,
  berekenVerkoopstatistieken,
  berekenVerkochtMetDelta,
  vergelijkLooptijdMetMarkt,
  berekenMarktaandeel,
  filterOpPlaatsLaatste12Mnd,
  plaatsVarianten,
  type EigenVerkoopPlaatsRow,
} from '@/lib/kerncijfers'
import { haalEigenVerkopen, marktanalyseSamenvatting, dataTotEnMet } from '@/lib/transactiesQuery'
import { KantoorInstellingenSchema } from '@/lib/schemas'
import { begroetingVoor, datumVoor, contextregel } from '@/lib/begroeting'
import { haalRecentBekekenOp, dedupliceerRecentBekeken, relatieveTijdVoorGebruik } from '@/lib/gebruik'
import { StartBanner } from './StartBanner'
import { Kerncijfers } from './Kerncijfers'
import { RecentBekeken, type RecentBekekenItem } from './RecentBekeken'
import { AppPagina } from '@/components/ui'

const EIGEN_VERKOOP_KOLOMMEN = ['verkoopprijs', 'vraagprijs', 'looptijd_dagen', 'verkoopdatum', 'plaats'] as const

export const metadata = { title: 'Overzicht' }

function isoDag(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Startpagina na inloggen (masterplan fase 1.6, zie docs/roadmap.md): een
 * landingspagina met een teambanner en kerncijfers — in plaats van
 * automatisch op de woningenlijst te landen. De lijst zelf staat op
 * /woningen. De snelkoppelingen zijn vervallen (item 1.9c, besluit Quinn
 * 17 sep 2026): rustigere startpagina, geen pitch-concept meer.
 *
 * Sinds item 2.5 (docs/roadmap.md § 5 Fase 2) komen de kerncijfers van de
 * transactiedataset (via lib/transactiesQuery.ts) i.p.v. alleen `objecten`:
 * verkocht laatste 12 mnd + delta, gem. looptijd vs. markt, marktaandeel in
 * de eerste werkgebiedplaats en prijs t.o.v. vraagprijs — elke tegel met n
 * en "data t/m". Dossier-tellingen (in verkoop, lopende verkoopadviezen)
 * blijven op `objecten`.
 *
 * "Recent bekeken" (item 10.4) draait op `gebruik_events` (lib/gebruik.ts) —
 * de laatste ~5 unieke dossiers die déze makelaar opende, gededupliceerd en
 * met een server-side berekende "…geleden"-tekst. Faalt stil (lege lijst +
 * lege staat) zolang de migratie nog niet is toegepast door de hoofdsessie.
 * Een los `bannerfoto`-veld in de admin staat nog open (vereist een door
 * Quinn goedgekeurde teamfoto, zie docs/roadmap.md § Stand van zaken) — de
 * banner valt tot die tijd terug op het bestaande sfeerbeeld (hetzelfde als
 * op /kantoor) of een merkverloop.
 */
export default async function DashboardPage() {
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  const service = createServiceSupabaseClient()
  const sessie = createServerSupabaseClient()
  const nu = new Date()

  const [{ data: objectenFase }, { data: kantoorRow }, eigenVerkopen, dataTot, recentBekekenRuw] = await Promise.all([
    // `content_status` komt mee in dezelfde query (geen extra rondje) en voedt
    // de contextregel in de banner: "N dossiers wachten op content".
    service.from('objecten').select('fase, content_status').eq('kantoor_id', makelaar.kantoorId),
    service.from('kantoren').select('instellingen_json').eq('id', makelaar.kantoorId).single(),
    haalEigenVerkopen<EigenVerkoopPlaatsRow>(sessie, EIGEN_VERKOOP_KOLOMMEN),
    dataTotEnMet(sessie),
    // Item 10.4: "Recent bekeken" — faalt stil (lege lijst) zolang de tabel
    // gebruik_events nog niet is toegepast, zie lib/gebruik.ts.
    haalRecentBekekenOp(sessie, makelaar.userId),
  ])

  const fases = tellFases(objectenFase ?? [])

  // Dossiers die al in verkoop staan maar nog geen content hebben — dat is het
  // eerste wat aandacht vraagt, en dus de contextregel in de banner.
  const wachtOpContent = (objectenFase ?? []).filter(
    (o: { fase: string | null; content_status: string | null }) =>
      o.fase === 'in_verkoop' && (o.content_status === 'geen' || o.content_status === 'fout'),
  ).length

  // Eigen verkopen: looptijd + prijs t.o.v. vraagprijs over de laatste 12
  // maanden (glijdend venster), verkocht-telling + delta over dezelfde en de
  // voorgaande 12 maanden (spec 2.5).
  const verkopenLaatste12Mnd = filterOpLaatsteMaanden(eigenVerkopen ?? [], 12, r => r.verkoopdatum, nu)
  const eigenStats = berekenVerkoopstatistieken(verkopenLaatste12Mnd)
  const verkochtMetDelta = berekenVerkochtMetDelta(eigenVerkopen ?? [], nu)

  // Werkgebied uit de kantoorinstellingen (platform-admin-beheerd) — de
  // eerste plaats voedt de marktaandeel-tegel. Ontbreekt het werkgebied
  // (bv. i4 Housing, nog niet ingesteld), dan blijft de tegel netjes leeg
  // i.p.v. te crashen op een RPC zonder plaatsfilter.
  const instellingenGeparsed = KantoorInstellingenSchema.safeParse(kantoorRow?.instellingen_json ?? {})
  const werkgebiedPlaatsen = instellingenGeparsed.success ? instellingenGeparsed.data.werkgebied?.plaatsen ?? [] : []
  const eerstePlaats = werkgebiedPlaatsen[0] ?? null

  // Markt-looptijd + marktaandeel-noemer via dezelfde RPC (marktanalyseSamenvatting),
  // gefilterd op de eerste werkgebiedplaats + laatste 12 mnd. plaatsVarianten()
  // dekt een spellingsverschil tussen werkgebied en dataset (bv. "'s-Gravenhage"
  // vs "Den Haag", zie lib/kerncijfers.ts) — de RPC vergelijkt exact.
  let marktN = 0
  let marktGemLooptijd: number | null = null
  if (eerstePlaats) {
    const twaalfTerug = new Date(nu)
    twaalfTerug.setMonth(twaalfTerug.getMonth() - 12)
    const samenvatting = await marktanalyseSamenvatting(sessie, {
      plaatsen: plaatsVarianten(eerstePlaats),
      datum_van: isoDag(twaalfTerug),
      datum_tot: isoDag(nu),
    })
    marktN = samenvatting.huidig.n
    marktGemLooptijd = samenvatting.huidig.mediaanLooptijd
  }

  const looptijdVsMarkt = vergelijkLooptijdMetMarkt(eigenStats.gemLooptijdDagen, marktGemLooptijd)
  const eigenInPlaatsLaatste12Mnd = eerstePlaats
    ? filterOpPlaatsLaatste12Mnd(eigenVerkopen ?? [], eerstePlaats, nu)
    : []
  const marktaandeel = berekenMarktaandeel(eigenInPlaatsLaatste12Mnd.length, marktN)

  const branding = bouwBranding(makelaar.kantoor)

  // Item 10.4: dedupliceren op dossier + relatieve tijd server-side uitrekenen
  // met de `nu` hierboven — nooit new Date() in de (client-)weergave, zie
  // CLAUDE.md ⚠️ "Nooit new Date() in een client component".
  const recentBekekenItems: RecentBekekenItem[] = dedupliceerRecentBekeken(recentBekekenRuw).map(rij => ({
    objectId: rij.objectId,
    address: rij.address,
    fase: rij.fase,
    tijdGeleden: relatieveTijdVoorGebruik(rij.bekekenOp, nu),
  }))

  return (
    <AppPagina>
      <StartBanner
        url={branding.bannerUrl}
        focusY={branding.bannerFocusY}
        naam={makelaar.naam}
        kantoornaam={branding.naam}
        datum={datumVoor(nu)}
        begroeting={begroetingVoor(nu)}
        context={contextregel({
          wachtOpContent: wachtOpContent,
          inVerkoop: fases.inVerkoop,
          verkoopadviezen: fases.verkoopadvies,
        })}
      />
      <Kerncijfers
        lopendeVerkoopadviezen={fases.verkoopadvies}
        inVerkoop={fases.inVerkoop}
        verkocht={verkochtMetDelta}
        gemLooptijdDagen={eigenStats.gemLooptijdDagen}
        nEigenVerkopenLaatste12Mnd={eigenStats.aantal}
        looptijdVsMarkt={looptijdVsMarkt}
        gemPrijsTovVraagprijsPct={eigenStats.gemPrijsTovVraagprijsPct}
        marktaandeelPlaats={eerstePlaats}
        marktaandeel={marktaandeel}
        dataTotEnMet={dataTot.laatsteVerkoopdatum}
      />
      <RecentBekeken items={recentBekekenItems} />
    </AppPagina>
  )
}
