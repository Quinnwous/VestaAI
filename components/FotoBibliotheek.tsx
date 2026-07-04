'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

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
  const [uploaden, setUploaden] = useState(false)
  const [uploadFout, setUploadFout] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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

  const uploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setUploaden(true)
    setUploadFout('')
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('lezen mislukt'))
      reader.readAsDataURL(bestand)
    }).catch(() => '')

    if (dataUrl) {
      const res = await fetch(`/api/object/${objectId}/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, soort: 'origineel', bestandsnaam: bestand.name }),
      }).catch(() => null)
      if (res?.ok) {
        laad()
      } else {
        const { error } = (await res?.json().catch(() => ({}))) ?? {}
        setUploadFout(error ?? 'Upload mislukt (JPG/PNG/WebP, max 12 MB).')
      }
    } else {
      setUploadFout('Kon het bestand niet lezen.')
    }
    setUploaden(false)
    if (fileRef.current) fileRef.current.value = ''
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

  return (
    <div>
      {/* Upload-balk */}
      <div style={{ marginBottom: 14 }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadFoto} style={{ display: 'none' }} id={`bib-upload-${objectId}`} />
        <label
          htmlFor={`bib-upload-${objectId}`}
          style={{ display: 'inline-block', borderRadius: 11, border: '1px solid #DCE5E0', padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#0E1A13', cursor: uploaden ? 'default' : 'pointer', background: '#fff', opacity: uploaden ? 0.6 : 1 }}
        >
          {uploaden ? 'Uploaden…' : '+ Foto uploaden'}
        </label>
        {uploadFout && <p style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 8 }}>{uploadFout}</p>}
      </div>

      {geladen && fotos.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9AA6A0' }}>
          Nog geen bewaarde foto&apos;s. Upload er een, of gebruik &ldquo;Bewaar in bibliotheek&rdquo; bij een verbeterde of gestagede foto.
        </p>
      ) : (
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
      )}
    </div>
  )
}
