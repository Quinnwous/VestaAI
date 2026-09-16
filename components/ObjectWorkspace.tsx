'use client'

import { useState } from 'react'
import { InAanbouw } from '@/components/InAanbouw'
import { TabBar } from '@/components/ui'
import { CONTENT_VERGRENDELD, CONTENT_SLOT_TEKST } from '@/lib/features'
import { ResultTabs } from '@/components/ResultTabs'
import { NotitieVeld } from '@/components/NotitieVeld'
import { VirtualStaging } from '@/components/VirtualStaging'
import { DocumentenAssistent } from '@/components/DocumentenAssistent'
import { FotoBibliotheek } from '@/components/FotoBibliotheek'
import { EmailPdfButton } from '@/components/EmailPdfButton'
import { RealworksExportButton } from '@/components/RealworksExportButton'
import { PrijswijzigingModal } from '@/components/PrijswijzigingModal'
import type { ContentOutput } from '@/lib/schemas'

/**
 * Woningdossier — de kern van het product (zie CLAUDE.md § Hoofdstructuur).
 * Alle modules hieronder renderen op basis van dit ene geselecteerde adres:
 *
 * - Module A "Content en media" — gated op `CONTENT_VERGRENDELD` (lib/features.ts).
 *   Ontgrendeld: dezelfde sub-tabs als vóór de koerswijziging (Content/Media/
 *   Documenten/Export), minus de losse foto-verbetering en de deel-chatbot —
 *   die zijn op 15 sep 2026 definitief verwijderd, niet alleen vergrendeld.
 * - Module B "Waardering" — reken- en datamodule, in aanbouw (nog te bouwen,
 *   los van de content-vergrendeling).
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

export function ObjectWorkspace({
  objectId,
  address,
  outputs,
  vraagprijs,
  notitie,
  userEmail,
}: {
  objectId: string
  address: string
  outputs: ContentOutput
  vraagprijs: number
  notitie: string | null
  userEmail?: string
}) {
  const [active, setActive] = useState<SectionId>(CONTENT_VERGRENDELD ? 'waardering' : 'content')
  const [contentTab, setContentTab] = useState<ContentTab>('content')
  const [fotoRefresh, setFotoRefresh] = useState(0)

  return (
    <div>
      <TabBar
        tabs={SECTIONS.map(s => s.id === 'content' && CONTENT_VERGRENDELD ? { ...s, label: `${s.label} 🔒` } : s)}
        active={active}
        onChange={(id) => setActive(id as SectionId)}
        style={{ margin: '24px 0 26px' }}
      />

      <div style={{ display: active === 'waardering' ? 'block' : 'none' }}>
        <InAanbouw
          eyebrow="Module B — in aanbouw"
          titel={`Waardering van ${address}`}
          uitleg="Een reken- en datamodule: modulaire variabelen die je zelf toevoegt, in- of uitschakelt, plus een AI-extractor die bijzonderheden vertaalt naar Unique Selling Points."
          punten={[
            'Modulaire variabelen als losse blokken: kamers, WOZ, oppervlakte, kavelgrootte, energielabel, staat van onderhoud',
            'AI USP-extractor: typ een bijzonderheid in ("heeft een mooie garage", "nieuw dakkapel") — de AI vertaalt dit naar USP\'s die de waardering en marketing beïnvloeden',
            'Waarde met bandbreedte, onderbouwd met vergelijkbare verkochte woningen',
            'Eén klik naar een waarderingsrapport als PDF, in de huisstijl van je kantoor',
          ]}
        />
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
              'Verkoopadvies voor de verkopende partij',
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
              <ResultTabs data={outputs} objectId={objectId} onResetHref="/dashboard" />
              <div style={{ marginTop: 30, borderTop: '1px solid #EBEEF1', paddingTop: 22 }}>
                <NotitieVeld objectId={objectId} initieleNotitie={notitie} />
              </div>
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
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Mail naar geïnteresseerde</h2>
                  <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 16px', lineHeight: 1.5 }}>Stuur de brochure + follow-up direct naar een koper.</p>
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
