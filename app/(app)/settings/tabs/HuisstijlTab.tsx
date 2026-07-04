'use client'

import { useState, useEffect } from 'react'
import type { Kantoor } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'
import { slaHuisstijlOp } from '../actions'
import { LogoUpload } from './LogoUpload'

interface Props {
  kantoor: Kantoor
  isAdmin: boolean
}

function HuisstijlUpgradeBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-lg">
      <p className="text-sm font-semibold text-amber-900 mb-1">Huisstijlgeheugen — Pro-functie</p>
      <p className="text-sm text-amber-800 mb-4">
        Stel uw schrijftoon, slogan en voorbeeldteksten in. VestaAI leert de stijl van uw kantoor en past die automatisch toe bij elke generatie.
      </p>
      <a
        href="/api/stripe/checkout?plan=pro"
        className="inline-block rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
      >
        Upgrade naar Pro — €150/maand
      </a>
    </div>
  )
}

const SCHRIJFTONEN: { value: HuisstijlConfig['schrijftoon']; label: string; desc: string }[] = [
  { value: 'formeel', label: 'Formeel', desc: 'Professioneel en zakelijk' },
  { value: 'informeel', label: 'Informeel', desc: 'Toegankelijk en persoonlijk' },
  { value: 'enthousiast', label: 'Enthousiast', desc: 'Energiek en uitnodigend' },
]

