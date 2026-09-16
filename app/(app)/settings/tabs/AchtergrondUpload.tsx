'use client'

import { useRef, useState } from 'react'
import { uploadAchtergrond } from '../actions'

/**
 * Sfeerbeeld van het kantoor (team links, pand rechts) dat als licht watermerk in de
 * zijmarges van de ingelogde omgeving staat. Staand beeld werkt het beste — de marges
 * zijn hoge, smalle stroken.
 */
type Slot = 'primair' | 'secundair'

function Vak({ kantoorId, slot, label, hint, huidigUrl }: {
  kantoorId: string
  slot: Slot
  label: string
  hint: string
  huidigUrl: string | null
}) {
  const [preview, setPreview] = useState<string | null>(huidigUrl)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle')
  const [fout, setFout] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const kies = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setStatus('uploading')
    setFout('')

    const formData = new FormData()
    formData.append('achtergrond', file)
    formData.append('kantoor_id', kantoorId)
    formData.append('slot', slot)

    const resultaat = await uploadAchtergrond(formData)

    if (resultaat.ok) {
      setStatus('ok')
      if (resultaat.url) setPreview(resultaat.url)
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setFout(resultaat.error ?? 'Upload mislukt')
      setStatus('error')
      setPreview(huidigUrl)
    }
  }

  return (
    <div style={{ flex: 1, minWidth: 190 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#41494F', margin: '0 0 8px' }}>{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          height: 108, borderRadius: 'var(--merk-radius-md, 12px)', cursor: 'pointer',
          border: `2px dashed ${preview ? 'var(--merk-rand, #DDE1E5)' : '#DDE1E5'}`,
          background: preview ? `center / cover no-repeat url(${preview})` : '#F7F8F9',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {!preview && <span style={{ fontSize: 12.5, color: '#98A0A6', marginBottom: 42 }}>Nog geen beeld</span>}
      </div>
      <div style={{ fontSize: 12.5, marginTop: 7 }}>
        {status === 'uploading' && <span style={{ color: 'var(--merk)' }}>Uploaden…</span>}
        {status === 'ok' && <span style={{ color: 'var(--merk)' }}>Opgeslagen</span>}
        {status === 'error' && <span style={{ color: '#C0392B' }}>{fout}</span>}
        {status === 'idle' && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--merk)', textDecoration: 'underline' }}
            >
              {preview ? 'Vervangen' : 'Beeld kiezen'}
            </button>
            <p style={{ color: '#98A0A6', margin: '2px 0 0', fontSize: 11.5 }}>{hint}</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={kies} style={{ display: 'none' }} />
    </div>
  )
}

export function AchtergrondUpload({ kantoorId, huidigPrimair, huidigSecundair }: {
  kantoorId: string
  huidigPrimair: string | null
  huidigSecundair: string | null
}) {
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#41494F', margin: '0 0 4px' }}>Sfeerbeeld in de zijmarges</p>
      <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 12px', lineHeight: 1.5 }}>
        Verschijnt licht vervaagd links en rechts van het werkscherm op brede schermen. Staande foto&apos;s
        van je team of je pand werken het beste; laat je ze leeg, dan blijft de achtergrond effen.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Vak kantoorId={kantoorId} slot="primair" label="Links" hint="JPG, PNG of WebP · max 5 MB" huidigUrl={huidigPrimair} />
        <Vak kantoorId={kantoorId} slot="secundair" label="Rechts" hint="JPG, PNG of WebP · max 5 MB" huidigUrl={huidigSecundair} />
      </div>
    </div>
  )
}
