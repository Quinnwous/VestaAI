'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { InAanbouw } from '@/components/InAanbouw'
import { TabBar, Skeleton } from '@/components/ui'
import { CONTENT_VERGRENDELD, CONTENT_SLOT_TEKST } from '@/lib/features'
import { ContentTekstenTab } from '@/components/ContentTekstenTab'
import { BuurtDataTab } from '@/components/BuurtDataTab'
import { NotitieVeld } from '@/components/NotitieVeld'
import { StijlLerenPaneel } from '@/components/StijlLerenPaneel'
import { WaardebepalingPaneel } from '@/components/WaardebepalingPaneel'
import { UspExtractorPaneel } from '@/components/UspExtractorPaneel'
import type { ContentOutput, ObjectContentStatus, ObjectFase, VerrijkingOpslag } from '@/lib/schemas'
import type { WaarderingUitkomst } from '@/lib/waardering'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

// Alleen relevant zodra de content-subtab Media/Documenten/Export voor het
// eerst wordt bezocht — via next/dynamic (ssr:false, pas gemount na een
// klik) uit de hoofdbundel van het dossier gehouden. ContentTekstenTab,
// WaardebepalingPaneel en BuurtDataTab blijven statisch: die zijn in een van
// de fases de eerste weergave, en daar willen we geen extra wachttijd.
const VirtualStagingDynamic = dynamic(
  () => import('@/components/VirtualStaging').then((m) => m.VirtualStaging),
  { ssr: false, loading: () => <Skeleton height={140} /> },
)
const FotoBibliotheekDynamic = dynamic(
  () => import('@/components/FotoBibliotheek').then((m) => m.FotoBibliotheek),
  { ssr: false, loading: () => <Skeleton height={140} /> },
)
const DocumentenAssistentDynamic = dynamic(
  () => import('@/components/DocumentenAssistent').then((m) => m.DocumentenAssistent),
  { ssr: false, loading: () => <Skeleton height={140} /> },
)
const EmailPdfButtonDynamic = dynamic(
  () => import('@/components/EmailPdfButton').then((m) => m.EmailPdfButton),
  { ssr: false, loading: () => <Skeleton height={40} /> },
)
const RealworksExportButtonDynamic = dynamic(
  () => import('@/components/RealworksExportButton').then((m) => m.RealworksExportButton),
  { ssr: false, loading: () => <Skeleton height={40} /> },
)
const PrijswijzigingModalDynamic = dynamic(
  () => import('@/components/PrijswijzigingModal').then((m) => m.PrijswijzigingModal),
  { ssr: false, loading: () => <Skeleton height={40} /> },
)

/**
 * Woningdossier — de kern van het product (zie CLAUDE.md § Hoofdstructuur).
 * Eén dossier per adres doorloopt drie fases (besluit 16 sep 2026):
 *
 * - **Verkoopadvies** (interne waarde `verkoopadvies`, hernoemd van
 *   `acquisitie` in item 2.1) — alleen waardebepaling en verkoopadvies zijn
 *   zichtbaar. Er zijn nog geen foto's of een vaste vraagprijs; content hoort
 *   hier niet. Geen pitch-concept meer (item 1.9c, besluit Quinn 17 sep 2026).
 * - **In verkoop** — content en media (Module A) komen erbij, naast
 *   waardering. Gated op `CONTENT_VERGRENDELD` (lib/features.ts) als extra,
 *   losstaande noodschakelaar.
 * - **Verkocht** — alles blijft bereikbaar, puur archief-gelabeld (zie
 *   DossierHeader.tsx).
 */

type SectionId = 'waardering' | 'buurt' | 'content'
type ContentTab = 'content' | 'media' | 'documenten' | 'export'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'waardering', label: 'Waardering' },
  { id: 'buurt', label: 'Buurt & data' },
  { id: 'content', label: 'Content en media' },
]

const CONTENT_TABS: { id: ContentTab; label: string }[] = [
  { id: 'content', label: 'Teksten' },
  { id: 'media', label: 'Media' },
  { id: 'documenten', label: 'Documenten' },
  { id: 'export', label: 'Export' },
]

