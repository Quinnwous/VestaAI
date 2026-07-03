'use client'

import { useState, useRef, useEffect } from 'react'

type Bericht = { rol: 'user' | 'assistant'; tekst: string }

export function ObjectChat({
  objectId,
  adres,
  kleur,
}: {
  objectId: string
  adres: string
  kleur: string
}) {
  const [berichten, setBerichten] = useState<Bericht[]>([
    { rol: 'assistant', tekst: `Hoi! Ik beantwoord graag je vragen over ${adres}. Wat wil je weten?` },
  ])
  const [invoer, setInvoer] = useState('')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const bodemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodemRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [berichten, laden])

  const verstuur = async (e: React.FormEvent) => {
    e.preventDefault()
    const tekst = invoer.trim()
    if (!tekst || laden) return
    setFout(null)
    const nieuw: Bericht[] = [...berichten, { rol: 'user', tekst }]
    setBerichten(nieuw)
    setInvoer('')
    setLaden(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: objectId, berichten: nieuw }),
      })
      if (res.status === 429) {
        setFout('Even wachten voor het volgende bericht.')
        return
      }
      if (!res.ok) {
        setFout('Er ging iets mis. Probeer het zo nog eens.')
        return
      }
      const data = (await res.json()) as { antwoord?: string }
      setBerichten(prev => [...prev, { rol: 'assistant', tekst: data.antwoord || 'Sorry, ik heb daar even geen antwoord op.' }])
    } catch {
      setFout('Er ging iets mis. Probeer het zo nog eens.')
    } finally {
      setLaden(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {berichten.map((b, i) => (
          <div
            key={i}
            style={{
              alignSelf: b.rol === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '82%',
              padding: '10px 14px',
              borderRadius: 16,
              fontSize: 14.5,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              background: b.rol === 'user' ? kleur : '#F1F4F2',
              color: b.rol === 'user' ? '#fff' : '#0E1A13',
              borderBottomRightRadius: b.rol === 'user' ? 4 : 16,
              borderBottomLeftRadius: b.rol === 'user' ? 16 : 4,
            }}
          >
            {b.tekst}
          </div>
        ))}
        {laden && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 16, background: '#F1F4F2', color: '#9AA6A0', fontSize: 14 }}>
            aan het typen…
          </div>
        )}
        {fout && <p style={{ fontSize: 13, color: '#DC2626', alignSelf: 'center' }}>{fout}</p>}
        <div ref={bodemRef} />
      </div>

      <form onSubmit={verstuur} style={{ display: 'flex', gap: 8, padding: '12px 4px 4px', borderTop: '1px solid #E9EFEB' }}>
        <input
          value={invoer}
          onChange={e => setInvoer(e.target.value)}
          placeholder="Stel je vraag over deze woning…"
          maxLength={500}
          style={{ flex: 1, borderRadius: 12, border: '1px solid #DCE5E0', padding: '11px 14px', fontSize: 14.5, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={laden || !invoer.trim()}
          style={{ borderRadius: 12, background: kleur, color: '#fff', border: 'none', padding: '0 18px', fontSize: 14.5, fontWeight: 700, cursor: laden ? 'default' : 'pointer', opacity: laden || !invoer.trim() ? 0.5 : 1 }}
        >
          Verstuur
        </button>
      </form>
    </div>
  )
}
