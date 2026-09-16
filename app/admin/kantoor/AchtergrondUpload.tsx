'use client'

import { useRef, useState } from 'react'
import { uploadAchtergrondAlsAdmin } from '../actions'

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

    const resultaat = await uploadAchtergrondAlsAdmin(formData)

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
      <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          height: 108, borderRadius: 12, cursor: 'pointer',
          border: '2px dashed #DDE1E5',
          background: preview ? `center / cover no-repeat url(${preview})` : '#F7F8F9',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {!preview && <span style={{ fontSize: 12.5, color: '#98A0A6', marginBottom: 42 }}>Nog geen beeld</span>}
      </div>
      <div style={{ fontSize: 12.5, marginTop: 7 }}>
        {status === 'uploading' && <span className="text-gray-700">Uploaden…</span>}
        {status === 'ok' && <span className="text-green-700">Opgeslagen</span>}
        {status === 'error' && <span style={{ color: '#C0392B' }}>{fout}</span>}
        {status === 'idle' && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-gray-700 underline font-semibold"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
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
      <p className="text-sm font-medium text-gray-700 mb-1">Sfeerbeeld in de zijmarges</p>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        Verschijnt licht vervaagd links en rechts van het werkscherm op brede schermen. Staande foto&apos;s
        van het team of pand werken het beste; leeg = effen achtergrond.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Vak kantoorId={kantoorId} slot="primair" label="Links" hint="JPG, PNG of WebP · max 5 MB" huidigUrl={huidigPrimair} />
        <Vak kantoorId={kantoorId} slot="secundair" label="Rechts" hint="JPG, PNG of WebP · max 5 MB" huidigUrl={huidigSecundair} />
      </div>
    </div>
  )
}