const card: React.CSSProperties = {
  borderRadius: 'var(--merk-radius-card-lg, 18px)',
  background: '#fff',
  border: '1px solid #E6E9EC',
  padding: 22,
  boxShadow: '0 2px 12px rgba(20,24,27,.04)',
}

function WaarderingSectie({
  objectId, address, waarderingUitkomst, correctie, uspsInitieel, eigenVerkopen,
}: {
  objectId: string
  address: string
  waarderingUitkomst: WaarderingUitkomst | null
  correctie: { waarde: number; motivatie: string; datum: string } | null
  uspsInitieel: string[]
  /** Eigen verkopen van het kantoor mét coördinaten — voedt de laag "Eigen
   * verkopen" op de dossierkaart in WaardebepalingPaneel (voorheen het losse
   * StraalKaartPaneel, roadmap § 9 "Twee kaarten in het dossier samenvoegen"). */
  eigenVerkopen: TransactieMetCoordinaten[]
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <WaardebepalingPaneel
        objectId={objectId}
        address={address}
        opgeslagenUitkomst={waarderingUitkomst}
        opgeslagenCorrectie={correctie}
        eigenVerkopen={eigenVerkopen}
      />
      <UspExtractorPaneel objectId={objectId} initieleUsps={uspsInitieel} />
    </div>
  )
}

