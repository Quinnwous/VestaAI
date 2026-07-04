'use client'

import { useState, useEffect, useRef } from 'react'

const card: React.CSSProperties = {
  borderRadius: 20,
  background: '#fff',
  border: '1px solid #E9EFEB',
  padding: '28px',
  boxShadow: '0 2px 16px rgba(14,26,19,.05)',
}

export function DeelChatbot({ objectId }: { objectId: string }) {
  const [chatLink, setChatLink] = useState('')
  const [gekopieerd, setGekopieerd] = useState(false)
  const [publiek, setPubliek] = useState<boolean | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [uploaden, setUploaden] = useState(false)
  const [fout, setFout] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setChatLink(`${window.location.origin}/chat/${objectId}`)
    fetch(`/api/object/${objectId}/chat-instellingen`)
      .then(r => r.json())
      .then((d: { chat_publiek?: boolean; chat_foto_url?: string | null }) => {
        setPubliek(d.chat_publiek ?? true)
        setFotoUrl(d.chat_foto_url ?? null)
      })
      .catch(() => setPubliek(true))
  }, [objectId])

  const kopieer = () => {
    if (!chatLink) return
    navigator.clipboard.writeText(chatLink).then(() => {
      setGekopieerd(true)
      setTimeout(() => setGekopieerd(false), 2000)
    })
  }

  const toggle = async () => {
    const nieuw = !(publiek ?? true)
    setPubliek(nieuw)
    await fetch(`/api/object/${objectId}/chat-instellingen`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_publiek: nieuw }),
    }).catch(() => setPubliek(!nieuw))
  }

  const uploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setUploaden(true)
    setFout('')
    const fd = new FormData()
    fd.append('foto', bestand)
    const res = await fetch(`/api/object/${objectId}/foto`, { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setFotoUrl(url)
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Upload mislukt' }))
      setFout(error ?? 'Upload mislukt')
    }
    setUploaden(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const verwijderFoto = async () => {
    setFotoUrl(null)
    await fetch(`/api/object/${objectId}/foto`, { method: 'DELETE' }).catch(() => {})
  }

  const isPubliek = publiek ?? true

  return (
    <div style={card}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Deelbare object-chatbot</h2>
      <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 18, lineHeight: 1.6 }}>
        Deel deze link met geïnteresseerden via e-mail, WhatsApp of je Funda-reactie. Zij kunnen vragen stellen
        over déze woning — de chatbot antwoordt op basis van de woninggegevens. Geen aanpassing aan je eigen site nodig.
      </p>

      {/* Aan/uit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#F8FAF9', border: '1px solid #E9EFEB', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0E1A13' }}>Chatbot openbaar delen</p>
          <p style={{ fontSize: 12.5, color: '#9AA6A0' }}>{isPubliek ? 'Aan — de link hieronder werkt.' : 'Uit — bezoekers zien "niet beschikbaar".'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPubliek}
          onClick={toggle}
          disabled={publiek === null}
          style={{ position: 'relative', width: 46, height: 26, borderRadius: 999, border: 'none', cursor: publiek === null ? 'default' : 'pointer', background: isPubliek ? '#1A6B45' : '#CBD5D0', transition: 'background .15s', flexShrink: 0 }}
        >
          <span style={{ position: 'absolute', top: 3, left: isPubliek ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
        </button>
      </div>

      {/* Link */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: isPubliek ? 1 : 0.5 }}>
        <input
          readOnly
          value={chatLink}
          onFocus={e => e.currentTarget.select()}
          style={{ flex: '1 1 260px', borderRadius: 11, border: '1px solid #DCE5E0', padding: '10px 12px', fontSize: 13, color: '#5A6B61', fontFamily: 'monospace', background: '#F8FAF9' }}
        />
        <button
          onClick={kopieer}
          type="button"
          disabled={!isPubliek}
          style={{ borderRadius: 11, background: '#1A6B45', color: '#fff', border: 'none', padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: isPubliek ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
        >
          {gekopieerd ? 'Gekopieerd ✓' : 'Kopieer link'}
        </button>
      </div>
      {isPubliek && chatLink && (
        <a href={chatLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 700, color: '#1A6B45', textDecoration: 'underline' }}>
          Open voorbeeld →
        </a>
      )}

      {/* Cover-foto */}
      <div style={{ borderTop: '1px solid #E9EFEB', marginTop: 20, paddingTop: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 4 }}>Foto op de chatpagina</p>
        <p style={{ fontSize: 12.5, color: '#9AA6A0', marginBottom: 12, lineHeight: 1.6 }}>Toon een foto van de woning bovenaan de chatpagina. Optioneel — JPG, PNG of WebP, max 5 MB.</p>

        {fotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt="Cover" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, border: '1px solid #E9EFEB', marginBottom: 12 }} />
        )}

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadFoto} style={{ display: 'none' }} id={`foto-${objectId}`} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label
            htmlFor={`foto-${objectId}`}
            style={{ display: 'inline-block', borderRadius: 11, border: '1px solid #DCE5E0', padding: '9px 16px', fontSize: 13.5, fontWeight: 600, color: '#0E1A13', cursor: uploaden ? 'default' : 'pointer', background: '#fff', opacity: uploaden ? 0.6 : 1 }}
          >
            {uploaden ? 'Uploaden…' : fotoUrl ? 'Foto vervangen' : 'Foto uploaden'}
          </label>
          {fotoUrl && (
            <button type="button" onClick={verwijderFoto} style={{ borderRadius: 11, border: '1px solid #F0D5D5', padding: '9px 16px', fontSize: 13.5, fontWeight: 600, color: '#DC2626', cursor: 'pointer', background: '#fff' }}>
              Verwijderen
            </button>
          )}
        </div>
        {fout && <p style={{ fontSize: 12.5, color: '#DC2626', marginTop: 8 }}>{fout}</p>}
      </div>
    </div>
  )
}
