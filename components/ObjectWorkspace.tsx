'use client'

import { useState } from 'react'
import { InAanbouw } from '@/components/InAanbouw'
import { TabBar } from '@/components/ui'
import { CONTENT_VERGRENDELD, CONTENT_SLOT_TEKST } from '@/lib/features'
import { ResultTabs } from '@/components/ResultTabs'
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
import type { ContentOutput, ObjectFase } from '@/lib/schemas'
import type { Subject } from '@/lib/waardering'
import type { TransactieMetCoordinaten, TransactieRow } from '@/lib/supabase'

/**
 * Woningdossier — de kern van het product (zie CLAUDE.md § Hoofdstructuur).
 * Eén dossier per adres doorloopt drie fases (besluit 16 sep 2026):
 *
 * - **Acquisitie** — alleen waardebepaling en verkoopadvies zijn zichtbaar.
 *   Er zijn nog geen foto's of een vaste vraagprijs; content hoort hier niet.
 * - **In verkoop** — content en media (Module A) komen erbij, naast
 *   waardering. Gated op `CONTENT_VERGRENDELD` (lib/features.ts) als extra,
 *   losstaande noodschakelaar.
 * - **Verkocht** — alles blijft bereikbaar, puur archief-gelabeld (zie
 *   FaseToggle.tsx).
 */

type SectionId = 'waardering' | 'content'
type ContentTab = 'content' | 'media' | 'documenten' | 'export'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'waardering', label: 'Waardering' },
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
  objectId, subject, heeftGarage, heeftTuin, dataset, correctie, uspsInitieel,
}: {
  objectId: string
  subject: Subject
  heeftGarage: boolean
  heeftTuin: boolean
  dataset: TransactieRow[]
  correctie: { waarde: number; motivatie: string; datum: string } | null
  uspsInitieel: string[]
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <WaardebepalingPaneel
        objectId={objectId}
        subject={subject}
        heeftGarage={heeftGarage}
        heeftTuin={heeftTuin}
        dataset={dataset}
        opgeslagenCorrectie={correctie}
      />
      <UspExtractorPaneel objectId={objectId} initieleUsps={uspsInitieel} />
    </div>
  )
}

function VerkoopadviesPaneel({ address }: { address: string }) {
  return (
    <InAanbouw
      eyebrow="Verkoopadvies — in aanbouw"
      titel="Het document om de opdracht te winnen"
      uitleg={`Waarde, referenties, buurtkaart, "over ons" en courtage voor ${address} — in één document, in kantoorhuisstijl. Wacht op een voorbeelddocument voordat de opmaak wordt vastgelegd; de onderliggende data (waardering, kaart, kantoorprofiel) is al beschikbaar zodra die fases klaar zijn.`}
      punten={[
        'Onderbouwde waarde met bandbreedte en referentietransacties',
        'Buurtkaart met een straal rond dit adres',
        '"Over ons" — kantoorprofiel en werkgebied, beheerd door VestaAI',
        'Courtagevoorstel, met de kantoorstandaard voorgevuld',
      ]}
    />
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
  subject,
  heeftGarage,
  heeftTuin,
  transactieDataset = [],
  waarderingCorrectie = null,
  uspsInitieel = [],
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
  /** Kenmerken uit de intake die de referentieselectie en wat-als-blokken voeden (F7). */
  subject: Subject
  heeftGarage: boolean
  heeftTuin: boolean
  transactieDataset?: TransactieRow[]
  waarderingCorrectie?: { waarde: number; motivatie: string; datum: string } | null
  uspsInitieel?: string[]
}) {
  const [active, setActive] = useState<SectionId>(CONTENT_VERGRENDELD ? 'waardering' : 'content')
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
      subject={subject}
      heeftGarage={heeftGarage}
      heeftTuin={heeftTuin}
      dataset={transactieDataset}
      correctie={waarderingCorrectie}
      uspsInitieel={uspsInitieel}
    />
  )

  // Acquisitiefase: er zijn nog geen foto's of een vaste vraagprijs — alleen
  // waardebepaling en verkoopadvies zijn relevant, geen tabbalk nodig.
  if (fase === 'acquisitie') {
    return (
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {waarderingSectie}
        <VerkoopadviesPaneel address={address} />
        {straalKaart}
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
          <VerkoopadviesPaneel address={address} />
          {straalKaart}
        </div>
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
              <ResultTabs data={outputs} dataEn={outputsEn} objectId={objectId} onResetHref="/dashboard" />
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