export function ObjectWorkspace({
  objectId,
  address,
  fase,
  outputs,
  outputsEn = null,
  vraagprijs,
  notitie,
  userEmail,
  eigenVerkopen = [],
  waarderingUitkomst = null,
  waarderingCorrectie = null,
  uspsInitieel = [],
  contentStatus = 'klaar',
  contentBezigSinds = null,
  verrijkingInitieel = null,
  wozHandmatig = null,
}: {
  objectId: string
  address: string
  fase: ObjectFase
  outputs: ContentOutput
  /** Engelse tegenhanger van `outputs` (F8, besluit 16 sep 2026: elke tekst standaard NL+EN). */
  outputsEn?: ContentOutput | null
  vraagprijs: number
  notitie: string | null
  userEmail?: string
  /** Coördinaat van dit adres (uit lib/verrijking.ts). Sinds "Twee kaarten in
   * het dossier samenvoegen" (roadmap § 9) leest de dossierkaart zijn
   * coördinaat uit de waarderingsuitkomst zelf (`serverData.subject`), niet
   * meer uit deze prop — bewust nog in de signature zodat de aanroeper
   * (`app/(app)/object/[id]/page.tsx`, niet dit worktree-bestand) niets hoeft
   * te wijzigen. */
  geo?: { lat: number; lng: number } | null
  eigenVerkopen?: TransactieMetCoordinaten[]
  /** Laatst opgeslagen waarderingsuitkomst v2 (item 4.3) — het paneel haalt bij mount zelf een
   * verse uitkomst op via de server action `berekenWaardering()`; dit is alleen de eerste render. */
  waarderingUitkomst?: WaarderingUitkomst | null
  waarderingCorrectie?: { waarde: number; motivatie: string; datum: string } | null
  uspsInitieel?: string[]
  /** Item 3.1 (docs/architectuur.md § 2): status van de contentgeneratie, stuurt
   * de EmptyState/skeleton/foutstaat in de Teksten-tab. Default 'klaar' voor
   * bestaande call-sites/tests die deze prop nog niet meegeven. */
  contentStatus?: ObjectContentStatus
  /** Tijdstip waarop de huidige 'bezig'-lock is geclaimd — voedt de mm:ss-timer. */
  contentBezigSinds?: string | null
  /** Item 10.3: laatst opgeslagen buurtdata (`objecten.verrijking_json`), of
   * `null` als er nog niets is opgehaald — de tab "Buurt & data" probeert dan
   * zelf eenmalig te verversen. `null` ook als het ophalen mislukte (graceful,
   * zie lib/verrijkingOpslag.ts). */
  verrijkingInitieel?: VerrijkingOpslag | null
  /** WOZ die de makelaar zelf invulde (`input_json.woz_waarde`/`woz_peiljaar`, lib/woz.ts). */
  wozHandmatig?: { waarde: number; peiljaar: number } | null
}) {
  // Item 10.2: de dossierheader linkt met `?tab=content` naar de contenttab
  // (bv. de "Content"-knop in de acties) — alleen als startwaarde gelezen,
  // geen voortdurende sync nodig.
  const searchParams = useSearchParams()
  const initieleSectie: SectionId =
    searchParams.get('tab') === 'content' ? 'content' : (CONTENT_VERGRENDELD ? 'waardering' : 'content')
  const [active, setActive] = useState<SectionId>(initieleSectie)
  const [contentTab, setContentTab] = useState<ContentTab>('content')
  const [fotoRefresh, setFotoRefresh] = useState(0)

  // Performance (Lighthouse dossier: 87% van de LCP is render delay door
  // hydratie/fetches van tabs die niet in beeld zijn): een sectie/subtab
  // mount pas bij het eerste bezoek en blijft daarna gemount (display: none),
  // zodat inline-bewerkingen in Teksten niet verloren gaan. De startwaarde
  // telt als "al bezocht".
  const [bezochteSecties, setBezochteSecties] = useState<Set<SectionId>>(() => new Set([initieleSectie]))
  const [bezochteContentTabs, setBezochteContentTabs] = useState<Set<ContentTab>>(() => new Set(['content']))

  const kiesSectie = (id: SectionId) => {
    setActive(id)
    setBezochteSecties((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }
  const kiesContentTab = (id: ContentTab) => {
    setContentTab(id)
    setBezochteContentTabs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  // "In de buurt verkocht" (ex-StraalKaartPaneel) is sinds "Twee kaarten in
  // het dossier samenvoegen" (roadmap § 9) een laag van de dossierkaart in
  // WaardebepalingPaneel — geen los kaartblok meer hier, en dus ook geen
  // tweede MapLibre-instantie op deze pagina.
  const waarderingSectie = (
    <WaarderingSectie
      objectId={objectId}
      address={address}
      waarderingUitkomst={waarderingUitkomst}
      correctie={waarderingCorrectie}
      uspsInitieel={uspsInitieel}
      eigenVerkopen={eigenVerkopen}
    />
  )

  const buurtDataSectie = (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 12px' }}>Buurt & data</p>
      <BuurtDataTab objectId={objectId} initieel={verrijkingInitieel} wozHandmatig={wozHandmatig} />
    </div>
  )

  // Verkoopadvies-fase: er zijn nog geen foto's of een vaste vraagprijs —
  // alleen waardebepaling, verkoopadvies en buurtdata zijn relevant, geen
  // tabbalk nodig (item 10.3: "Buurt & data" is hier gestapeld i.p.v. een tab).
  if (fase === 'verkoopadvies') {
    return (
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {waarderingSectie}
        {buurtDataSectie}
      </div>
    )
  }

  return (
    <div>
      <TabBar
        tabs={SECTIONS.map(s => s.id === 'content' && CONTENT_VERGRENDELD ? { ...s, label: `${s.label} 🔒` } : s)}
        active={active}
        onChange={(id) => kiesSectie(id as SectionId)}
        style={{ margin: '24px 0 26px' }}
      />

      <div style={{ display: active === 'waardering' ? 'block' : 'none' }}>
        {bezochteSecties.has('waardering') && (
          <div style={{ display: 'grid', gap: 16 }}>
            {waarderingSectie}
          </div>
        )}
      </div>

      <div style={{ display: active === 'buurt' ? 'block' : 'none' }}>
        {bezochteSecties.has('buurt') && (
          <BuurtDataTab objectId={objectId} initieel={verrijkingInitieel} wozHandmatig={wozHandmatig} />
        )}
      </div>

      <div style={{ display: active === 'content' ? 'block' : 'none' }}>
        {bezochteSecties.has('content') && (
          CONTENT_VERGRENDELD ? (
            <InAanbouw
              slot
              eyebrow="Module A — tijdelijk gesloten"
              titel={CONTENT_SLOT_TEKST.titel}
              uitleg={CONTENT_SLOT_TEKST.uitleg}
              punten={[
                'Brochure en Funda-tekst',
                'Social media-teksten (bv. Instagram-captions)',
                'Buurtrapport — omgevingsdata en demografie van de wijk',
                'Virtual staging en documentenassistent',
              ]}
            />
          ) : (
            <div>
              <TabBar
                tabs={CONTENT_TABS}
                active={contentTab}
                onChange={(id) => kiesContentTab(id as ContentTab)}
                style={{ marginBottom: 22 }}
              />

              {/* Teksten — altijd gemount zodat inline-bewerkingen niet verloren gaan bij wisselen */}
              <div style={{ display: contentTab === 'content' ? 'block' : 'none' }}>
                {bezochteContentTabs.has('content') && (
                  <>
                    <ContentTekstenTab
                      objectId={objectId}
                      outputs={outputs}
                      outputsEn={outputsEn}
                      contentStatus={contentStatus}
                      contentBezigSinds={contentBezigSinds}
                    />
                    <div style={{ marginTop: 30, borderTop: '1px solid #EBEEF1', paddingTop: 22 }}>
                      <NotitieVeld objectId={objectId} initieleNotitie={notitie} />
                    </div>
                    <StijlLerenPaneel />
                  </>
                )}
              </div>

              {/* Media — virtual staging + bibliotheek als losse kaarten */}
              <div style={{ display: contentTab === 'media' ? 'block' : 'none' }}>
                {bezochteContentTabs.has('media') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={card}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Virtual staging</h2>
                      <p style={{ fontSize: 12.5, color: '#5C6470', margin: '0 0 16px' }}>Meubileer een lege ruimte met AI — kies stijl en ruimte.</p>
                      <VirtualStagingDynamic objectId={objectId} onBewaard={() => setFotoRefresh(n => n + 1)} />
                    </div>
                    <div style={card}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Foto-bibliotheek</h2>
                      <p style={{ fontSize: 12.5, color: '#5C6470', margin: '0 0 16px' }}>Gestagede foto&apos;s bij deze woning — om te downloaden of hergebruiken.</p>
                      <FotoBibliotheekDynamic objectId={objectId} refreshSignal={fotoRefresh} />
                    </div>
                  </div>
                )}
              </div>

              {/* Documenten */}
              <div style={{ display: contentTab === 'documenten' ? 'block' : 'none' }}>
                {bezochteContentTabs.has('documenten') && <DocumentenAssistentDynamic objectId={objectId} />}
              </div>

              {/* Export & delen */}
              <div style={{ display: contentTab === 'export' ? 'block' : 'none' }}>
                {bezochteContentTabs.has('export') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    <div style={card}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Mail naar jezelf of een collega</h2>
                      <p style={{ fontSize: 12.5, color: '#5C6470', margin: '0 0 16px', lineHeight: 1.5 }}>Stuur de brochure intern door — nooit direct naar een koper.</p>
                      <EmailPdfButtonDynamic objectId={objectId} userEmail={userEmail} />
                    </div>
                    <div style={card}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Realworks-export</h2>
                      <p style={{ fontSize: 12.5, color: '#5C6470', margin: '0 0 16px', lineHeight: 1.5 }}>Exporteer de woninggegevens als XML voor Realworks.</p>
                      <RealworksExportButtonDynamic objectId={objectId} />
                    </div>
                    <div style={{ ...card, gridColumn: 'span 2' }}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Prijsaanpassing of verkocht — genereer aankondiging</h2>
                      <p style={{ fontSize: 12.5, color: '#5C6470', margin: '0 0 16px', lineHeight: 1.5 }}>Maak in één klik social- en e-mailcontent voor een prijsreductie of verkoop.</p>
                      <PrijswijzigingModalDynamic objectId={objectId} adres={address} huidigeprijs={vraagprijs} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
