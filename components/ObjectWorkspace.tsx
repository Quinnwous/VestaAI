'use client'

import { useState, useEffect } from 'react'
import { ResultTabs } from '@/components/ResultTabs'
import { NotitieVeld } from '@/components/NotitieVeld'
import { FotoVerbetering } from '@/components/FotoVerbetering'
import { VirtualStaging } from '@/components/VirtualStaging'
import { DocumentenAssistent } from '@/components/DocumentenAssistent'
import { EmailPdfButton } from '@/components/EmailPdfButton'
import { RealworksExportButton } from '@/components/RealworksExportButton'
import { PrijswijzigingModal } from '@/components/PrijswijzigingModal'
import type { ContentOutput } from '@/lib/schemas'

type SectionId = 'content' | 'media' | 'documenten' | 'chat' | 'export'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'media', label: "Foto's & staging" },
  { id: 'documenten', label: 'Documenten' },
  { id: 'chat', label: 'Deel-chatbot' },
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
  const [chatLink, setChatLink] = useState('')
  const [gekopieerd, setGekopieerd] = useState(false)
  useEffect(() => { setChatLink(`${window.location.origin}/chat/${objectId}`) }, [objectId])
  const kopieerLink = () => {
    if (!chatLink) return
    navigator.clipboard.writeText(chatLink).then(() => {
      setGekopieerd(true)
      setTimeout(() => setGekopieerd(false), 2000)
    })
  }

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

      {/* Deel-chatbot */}
      <div style={{ display: active === 'chat' ? 'block' : 'none' }}>
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Deelbare object-chatbot</h2>
          <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16, lineHeight: 1.6 }}>
            Deel deze link met geïnteresseerden via e-mail, WhatsApp of je Funda-reactie. Zij kunnen vragen stellen
            over déze woning — de chatbot antwoordt op basis van de woninggegevens. Geen aanpassing aan je eigen site nodig.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              readOnly
              value={chatLink}
              onFocus={e => e.currentTarget.select()}
              style={{ flex: '1 1 260px', borderRadius: 11, border: '1px solid #DCE5E0', padding: '10px 12px', fontSize: 13, color: '#5A6B61', fontFamily: 'monospace', background: '#F8FAF9' }}
            />
            <button
              onClick={kopieerLink}
              type="button"
              style={{ borderRadius: 11, background: '#1A6B45', color: '#fff', border: 'none', padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {gekopieerd ? 'Gekopieerd ✓' : 'Kopieer link'}
            </button>
          </div>
          {chatLink && (
            <a
              href={chatLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 14, fontSize: 13, fontWeight: 700, color: '#1A6B45', textDecoration: 'underline' }}
            >
              Open voorbeeld →
            </a>
          )}
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
