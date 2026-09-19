'use client'

import { useState } from 'react'
import type { Kantoor } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'
import { slaHuisstijlOpAlsAdmin } from '../actions'
import { LogoUpload } from './LogoUpload'
import { AchtergrondUpload } from './AchtergrondUpload'
import { FONT_OPTIES, VORM_OPTIES, type LettertypeKeuze, type VormKeuze } from '@/lib/branding'

interface Props {
  kantoor: Kantoor
}

const SCHRIJFTONEN: { value: HuisstijlConfig['schrijftoon']; label: string; desc: string }[] = [
  { value: 'formeel', label: 'Formeel', desc: 'Professioneel en zakelijk' },
  { value: 'informeel', label: 'Informeel', desc: 'Toegankelijk en persoonlijk' },
  { value: 'enthousiast', label: 'Enthousiast', desc: 'Energiek en uitnodigend' },
]

/**
 * Volledig editable huisstijlformulier — alleen bereikbaar via /admin (besluit
 * 16 sep 2026: platform-admin beheert huisstijl per kantoor, zie CLAUDE.md).
 * Bevat NIET de "leren van bewerkingen"-sectie: die keurt het kantoor zelf goed
 * in het woningdossier, zie components/StijlLerenPaneel.tsx.
 */
export function HuisstijlForm({ kantoor }: Props) {
  const huidig = kantoor.huisstijl_json
  const [schrijftoon, setSchrijftoon] = useState<HuisstijlConfig['schrijftoon']>(huidig?.schrijftoon ?? 'informeel')
  const [slogan, setSlogan] = useState(huidig?.slogan ?? '')
  const [primaire_kleur, setPrimaireKleur] = useState(huidig?.primaire_kleur ?? '#1A6B45')
  const [accent_kleur, setAccentKleur] = useState(huidig?.accent_kleur ?? '#2A8A5C')
  const [lettertype, setLettertype] = useState<LettertypeKeuze>(huidig?.lettertype ?? 'jakarta')
  const [vorm, setVorm] = useState<VormKeuze>(huidig?.vorm ?? 'zacht')
  const [telefoon, setTelefoon] = useState(huidig?.telefoon ?? '')
  const [email, setEmail] = useState(huidig?.email ?? '')
  const [voorbeelden, setVoorbeelden] = useState<string[]>(huidig?.voorbeelden?.length ? huidig.voorbeelden : [''])
  const [bannerFocusY, setBannerFocusY] = useState<number>(huidig?.banner_focus_y ?? 50)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [bezigUpload, setBezigUpload] = useState(false)
  const [uploadFout, setUploadFout] = useState('')

  const updateVoorbeeld = (i: number, val: string) => setVoorbeelden(prev => { const v = [...prev]; v[i] = val; return v })
  const addVoorbeeld = () => setVoorbeelden(prev => (prev.length >= 20 ? prev : [...prev, '']))
  const removeVoorbeeld = (i: number) => setVoorbeelden(prev => (prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i)))

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

  const [brochureVoorbeelden, setBrochureVoorbeelden] = useState<string[]>(huidig?.brochure_stijl?.voorbeelden?.length ? huidig.brochure_stijl.voorbeelden : [])
  const [slotTekst, setSlotTekst] = useState(huidig?.brochure_stijl?.slot_tekst ?? '')
  const updateBrochure = (i: number, val: string) => setBrochureVoorbeelden(prev => { const v = [...prev]; v[i] = val; return v })
  const addBrochure = () => setBrochureVoorbeelden(prev => (prev.length >= 10 ? prev : [...prev, '']))
  const removeBrochure = (i: number) => setBrochureVoorbeelden(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const broVb = brochureVoorbeelden.filter(Boolean)
    const result = await slaHuisstijlOpAlsAdmin({
      schrijftoon,
      slogan,
      primaire_kleur,
      accent_kleur,
      lettertype,
      vorm,
      telefoon: telefoon.trim() || undefined,
      email: email.trim() || undefined,
      banner_focus_y: bannerFocusY,
      voorbeelden: voorbeelden.filter(Boolean),
      brochure_stijl: broVb.length || slotTekst.trim()
        ? { voorbeelden: broVb, ...(slotTekst.trim() ? { slot_tekst: slotTekst.trim() } : {}) }
        : undefined,
      kantoor_id: kantoor.id,
    })
    setStatus(result.ok ? 'saved' : 'error')
    if (result.ok) setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <LogoUpload kantoorId={kantoor.id} huidigUrl={kantoor.logo_url} />

      <AchtergrondUpload
        kantoorId={kantoor.id}
        huidigPrimair={huidig?.achtergrond_url ?? null}
        huidigSecundair={huidig?.achtergrond_secundair_url ?? null}
        huidigBanner={huidig?.banner_url ?? null}
        huidigFocusY={bannerFocusY}
        onFocusY={setBannerFocusY}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contactgegevens</label>
        <p className="text-xs text-gray-500 mb-3">Staan in de balk bovenaan hun omgeving. Leeg = die balk verdwijnt.</p>
        <div className="grid grid-cols-2 gap-3">
          <input type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)} maxLength={40} placeholder="070-1234567" aria-label="Telefoonnummer" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} placeholder="info@kantoor.nl" aria-label="E-mailadres" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Schrijftoon</label>
        <div className="grid grid-cols-3 gap-3">
          {SCHRIJFTONEN.map(t => (
            <button key={t.value} type="button" onClick={() => setSchrijftoon(t.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${schrijftoon === t.value ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slogan <span className="text-gray-400 font-normal">(max 100 tekens)</span></label>
        <input type="text" value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={100} placeholder="Bijv: Meer dan een huis. Een thuis." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Merkkleuren</label>
        <p className="text-xs text-gray-500 mb-3">Kleuren de hele ingelogde omgeving: navigatie, knoppen en het verkoopadvies.</p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <input type="color" value={primaire_kleur} onChange={e => setPrimaireKleur(e.target.value)} aria-label="Primaire kleur" className="h-9 w-16 rounded-lg border border-gray-300 cursor-pointer" />
            <span className="text-sm text-gray-500">Primair <span className="font-mono">{primaire_kleur}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={accent_kleur} onChange={e => setAccentKleur(e.target.value)} aria-label="Accentkleur" className="h-9 w-16 rounded-lg border border-gray-300 cursor-pointer" />
            <span className="text-sm text-gray-500">Accent <span className="font-mono">{accent_kleur}</span></span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lettertype</label>
          <select value={lettertype} onChange={e => setLettertype(e.target.value as LettertypeKeuze)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {Object.entries(FONT_OPTIES).map(([key, opt]) => <option key={key} value={key}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vormtaal</label>
          <select value={vorm} onChange={e => setVorm(e.target.value as VormKeuze)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {Object.entries(VORM_OPTIES).map(([key, opt]) => <option key={key} value={key}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldteksten <span className="text-gray-400 font-normal">(tot 20)</span></label>
        <p className="text-xs text-gray-500 mb-3">Plak Funda-teksten, brochures of social posts van dit kantoor — daar destilleren we bij opslaan een stijlprofiel uit.</p>
        <div className="space-y-3">
          {voorbeelden.map((v, i) => (
            <div key={i} className="relative">
              <textarea value={v} onChange={e => updateVoorbeeld(i, e.target.value)} rows={4} maxLength={2000} placeholder={`Voorbeeld ${i + 1}`} className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
              {voorbeelden.length > 1 && (
                <button type="button" onClick={() => removeVoorbeeld(i)} aria-label={`Voorbeeld ${i + 1} verwijderen`} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {voorbeelden.length < 20 && (
            <button type="button" onClick={addVoorbeeld} className="text-sm font-semibold text-gray-700 hover:text-gray-900">+ Voorbeeld toevoegen ({voorbeelden.length}/20)</button>
          )}
          {voorbeelden.length < 20 && (
            <label className={`text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer ${bezigUpload ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input type="file" accept=".pdf,.txt" onChange={uploadVoorbeeld} disabled={bezigUpload} className="hidden" />
              {bezigUpload ? 'Bestand lezen…' : '↑ Uploaden (PDF/TXT)'}
            </label>
          )}
        </div>
        {uploadFout && <p className="text-xs text-red-600 mt-2">{uploadFout}</p>}
      </div>

      <div className="border-t border-gray-100 pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Brochure-huisstijl <span className="text-gray-400 font-normal">(optioneel)</span></label>
        <p className="text-xs text-gray-500 mb-3">Voorbeelden van hun brochures — stemt de brochure-teksten hier specifiek op af, los van Funda/social hierboven.</p>

        {brochureVoorbeelden.length > 0 && (
          <div className="space-y-3 mb-3">
            {brochureVoorbeelden.map((v, i) => (
              <div key={i} className="relative">
                <textarea value={v} onChange={e => updateBrochure(i, e.target.value)} rows={4} maxLength={2000} placeholder={`Brochure-voorbeeld ${i + 1}`} className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
                <button type="button" onClick={() => removeBrochure(i)} aria-label={`Brochure-voorbeeld ${i + 1} verwijderen`} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {brochureVoorbeelden.length < 10 && (
          <button type="button" onClick={addBrochure} className="text-sm font-semibold text-gray-700 hover:text-gray-900">+ Brochure-voorbeeld toevoegen{brochureVoorbeelden.length > 0 ? ` (${brochureVoorbeelden.length}/10)` : ''}</button>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kantoorgegevens-slot <span className="text-gray-400 font-normal">(slotpagina in de PDF-export)</span></label>
          <textarea value={slotTekst} onChange={e => setSlotTekst(e.target.value)} rows={3} maxLength={600} placeholder="Bijv: Makelaardij De Sleutel · Dorpsstraat 1, 1234 AB · 020-1234567 · info@desleutel.nl · KvK 12345678" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
        </div>
      </div>

      <button type="submit" disabled={status === 'saving'} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {status === 'saving' ? 'Stijlprofiel leren…' : status === 'saved' ? 'Opgeslagen!' : 'Sla huisstijl op'}
      </button>

      {status === 'error' && <p className="text-sm text-red-600">Opslaan mislukt. Probeer het opnieuw.</p>}
    </form>
  )
}