export function HuisstijlTab({ kantoor, isAdmin }: Props) {
  const huidig = kantoor.huisstijl_json
  const [schrijftoon, setSchrijftoon] = useState<HuisstijlConfig['schrijftoon']>(
    huidig?.schrijftoon ?? 'informeel'
  )
  const [slogan, setSlogan] = useState(huidig?.slogan ?? '')
  const [primaire_kleur, setPrimaireKleur] = useState(huidig?.primaire_kleur ?? '#1A6B45')
  const [voorbeelden, setVoorbeelden] = useState<string[]>(
    huidig?.voorbeelden?.length ? huidig.voorbeelden : ['']
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [bezigUpload, setBezigUpload] = useState(false)
  const [uploadFout, setUploadFout] = useState('')

  // Leren van inline-bewerkingen
  const [leerAantal, setLeerAantal] = useState(0)
  const [leerMin, setLeerMin] = useState(4)
  const [leerBezig, setLeerBezig] = useState(false)
  const [leerRegels, setLeerRegels] = useState<string | null>(null)
  const [leerIds, setLeerIds] = useState<string[]>([])
  const [leerFout, setLeerFout] = useState('')
  const [leerKlaar, setLeerKlaar] = useState<'toegepast' | 'genegeerd' | null>(null)

  useEffect(() => {
    fetch('/api/huisstijl/leren')
      .then(r => r.json())
      .then((d: { aantal?: number; minimum?: number }) => { setLeerAantal(d.aantal ?? 0); if (d.minimum) setLeerMin(d.minimum) })
      .catch(() => {})
  }, [])

  const analyseerBewerkingen = async () => {
    setLeerBezig(true); setLeerFout(''); setLeerKlaar(null)
    const res = await fetch('/api/huisstijl/leren', { method: 'POST' })
    if (res.ok) {
      const { regels, ids } = (await res.json()) as { regels: string; ids: string[] }
      setLeerRegels(regels); setLeerIds(ids)
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Analyse mislukt' }))
      setLeerFout(error ?? 'Analyse mislukt')
    }
    setLeerBezig(false)
  }

  const rondLerenAf = async (accepteer: boolean) => {
    setLeerBezig(true); setLeerFout('')
    const res = await fetch('/api/huisstijl/leren/toepassen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: leerIds, ...(accepteer ? { regels: leerRegels } : {}) }),
    })
    if (res.ok) {
      setLeerRegels(null); setLeerIds([]); setLeerAantal(0)
      setLeerKlaar(accepteer ? 'toegepast' : 'genegeerd')
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Mislukt' }))
      setLeerFout(error ?? 'Mislukt')
    }
    setLeerBezig(false)
  }

  const updateVoorbeeld = (i: number, val: string) => {
    setVoorbeelden(prev => { const v = [...prev]; v[i] = val; return v })
  }
  const addVoorbeeld = () => setVoorbeelden(prev => (prev.length >= 20 ? prev : [...prev, '']))
  const removeVoorbeeld = (i: number) =>
    setVoorbeelden(prev => (prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i)))

  // Voorbeeld uploaden (PDF/TXT) i.p.v. plakken — de tekst wordt server-side geëxtraheerd.
  const uploadVoorbeeld = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setBezigUpload(true)
    setUploadFout('')
    const fd = new FormData()
    fd.append('bestand', bestand)
    const res = await fetch('/api/huisstijl/extract', { method: 'POST', body: fd })
    if (res.ok) {
      const { tekst } = (await res.json()) as { tekst?: string }
      if (tekst?.trim()) {
        setVoorbeelden(prev => {
          const schoon = prev.filter(Boolean)
          return [...schoon, tekst.trim().slice(0, 2000)].slice(0, 20)
        })
      } else {
        setUploadFout('Geen tekst gevonden in het bestand.')
      }
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Upload mislukt' }))
      setUploadFout(error ?? 'Upload mislukt')
    }
    setBezigUpload(false)
    e.target.value = ''
  }

  // Brochure-huisstijl (apart van de schrijfstijl hierboven)
  const [brochureVoorbeelden, setBrochureVoorbeelden] = useState<string[]>(
    huidig?.brochure_stijl?.voorbeelden?.length ? huidig.brochure_stijl.voorbeelden : []
  )
  const [slotTekst, setSlotTekst] = useState(huidig?.brochure_stijl?.slot_tekst ?? '')
  const updateBrochure = (i: number, val: string) =>
    setBrochureVoorbeelden(prev => { const v = [...prev]; v[i] = val; return v })
  const addBrochure = () => setBrochureVoorbeelden(prev => (prev.length >= 10 ? prev : [...prev, '']))
  const removeBrochure = (i: number) =>
    setBrochureVoorbeelden(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const broVb = brochureVoorbeelden.filter(Boolean)
    const result = await slaHuisstijlOp({
      schrijftoon,
      slogan,
      primaire_kleur,
      voorbeelden: voorbeelden.filter(Boolean),
      brochure_stijl: broVb.length || slotTekst.trim()
        ? { voorbeelden: broVb, ...(slotTekst.trim() ? { slot_tekst: slotTekst.trim() } : {}) }
        : undefined,
      kantoor_id: kantoor.id,
    })
    setStatus(result.ok ? 'saved' : 'error')
    if (result.ok) setTimeout(() => setStatus('idle'), 2000)
  }

  if (kantoor.plan === 'starter') {
    return <HuisstijlUpgradeBanner />
  }

  if (!isAdmin) {
    return <p className="text-sm text-gray-500">Alleen admins kunnen de huisstijl aanpassen.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Logo */}
      <LogoUpload kantoorId={kantoor.id} huidigUrl={kantoor.logo_url} />

      {/* Schrijftoon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Schrijftoon</label>
        <div className="grid grid-cols-3 gap-3">
          {SCHRIJFTONEN.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSchrijftoon(t.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                schrijftoon === t.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Slogan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slogan <span className="text-gray-400 font-normal">(max 100 tekens)</span>
        </label>
        <input
          type="text"
          value={slogan}
          onChange={e => setSlogan(e.target.value)}
          maxLength={100}
          placeholder="Bijv: Meer dan een huis. Een thuis."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Primaire kleur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Primaire kleur</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaire_kleur}
            onChange={e => setPrimaireKleur(e.target.value)}
            className="h-9 w-16 rounded-lg border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500 font-mono">{primaire_kleur}</span>
        </div>
      </div>

      {/* Voorbeeldteksten */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voorbeeldteksten <span className="text-gray-400 font-normal">(tot 20)</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Plak Funda-teksten, brochures of social posts van uw kantoor. Bij opslaan destilleert VestaAI hier
          automatisch één stijlprofiel uit — hoe meer representatieve voorbeelden, hoe scherper uw huisstijl wordt geleerd.
        </p>
        <div className="space-y-3">
          {voorbeelden.map((v, i) => (
            <div key={i} className="relative">
              <textarea
                value={v}
                onChange={e => updateVoorbeeld(i, e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={`Voorbeeld ${i + 1} — plak hier een Funda-tekst of brochure van uw kantoor`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {voorbeelden.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVoorbeeld(i)}
                  aria-label={`Voorbeeld ${i + 1} verwijderen`}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {voorbeelden.length < 20 && (
            <button
              type="button"
              onClick={addVoorbeeld}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              + Voorbeeld toevoegen ({voorbeelden.length}/20)
            </button>
          )}
          {voorbeelden.length < 20 && (
            <label className={`text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer ${bezigUpload ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input type="file" accept=".pdf,.txt" onChange={uploadVoorbeeld} disabled={bezigUpload} className="hidden" />
              {bezigUpload ? 'Bestand lezen…' : '↑ Uploaden (PDF/TXT)'}
            </label>
          )}
        </div>
        {uploadFout && <p className="text-xs text-red-600 mt-2">{uploadFout}</p>}
      </div>

      {/* Brochure-huisstijl */}
      <div className="border-t border-gray-100 pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brochure-huisstijl <span className="text-gray-400 font-normal">(optioneel · apart van de schrijfstijl)</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Plak voorbeelden van úw brochures. VestaAI stemt de gegenereerde brochure-teksten hier specifiek op af —
          los van de Funda- en social-stijl hierboven.
        </p>

        {brochureVoorbeelden.length > 0 && (
          <div className="space-y-3 mb-3">
            {brochureVoorbeelden.map((v, i) => (
              <div key={i} className="relative">
                <textarea
                  value={v}
                  onChange={e => updateBrochure(i, e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={`Brochure-voorbeeld ${i + 1}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => removeBrochure(i)}
                  aria-label={`Brochure-voorbeeld ${i + 1} verwijderen`}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {brochureVoorbeelden.length < 10 && (
          <button
            type="button"
            onClick={addBrochure}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            + Brochure-voorbeeld toevoegen{brochureVoorbeelden.length > 0 ? ` (${brochureVoorbeelden.length}/10)` : ''}
          </button>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kantoorgegevens-slot <span className="text-gray-400 font-normal">(verschijnt als slotpagina in de PDF-export)</span>
          </label>
          <textarea
            value={slotTekst}
            onChange={e => setSlotTekst(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Bijv: Makelaardij De Sleutel · Dorpsstraat 1, 1234 AB · 020-1234567 · info@desleutel.nl · KvK 12345678"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Leren van inline-bewerkingen */}
      {(leerAantal >= leerMin || leerRegels || leerKlaar) && (
        <div className="border-t border-gray-100 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leren van je bewerkingen <span className="text-gray-400 font-normal">(automatisch)</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Als je gegenereerde teksten handmatig aanpast, ziet VestaAI dat als voorbeeld. Laat er stijlregels uit destilleren — jij bepaalt of ze kloppen voordat ze worden toegepast.
          </p>

          {!leerRegels && leerKlaar !== 'toegepast' && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-700 mb-3">
                {leerAantal >= leerMin
                  ? `VestaAI verzamelde ${leerAantal} bewerking${leerAantal === 1 ? '' : 'en'} om van te leren.`
                  : `Nog te weinig bewerkingen (minimaal ${leerMin}).`}
              </p>
              {leerAantal >= leerMin && (
                <button
                  type="button"
                  onClick={analyseerBewerkingen}
                  disabled={leerBezig}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white rounded-lg px-4 py-2 disabled:opacity-60"
                  style={{ background: '#1A6B45' }}
                >
                  {leerBezig ? 'Analyseren…' : `Analyseer ${leerAantal} bewerking${leerAantal === 1 ? '' : 'en'}`}
                </button>
              )}
              {leerKlaar === 'genegeerd' && <p className="text-xs text-gray-500 mt-2">Voorstel genegeerd.</p>}
            </div>
          )}

          {leerRegels && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#BBE3CE', background: '#F1FAF5' }}>
              <p className="text-sm font-semibold text-gray-900 mb-2">VestaAI heeft dit geleerd — kloppen deze regels?</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans mb-3">{leerRegels}</pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => rondLerenAf(true)}
                  disabled={leerBezig}
                  className="text-sm font-semibold text-white rounded-lg px-4 py-2 disabled:opacity-60"
                  style={{ background: '#1A6B45' }}
                >
                  {leerBezig ? 'Bezig…' : 'Toevoegen aan mijn stijl'}
                </button>
                <button
                  type="button"
                  onClick={() => rondLerenAf(false)}
                  disabled={leerBezig}
                  className="text-sm font-semibold text-gray-600 rounded-lg px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  Negeren
                </button>
              </div>
            </div>
          )}

          {leerKlaar === 'toegepast' && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#BBE3CE', background: '#F1FAF5' }}>
              <p className="text-sm font-semibold" style={{ color: '#166534' }}>✓ Toegevoegd aan je huisstijl</p>
              <p className="text-xs text-gray-600 mt-1">VestaAI past deze regels voortaan toe bij het genereren.</p>
            </div>
          )}

          {leerFout && <p className="text-xs text-red-600 mt-2">{leerFout}</p>}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {status === 'saving' ? 'Stijlprofiel leren…' : status === 'saved' ? 'Opgeslagen!' : 'Sla huisstijl op'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-red-600">Opslaan mislukt. Probeer het opnieuw.</p>
      )}
    </form>
  )
}
