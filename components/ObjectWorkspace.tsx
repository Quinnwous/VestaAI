'use client'

import { useState } from 'react'
import { ResultTabs } from '@/components/ResultTabs'
import { NotitieVeld } from '@/components/NotitieVeld'
import { FotoVerbetering } from '@/components/FotoVerbetering'
import { VirtualStaging } from '@/components/VirtualStaging'
import { DocumentenAssistent } from '@/components/DocumentenAssistent'
import { EmailPdfButton } from '@/components/EmailPdfButton'
import { RealworksExportButton } from '@/components/RealworksExportButton'
import { PrijswijzigingModal } from '@/components/PrijswijzigingModal'
import type { ContentOutput } from '@/lib/schemas'

type SectionId = 'content' | 'media' | 'documenten' | 'export'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'media', label: "Foto's & staging" },
  { id: 'documenten', label: 'Documenten' },
  { id: 'export', label: 'Export & delen' },
]

const card: React.CSSProperties = {
  borderRadius: 20,
  background: '#fff',
  border: '1px solid #E9EFEB',
  padding: '28px',
  boxShadow: '0 2px 16px rgba(14,26,19,.05)',
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

  return (
    <div>
      {/* Sectie-navigatie */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E9EFEB', marginBottom: 20, overflowX: 'auto' }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              padding: '10px 16px', fontSize: 14, whiteSpace: 'nowrap',
              fontWeight: active === s.id ? 700 : 500, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: active === s.id ? '2px solid #1A6B45' : '2px solid transparent',
              color: active === s.id ? '#1A6B45' : '#9AA6A0',
              transition: 'all .15s', marginBottom: -1,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content — altijd gemount zodat inline-bewerkingen niet verloren gaan bij wisselen */}
      <div style={{ display: active === 'content' ? 'block' : 'none' }}>
        <div style={{ ...card, marginBottom: 16 }}>
          <ResultTabs data={outputs} objectId={objectId} onResetHref="/dashboard" />
        </div>
        <NotitieVeld objectId={objectId} initieleNotitie={notitie} />
      </div>

      {/* Foto's & staging */}
      <div style={{ display: active === 'media' ? 'block' : 'none' }}>
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Foto verbeteren</h2>
          <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Upload een woning- of kamerfoto en ontvang een verbeterde versie (belichting, scherpte, perspectief).</p>
          <FotoVerbetering objectId={objectId} />
          <div style={{ borderTop: '1px solid #E9EFEB', paddingTop: 24, marginTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Virtual staging</h2>
            <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Upload een lege kamer en ontvang een gemeubileerde versie via AI.</p>
            <VirtualStaging />
          </div>
        </div>
      </div>

      {/* Documenten */}
      <div style={{ display: active === 'documenten' ? 'block' : 'none' }}>
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Documenten-assistent</h2>
          <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Upload VvE-notulen, een leveringsakte, koopakte of meetrapport en stel er vragen over via AI.</p>
          <DocumentenAssistent objectId={objectId} />
        </div>
      </div>

      {/* Export & delen */}
      <div style={{ display: active === 'export' ? 'block' : 'none' }}>
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Exporteren & delen</h2>
          <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 20 }}>Mail de content als PDF, exporteer naar Realworks of maak een prijswijziging-bericht.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <EmailPdfButton objectId={objectId} userEmail={userEmail} />
            <RealworksExportButton objectId={objectId} />
            <PrijswijzigingModal objectId={objectId} adres={address} huidigeprijs={vraagprijs} />
          </div>
        </div>
      </div>
    </div>
  )
}
