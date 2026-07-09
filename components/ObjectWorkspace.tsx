'use client'

import { useState } from 'react'
import { ResultTabs } from '@/components/ResultTabs'
import { NotitieVeld } from '@/components/NotitieVeld'
import { FotoVerbetering } from '@/components/FotoVerbetering'
import { VirtualStaging } from '@/components/VirtualStaging'
import { DocumentenAssistent } from '@/components/DocumentenAssistent'
import { FotoBibliotheek } from '@/components/FotoBibliotheek'
import { EmailPdfButton } from '@/components/EmailPdfButton'
import { RealworksExportButton } from '@/components/RealworksExportButton'
import { PrijswijzigingModal } from '@/components/PrijswijzigingModal'
import { DeelChatbot } from '@/components/DeelChatbot'
import { TabBar } from '@/components/ui'
import type { ContentOutput } from '@/lib/schemas'

type SectionId = 'content' | 'media' | 'documenten' | 'chat' | 'export'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'documenten', label: 'Documenten' },
  { id: 'chat', label: 'Chatbot' },
  { id: 'export', label: 'Export' },
]

const card: React.CSSProperties = {
  borderRadius: 18,
  background: '#fff',
  border: '1px solid #E9EFEB',
  padding: 22,
  boxShadow: '0 2px 12px rgba(14,26,19,.04)',
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
  const [active, setActive] = useState<SectionId>('content')
  const [fotoRefresh, setFotoRefresh] = useState(0)

  return (
    <div>
      {/* Sectie-navigatie */}
      <TabBar
        tabs={SECTIONS}
        active={active}
        onChange={(id) => setActive(id as SectionId)}
        style={{ margin: '24px 0 26px' }}
      />

      {/* Content — altijd gemount zodat inline-bewerkingen niet verloren gaan bij wisselen */}
      <div style={{ display: active === 'content' ? 'block' : 'none' }}>
        <ResultTabs data={outputs} objectId={objectId} onResetHref="/dashboard" />
        <div style={{ marginTop: 30, borderTop: '1px solid #EEF2F0', paddingTop: 22 }}>
          <NotitieVeld objectId={objectId} initieleNotitie={notitie} />
        </div>
      </div>

      {/* Media — foto-verbetering + virtual staging + bibliotheek als losse kaarten */}
      <div style={{ display: active === 'media' ? 'block' : 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', margin: '0 0 4px' }}>Foto-verbetering</h2>
            <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 16px' }}>Licht, kleur en perspectief automatisch geoptimaliseerd.</p>
            <FotoVerbetering objectId={objectId} onBewaard={() => setFotoRefresh(n => n + 1)} />
          </div>
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', margin: '0 0 4px' }}>Virtual staging</h2>
            <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 16px' }}>Meubileer een lege ruimte met AI — kies stijl en ruimte.</p>
            <VirtualStaging objectId={objectId} onBewaard={() => setFotoRefresh(n => n + 1)} />
          </div>
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', margin: '0 0 4px' }}>Foto-bibliotheek</h2>
            <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 16px' }}>Bewaarde verbeterde en gestagede foto&apos;s bij deze woning — om te downloaden of hergebruiken.</p>
            <FotoBibliotheek objectId={objectId} refreshSignal={fotoRefresh} />
          </div>
        </div>
      </div>

      {/* Documenten */}
      <div style={{ display: active === 'documenten' ? 'block' : 'none' }}>
        <DocumentenAssistent objectId={objectId} />
      </div>

      {/* Deel-chatbot */}
      <div style={{ display: active === 'chat' ? 'block' : 'none' }}>
        <DeelChatbot objectId={objectId} />
      </div>

      {/* Export & delen */}
      <div style={{ display: active === 'export' ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', margin: '0 0 4px' }}>Mail naar geïnteresseerde</h2>
            <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 16px', lineHeight: 1.5 }}>Stuur de brochure + follow-up direct naar een koper.</p>
            <EmailPdfButton objectId={objectId} userEmail={userEmail} />
          </div>
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', margin: '0 0 4px' }}>Realworks-export</h2>
            <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 16px', lineHeight: 1.5 }}>Exporteer de objectdata als XML voor Realworks.</p>
            <RealworksExportButton objectId={objectId} />
          </div>
          <div style={{ ...card, gridColumn: 'span 2' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', margin: '0 0 4px' }}>Prijsaanpassing of verkocht — genereer aankondiging</h2>
            <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 16px', lineHeight: 1.5 }}>Maak in één klik social- en e-mailcontent voor een prijsreductie of verkoop.</p>
            <PrijswijzigingModal objectId={objectId} adres={address} huidigeprijs={vraagprijs} />
          </div>
        </div>
      </div>
    </div>
  )
}
