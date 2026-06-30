'use client'

import { useState, useRef } from 'react'

interface Props {
  objectId: string
}

export function FotoVerbetering({ objectId }: Props) {
  const [fotos, setFotos] = useState<string[]>([])
  const [uploaden, setUploaden] = useState(false)
  const [error, setError] = useState('')
  const [geconfigureerd, setGeconfigureerd] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return

    setUploaden(true)
    setError('')

    const fd = new FormData()
    fd.append('foto', bestand)
    fd.append('object_id', objectId)

    const res = await fetch('/api/fotos/verbeter', { method: 'POST', body: fd })
    const data = await res.json()

    if (res.status === 503) {
      setGeconfigureerd(false)
      setError(data.error)
    } else if (res.ok && data.url) {
      setFotos(prev => [...prev, data.url])
    } else {
      setError(data.error ?? 'Upload mislukt')
    }

    setUploaden(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!geconfigureerd) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">Foto-verbetering nog niet geconfigureerd</p>
        <p className="text-xs text-amber-700 mt-1">
          Voeg <code className="bg-amber-100 px-1 rounded">CLOUDFLARE_ACCOUNT_ID</code> en{' '}
          <code className="bg-amber-100 px-1 rounded">CLOUDFLARE_IMAGES_TOKEN</code> toe aan uw{' '}
          <code className="bg-amber-100 px-1 rounded">.env.local</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          id="foto-upload"
        />
        <label
          htmlFor="foto-upload"
          className={`inline-flex items-center gap-2 text-sm rounded-lg border border-gray-300 px-4 py-2 cursor-pointer hover:border-gray-400 transition-colors ${uploaden ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {uploaden ? 'Uploaden en verbeteren...' : 'Foto uploaden en verbeteren (JPG/PNG/WebP, max 20 MB)'}
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {fotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {fotos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Verbeterde foto ${i + 1}`} className="object-cover w-full h-full" />
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-1.5 right-1.5 bg-white/90 rounded-lg px-2 py-1 text-xs text-gray-700 hover:bg-white transition-colors shadow-sm"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">Upload een woningfoto om deze automatisch te verbeteren (belichting, kadrering, HDR).</p>
          <p className="text-xs text-gray-400 mt-1">Ondersteunde formaten: JPG, PNG, WebP — max 20 MB</p>
        </div>
      )}
    </div>
  )
}
