'use client'

import { useState } from 'react'
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

  const updateVoorbeeld = (i: number, val: string) => {
    setVoorbeelden(prev => { const v = [...prev]; v[i] = val; return v })
  }
  const addVoorbeeld = () => setVoorbeelden(prev => (prev.length >= 20 ? prev : [...prev, '']))
  const removeVoorbeeld = (i: number) =>
    setVoorbeelden(prev => (prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const result = await slaHuisstijlOp({
      schrijftoon,
      slogan,
      primaire_kleur,
      voorbeelden: voorbeelden.filter(Boolean),
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
        {voorbeelden.length < 20 && (
          <button
            type="button"
            onClick={addVoorbeeld}
            className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            + Voorbeeld toevoegen ({voorbeelden.length}/20)
          </button>
        )}
      </div>

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
