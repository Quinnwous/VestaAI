'use client'

import { useEffect, useState, useCallback } from 'react'

type Foto = {
  id: string
  url: string
  soort: string
  bestandsnaam: string | null
  created_at: string
}

const SOORT_LABEL: Record<string, string> = {
  origineel: 'Origineel',
  verbeterd: 'Verbeterd',
  gestaged: 'Staging',
}

export function FotoBibliotheek({ objectId, refreshSignal }: { objectId: string; refreshSignal: number }) {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [geladen, setGeladen] = useState(false)
  const [coverId, setCoverId] = useState<string | null>(null)

  const laad = useCallback(() => {
    fetch(`/api/object/${objectId}/fotos`)
      .then(r => r.json())
      .then((d: { fotos?: Foto[] }) => setFotos(d.fotos ?? []))
      .catch(() => {})
      .finally(() => setGeladen(true))
  }, [objectId])

  useEffect(() => { laad() }, [laad, refreshSignal])

  const verwijder = async (id: string) => {
    setFotos(prev => prev.filter(f => f.id !== id))
    await fetch(`/api/object/${objectId}/fotos/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const alsChatCover = async (foto: Foto) => {
    setCoverId(foto.id)
    await fetch(`/api/object/${objectId}/chat-instellingen`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_foto_url: foto.url }),
    }).catch(() => setCoverId(null))
  }

  const download = (foto: Foto) => {
    const a = document.createElement('a')
    a.href = foto.url
    a.download = foto.bestandsnaam || `${foto.soort}.jpg`
    a.target = '_blank'
    a.click()
  }

  if (geladen && fotos.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#9AA6A0' }}>
        Nog geen bewaarde foto&apos;s. Gebruik &ldquo;Bewaar in bibliotheek&rdquo; bij een verbeterde of gestagede foto.
      </p>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
      {fotos.map(foto => (
        <div key={foto.id} style={{ border: '1px solid #E9EFEB', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#0E1A13' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt={foto.bestandsnaam ?? 'Woningfoto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.55)', borderRadius: 6, padding: '2px 7px' }}>
              {SOORT_LABEL[foto.soort] ?? foto.soort}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 9px' }}>
            <button onClick={() => download(foto)} style={{ background: 'none', border: 'none', color: '#1A6B45', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              Download ↓
            </button>
            <button onClick={() => verwijder(foto.id)} aria-label="Verwijderen" style={{ background: 'none', border: 'none', color: '#B91C1C', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              Verwijder
            </button>
          </div>
          <div style={{ borderTop: '1px solid #F1F4F2', padding: '6px 9px' }}>
            <button
              onClick={() => alsChatCover(foto)}
              disabled={coverId === foto.id}
              style={{ background: 'none', border: 'none', color: coverId === foto.id ? '#166534' : '#5A6B61', fontSize: 12, fontWeight: 600, cursor: coverId === foto.id ? 'default' : 'pointer' }}
            >
              {coverId === foto.id ? 'Chat-cover ✓' : 'Als chat-cover'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
