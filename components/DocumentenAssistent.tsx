'use client'

import { useState, useRef, useEffect } from 'react'

type Document = {
  id: string
  bestandsnaam: string
  grootte_bytes: number
  anthropic_file_id: string | null
  publiek_chatbaar: boolean
}

type ChatBericht = { rol: 'user' | 'assistant'; tekst: string }

interface Props {
  objectId: string
}

function formatGrootte(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function DocumentenAssistent({ objectId }: Props) {
  const [documenten, setDocumenten] = useState<Document[]>([])
  const [geselecteerd, setGeselecteerd] = useState<Document | null>(null)
  const [chat, setChat] = useState<ChatBericht[]>([])
  const [vraag, setVraag] = useState('')
  const [uploaden, setUploaden] = useState(false)
  const [beantwoorden, setBeantwoorden] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Bestaande documenten van dit object laden (bleven voorheen onzichtbaar bij heropenen).
  useEffect(() => {
    fetch(`/api/documenten?object_id=${objectId}`)
      .then(r => r.json())
      .then((d: { documenten?: Document[] }) => setDocumenten(d.documenten ?? []))
      .catch(() => {})
  }, [objectId])

  const togglePubliek = async (doc: Document) => {
    const nieuw = !doc.publiek_chatbaar
    setDocumenten(prev => prev.map(d => (d.id === doc.id ? { ...d, publiek_chatbaar: nieuw } : d)))
    setGeselecteerd(prev => (prev && prev.id === doc.id ? { ...prev, publiek_chatbaar: nieuw } : prev))
    await fetch(`/api/documenten/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publiek_chatbaar: nieuw }),
    }).catch(() => {})
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setUploaden(true)
    setUploadError('')

    const fd = new FormData()
    fd.append('bestand', bestand)
    fd.append('object_id', objectId)

    const res = await fetch('/api/documenten/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const doc = await res.json()
      const nieuwDoc: Document = { ...doc, publiek_chatbaar: false }
      setDocumenten(prev => [...prev, nieuwDoc])
      setGeselecteerd(nieuwDoc)
      setChat([])
    } else {
      const { error } = await res.json()
      setUploadError(error ?? 'Upload mislukt')
    }
    setUploaden(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleVraag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!geselecteerd || !vraag.trim()) return

    const ingevoerd = vraag.trim()
    setVraag('')
    setChat(prev => [...prev, { rol: 'user', tekst: ingevoerd }])
    setBeantwoorden(true)

    const res = await fetch('/api/documenten/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: geselecteerd.id, vraag: ingevoerd }),
    })

    if (res.ok) {
      const { antwoord } = await res.json()
      setChat(prev => [...prev, { rol: 'assistant', tekst: antwoord }])
    } else {
      setChat(prev => [...prev, { rol: 'assistant', tekst: 'Er ging iets mis. Probeer het opnieuw.' }])
    }
    setBeantwoorden(false)
  }

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleUpload}
          className="hidden"
          id="doc-upload"
        />
        <label
          htmlFor="doc-upload"
          className={`inline-flex items-center gap-2 text-sm rounded-lg border border-gray-300 px-4 py-2 cursor-pointer hover:border-gray-400 transition-colors ${uploaden ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {uploaden ? 'Uploaden...' : 'Document uploaden (PDF/TXT, max 10 MB)'}
        </label>
      </div>

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {/* Geselecteerd document */}
      {documenten.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {documenten.map(doc => (
            <button
              key={doc.id}
              onClick={() => { setGeselecteerd(doc); setChat([]) }}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                geselecteerd?.id === doc.id
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {doc.bestandsnaam}
              <span className="text-gray-400">({formatGrootte(doc.grootte_bytes)})</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat-interface */}
      {geselecteerd && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-600">
              Vragen stellen over: <span className="text-gray-900">{geselecteerd.bestandsnaam}</span>
              {!geselecteerd.anthropic_file_id && (
                <span className="ml-2 text-amber-600">(documentinhoud wordt per vraag meegestuurd)</span>
              )}
            </p>
            <label className="mt-2 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={geselecteerd.publiek_chatbaar}
                onChange={() => togglePubliek(geselecteerd)}
                className="mt-0.5 rounded border-gray-300"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Zichtbaar in de <strong className="text-gray-700">publieke woning-chatbot</strong> — geïnteresseerden kunnen dan vragen over dit document stellen.
                {geselecteerd.publiek_chatbaar
                  ? <span className="text-green-600 font-semibold"> Staat aan.</span>
                  : <span className="text-gray-400"> Staat uit (privé).</span>}
              </span>
            </label>
          </div>

          {/* Berichten */}
          {chat.length > 0 && (
            <div className="px-4 py-4 space-y-4 max-h-80 overflow-y-auto">
              {chat.map((b, i) => (
                <div key={i} className={`flex ${b.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    b.rol === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap">{b.tekst}</p>
                  </div>
                </div>
              ))}
              {beantwoorden && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {chat.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              <p>Stel een vraag over dit document.</p>
              <p className="text-xs mt-1">Bijv. &quot;Zijn er achterstallige VVE-bijdragen?&quot; of &quot;Wat staat er in de erfpachtclausule?&quot;</p>
            </div>
          )}

          {/* Invoer */}
          <form onSubmit={handleVraag} className="border-t border-gray-100 flex gap-2 p-3">
            <input
              type="text"
              value={vraag}
              onChange={e => setVraag(e.target.value)}
              disabled={beantwoorden}
              placeholder="Stel een vraag over dit document..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={beantwoorden || !vraag.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Vraag
            </button>
          </form>
        </div>
      )}

      {documenten.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">Upload een VVE-notulen, leveringsakte of ander juridisch document om vragen te stellen via AI.</p>
          <p className="text-xs text-gray-400 mt-1">Ondersteunde formaten: PDF, TXT — max 10 MB</p>
        </div>
      )}
    </div>
  )
}
