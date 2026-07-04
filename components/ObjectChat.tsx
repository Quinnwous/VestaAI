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

  // Lead-formulier
  const [toonForm, setToonForm] = useState(false)
  const [verzonden, setVerzonden] = useState(false)
  const [afgewezen, setAfgewezen] = useState(false)
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [leadBericht, setLeadBericht] = useState('')
  const [verzendt, setVerzendt] = useState(false)
  const [leadFout, setLeadFout] = useState<string | null>(null)

  const aantalVragen = berichten.filter(b => b.rol === 'user').length
  // Zachte prompt nadat er echt interesse blijkt (≥2 vragen), zolang niet verzonden of weggeklikt.
  const toonCta = aantalVragen >= 2 && !verzonden && !afgewezen

  useEffect(() => {
    bodemRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [berichten, laden, toonForm, verzonden])

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

  const verstuurLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || verzendt) return
    setLeadFout(null)
    setVerzendt(true)
    // Zonder eigen boodschap: laatste paar chatberichten als context meesturen.
    const context = leadBericht.trim() || berichten.slice(-4).map(b => `${b.rol === 'user' ? 'Vraag' : 'Antwoord'}: ${b.tekst}`).join('\n')
    try {
      const res = await fetch('/api/chat/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_id: objectId,
          naam: naam.trim() || undefined,
          email: email.trim(),
          telefoon: telefoon.trim() || undefined,
          bericht: context || undefined,
        }),
      })
      if (!res.ok) {
        setLeadFout('Versturen mislukt. Controleer je e-mailadres en probeer het opnieuw.')
        return
      }
      setVerzonden(true)
      setToonForm(false)
    } catch {
      setLeadFout('Versturen mislukt. Probeer het zo nog eens.')
    } finally {
      setVerzendt(false)
    }
  }

  const veld: React.CSSProperties = {
    width: '100%', borderRadius: 10, border: '1px solid #DCE5E0', padding: '10px 12px',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
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

        {/* Bedankt-staat na een verstuurde lead */}
        {verzonden && (
          <div style={{ alignSelf: 'stretch', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 2 }}>Bedankt! ✓</p>
            <p style={{ fontSize: 13.5, color: '#166534', lineHeight: 1.5 }}>Je gegevens zijn doorgestuurd naar de makelaar. Je hoort snel iets.</p>
          </div>
        )}

        <div ref={bodemRef} />
      </div>

      {/* Zachte call-to-action zodra er interesse blijkt */}
      {toonCta && !toonForm && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#F8FAF9', border: '1px solid #E9EFEB', marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: '#5A6B61' }}>Interesse in deze woning?</p>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => setAfgewezen(true)} style={{ background: 'none', border: 'none', color: '#9AA6A0', fontSize: 13, cursor: 'pointer' }}>Later</button>
            <button type="button" onClick={() => setToonForm(true)} style={{ borderRadius: 9, background: kleur, color: '#fff', border: 'none', padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Plan een bezichtiging</button>
          </div>
        </div>
      )}

      {/* Lead-formulier */}
      {toonForm && !verzonden && (
        <form onSubmit={verstuurLead} style={{ padding: '14px', borderRadius: 14, background: '#F8FAF9', border: '1px solid #E9EFEB', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0E1A13' }}>Laat je gegevens achter</p>
          <p style={{ fontSize: 12.5, color: '#9AA6A0', marginTop: -4, marginBottom: 2, lineHeight: 1.5 }}>De makelaar neemt contact met je op over {adres}.</p>
          <input value={naam} onChange={e => setNaam(e.target.value)} placeholder="Naam (optioneel)" maxLength={100} style={veld} />
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="E-mailadres" maxLength={200} style={veld} />
          <input value={telefoon} onChange={e => setTelefoon(e.target.value)} type="tel" placeholder="Telefoon (optioneel)" maxLength={40} style={veld} />
          <textarea value={leadBericht} onChange={e => setLeadBericht(e.target.value)} placeholder="Bericht (optioneel)" maxLength={1000} rows={2} style={{ ...veld, resize: 'vertical' }} />
          {leadFout && <p style={{ fontSize: 12.5, color: '#DC2626' }}>{leadFout}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={verzendt || !email.trim()} style={{ flex: 1, borderRadius: 10, background: kleur, color: '#fff', border: 'none', padding: '10px', fontSize: 14, fontWeight: 700, cursor: verzendt ? 'default' : 'pointer', opacity: verzendt || !email.trim() ? 0.6 : 1 }}>
              {verzendt ? 'Versturen…' : 'Versturen'}
            </button>
            <button type="button" onClick={() => setToonForm(false)} style={{ borderRadius: 10, background: '#fff', color: '#5A6B61', border: '1px solid #DCE5E0', padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Annuleer
            </button>
          </div>
        </form>
      )}

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
