'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { InAanbouw } from '@/components/InAanbouw'
import { TabBar } from '@/components/ui'
import { CONTENT_VERGRENDELD, CONTENT_SLOT_TEKST } from '@/lib/features'
import { ContentTekstenTab } from '@/components/ContentTekstenTab'
import { BuurtDataTab } from '@/components/BuurtDataTab'
import { NotitieVeld } from '@/components/NotitieVeld'
import { StijlLerenPaneel } from '@/components/StijlLerenPaneel'
import { VirtualStaging } from '@/components/VirtualStaging'
import { DocumentenAssistent } from '@/components/DocumentenAssistent'
import { FotoBibliotheek } from '@/components/FotoBibliotheek'
import { EmailPdfButton } from '@/components/EmailPdfButton'
import { RealworksExportButton } from '@/components/RealworksExportButton'
import { PrijswijzigingModal } from '@/components/PrijswijzigingModal'
import { StraalKaartPaneel } from '@/components/StraalKaartPaneel'
import { WaardebepalingPaneel } from '@/components/WaardebepalingPaneel'
import { UspExtractorPaneel } from '@/components/UspExtractorPaneel'
import type { ContentOutput, ObjectContentStatus, ObjectFase, VerrijkingOpslag } from '@/lib/schemas'
import type { WaarderingUitkomst } from '@/lib/waardering'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

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
  objectId, address, waarderingUitkomst, correctie, uspsInitieel,
}: {
  objectId: string
  address: string
  waarderingUitkomst: WaarderingUitkomst | null
  correctie: { waarde: number; motivatie: string; datum: string } | null
  uspsInitieel: string[]
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <WaardebepalingPaneel
        objectId={objectId}
        address={address}
        opgeslagenUitkomst={waarderingUitkomst}
        opgeslagenCorrectie={correctie}
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
  geo,
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
  /** Coördinaat van dit adres (uit lib/verrijking.ts) — voedt de straal-uitsnede hieronder. */
  geo?: { lat: number; lng: number } | null
  eigenVerkopen?: TransactieMetCoordinaten[]
  /** Laatst opgeslagen waarderingsuitkomst v2 (item 4.3) — het paneel haalt bij mount zelf een
   * verse uitkomst op via de server action `berekenWaardering()`; dit is alleen de eerste render. */
  waarderingUitkomst?: WaarderingUitkomst | null
  waarderingCorrectie?: { waarde: number; motivatie: string; datum: string } | null
  uspsInitieel?: string[]
  /** Item 3.1 (docs/roadmap.md § 3.2): status van de contentgeneratie, stuurt
   * de EmptyState/skeleton/foutstaat in de Teksten-tab. Default 'klaar' voor
   * bestaande call-sites/tests die deze prop nog niet meegeven. */
  contentStatus?: ObjectContentStatus
  /** Tijdstip waarop de huidige 'bezig'-lock is geclaimd — voedt de mm:ss-timer. */
  contentBezigSinds?: string | null
  /** Item 10.3: laatst opgeslagen buurtdata (`objecten.verrijking_json`), of
   * `null` als er nog niets is opgehaald — de tab "Buurt & data" probeert dan
   * zelf eenmalig te verversen. `null` ook zolang de migratie voor deze kolom
   * nog niet is toegepast (graceful, zie lib/verrijkingOpslag.ts). */
  verrijkingInitieel?: VerrijkingOpslag | null
  /** WOZ die de makelaar zelf invulde (`input_json.woz_waarde`/`woz_peiljaar`, lib/woz.ts). */
  wozHandmatig?: { waarde: number; peiljaar: number } | null
}) {
  // Item 10.2: de dossierheader linkt met `?tab=content` naar de contenttab
  // (bv. de "Content"-knop in de acties) — alleen als startwaarde gelezen,
  // geen voortdurende sync nodig.
  const searchParams = useSearchParams()
  const [active, setActive] = useState<SectionId>(
    searchParams.get('tab') === 'content' ? 'content' : (CONTENT_VERGRENDELD ? 'waardering' : 'content'),
  )
  const [contentTab, setContentTab] = useState<ContentTab>('content')
  const [fotoRefresh, setFotoRefresh] = useState(0)

  const straalKaart = geo ? (
    <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', background: '#fff', padding: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 12px' }}>In de buurt verkocht</p>
      <StraalKaartPaneel lat={geo.lat} lng={geo.lng} eigenVerkopen={eigenVerkopen} />
    </div>
  ) : null

  const waarderingSectie = (
    <WaarderingSectie
      objectId={objectId}
      address={address}
      waarderingUitkomst={waarderingUitkomst}
      correctie={waarderingCorrectie}
      uspsInitieel={uspsInitieel}
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
  // tabbalk nodig (item 10.3: "Buurt & data" is hier gestapeld i.p.v. een tab,
  // net als de straal-kaart hieronder).
  if (fase === 'verkoopadvies') {
    return (
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {waarderingSectie}
        {straalKaart}
        {buurtDataSectie}
      </div>
    )
  }

  return (
    <div>
      <TabBar
        tabs={SECTIONS.map(s => s.id === 'content' && CONTENT_VERGRENDELD ? { ...s, label: `${s.label} 🔒` } : s)}
        active={active}
        onChange={(id) => setActive(id as SectionId)}
        style={{ margin: '24px 0 26px' }}
      />

      <div style={{ display: active === 'waardering' ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {waarderingSectie}
          {straalKaart}
        </div>
      </div>

      <div style={{ display: active === 'buurt' ? 'block' : 'none' }}>
        <BuurtDataTab objectId={objectId} initieel={verrijkingInitieel} wozHandmatig={wozHandmatig} />
      </div>

      <div style={{ display: active === 'content' ? 'block' : 'none' }}>
        {CONTENT_VERGRENDELD ? (
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
              onChange={(id) => setContentTab(id as ContentTab)}
              style={{ marginBottom: 22 }}
            />

            {/* Teksten — altijd gemount zodat inline-bewerkingen niet verloren gaan bij wisselen */}
            <div style={{ display: contentTab === 'content' ? 'block' : 'none' }}>
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
            </div>

            {/* Media — virtual staging + bibliotheek als losse kaarten */}
            <div style={{ display: contentTab === 'media' ? 'block' : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={card}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Virtual staging</h2>
                  <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 16px' }}>Meubileer een lege ruimte met AI — kies stijl en ruimte.</p>
                  <VirtualStaging objectId={objectId} onBewaard={() => setFotoRefresh(n => n + 1)} />
                </div>
                <div style={card}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Foto-bibliotheek</h2>
                  <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 16px' }}>Gestagede foto&apos;s bij deze woning — om te downloaden of hergebruiken.</p>
                  <FotoBibliotheek objectId={objectId} refreshSignal={fotoRefresh} />
                </div>
              </div>
            </div>

            {/* Documenten */}
            <div style={{ display: contentTab === 'documenten' ? 'block' : 'none' }}>
              <DocumentenAssistent objectId={objectId} />
            </div>

            {/* Export & delen */}
            <div style={{ display: contentTab === 'export' ? 'block' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                <div style={card}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Mail naar jezelf of een collega</h2>
                  <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 16px', lineHeight: 1.5 }}>Stuur de brochure intern door — nooit direct naar een koper.</p>
                  <EmailPdfButton objectId={objectId} userEmail={userEmail} />
                </div>
                <div style={card}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Realworks-export</h2>
                  <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 16px', lineHeight: 1.5 }}>Exporteer de woninggegevens als XML voor Realworks.</p>
                  <RealworksExportButton objectId={objectId} />
                </div>
                <div style={{ ...card, gridColumn: 'span 2' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Prijsaanpassing of verkocht — genereer aankondiging</h2>
                  <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 16px', lineHeight: 1.5 }}>Maak in één klik social- en e-mailcontent voor een prijsreductie of verkoop.</p>
                  <PrijswijzigingModal objectId={objectId} adres={address} huidigeprijs={vraagprijs} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
