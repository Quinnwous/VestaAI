'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PropertyInputSchema, type PropertyInput } from '@/lib/schemas'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { WoningdataPanel } from '@/components/WoningdataPanel'
import type { VerrijkingData } from '@/lib/verrijking'
import type { BagSuggestie } from '@/app/api/bag/suggest/route'

const WONINGSTYPES = ['Appartement', 'Tussenwoning', 'Hoekwoning', 'Vrijstaand', 'Villa', 'Penthouse'] as const
const ENERGIELABELS = ['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
const DOELGROEPEN = ['Starters', 'Jonge gezinnen', 'Senioren', 'Investeerders', 'Anders'] as const

// Gedeelde intake (besluit 16 sep 2026, zie CLAUDE.md § Hoofdstructuur): stap 3
// "Staat & afwerking" en stap 4 "Ligging & buitenruimte" — precies de knoppen
// waaraan de waardering straks in de wat-als-scenario's laat draaien.
const ONDERHOUD_OPTIES = ['uitstekend', 'goed', 'voldoende', 'opknapper'] as const
const ISOLATIE_OPTIES = ['dak', 'muur', 'vloer', 'glas'] as const
const LIGGING_OPTIES = ['hoekwoning', 'tussenwoning', 'vrijstaand', 'twee_onder_een_kap'] as const
const ORIENTATIE_OPTIES = ['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest'] as const
const PARKEREN_OPTIES = ['garage', 'carport', 'oprit', 'openbaar', 'geen'] as const
const BIJZONDERE_LIGGING_OPTIES = ['water', 'park', 'drukke_weg'] as const

const STAPPEN = [
  { id: 1, label: 'Adres' },
  { id: 2, label: 'Woning' },
  { id: 3, label: 'Staat & afwerking' },
  { id: 4, label: 'Ligging & buitenruimte' },
  { id: 5, label: 'Verhaal' },
  { id: 6, label: 'Commercieel' },
] as const

const DRAFT_KEY = 'vestaai_form_draft'

function loadDraft(): Partial<PropertyInput> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<PropertyInput>
  } catch {
    return {}
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}

interface PropertyFormProps {
  onSubmit: (data: PropertyInput) => void
  disabled?: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 'var(--merk-radius-md, 12px)',
  border: '1px solid #E1E5E9',
  padding: '12px 14px',
  fontSize: 14,
  color: '#14181B',
  background: '#FAFBFB',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#14181B',
  marginBottom: 8,
}

export function PropertyForm({ onSubmit, disabled }: PropertyFormProps) {
  const draft = typeof window !== 'undefined' ? loadDraft() : {}
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openHuisActief, setOpenHuisActief] = useState(
    () => !!(draft.open_huis_datum)
  )
  const [verrijkingData, setVerrijkingData] = useState<VerrijkingData | null>(null)
  const [verrijkingBezig, setVerrijkingBezig] = useState(false)
  const [stap, setStap] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<PropertyInput>({
    resolver: zodResolver(PropertyInputSchema),
    defaultValues: { taal: 'nl', ...draft },
  })

  const adresValue = useWatch({ control, name: 'adres' }) ?? ''
  const doelgroepValue = useWatch({ control, name: 'doelgroep' })
  const [duplicaat, setDuplicaat] = useState<{ object_id: string; created_at: string } | null>(null)
  const duplicaatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [doelgroepAnders, setDoelgroepAnders] = useState(
    () => !DOELGROEPEN.slice(0, -1).includes(draft.doelgroep as typeof DOELGROEPEN[number])
      && !!draft.doelgroep
  )
  const uspsValue = useWatch({ control, name: 'usps' }) ?? ''
  const allValues = useWatch({ control })
  const MAX_USPS = 500

  // Content komt sinds 16 sep 2026 altijd in NL + EN tegelijk (zie CLAUDE.md) —
  // geen taalkeuze meer nodig in de intake. Het formulier zelf blijft Nederlands.
  const isEn = false

  // Stapsgewijze validatie: alleen de velden van de huidige stap controleren
  // vóór "Volgende", zodat een fout in een latere stap niet blokkeert.
  const STAP_VELDEN: Record<number, (keyof PropertyInput)[]> = {
    1: ['adres'],
    2: ['woningtype', 'kamers', 'oppervlak_m2', 'bouwjaar', 'energielabel'],
    3: [],
    4: [],
    5: ['usps', 'doelgroep'],
    6: [],
  }

  const volgendeStap = async () => {
    const geldig = await trigger(STAP_VELDEN[stap])
    if (geldig) setStap(s => Math.min(6, s + 1))
  }
  const vorigeStap = () => setStap(s => Math.max(1, s - 1))

  useEffect(() => {
    if (duplicaatTimerRef.current) clearTimeout(duplicaatTimerRef.current)
    if (adresValue.length < 6) { setDuplicaat(null); return }
    duplicaatTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/object/check-adres?adres=${encodeURIComponent(adresValue)}`)
        const json = await res.json()
        setDuplicaat(json.bestaat ? { object_id: json.object_id, created_at: json.created_at } : null)
      } catch { /* silent */ }
    }, 600)
    return () => { if (duplicaatTimerRef.current) clearTimeout(duplicaatTimerRef.current) }
  }, [adresValue])

  useEffect(() => {
    if (disabled) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(allValues)) } catch { /* ignore */ }
    }, 800)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [allValues, disabled])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !disabled) {
        if (stap === 6) handleSubmit(onSubmit)()
        else volgendeStap()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, handleSubmit, onSubmit, stap])

  const handleAdresSelect = async (suggestie: BagSuggestie) => {
    // BAG-data ophalen (bouwjaar, oppervlak, energielabel)
    try {
      const res = await fetch(`/api/bag?adres=${encodeURIComponent(suggestie.label)}`)
      const json = await res.json()
      if (res.ok) {
        if (json.bouwjaar) setValue('bouwjaar', json.bouwjaar, { shouldValidate: true })
        if (json.oppervlak_m2) setValue('oppervlak_m2', json.oppervlak_m2, { shouldValidate: true })
        if (json.energielabel) setValue('energielabel', json.energielabel, { shouldValidate: true })
      }
    } catch { /* stilzwijgend */ }

    // Verrijkingsdata ophalen (WOZ + CBS + markt + voorzieningen)
    setVerrijkingBezig(true)
    setVerrijkingData(null)
    try {
      const oppervlak = getValues('oppervlak_m2')
      const params = new URLSearchParams({ adres: suggestie.label })
      if (oppervlak) params.set('oppervlak', String(oppervlak))
      const res = await fetch(`/api/verrijking?${params}`)
      if (res.ok) {
        const data: VerrijkingData = await res.json()
        setVerrijkingData(data)
      }
    } catch { /* stilzwijgend */ } finally {
      setVerrijkingBezig(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <input type="hidden" {...register('taal')} />

      {/* Stapindicator — gedeelde intake in zes stappen, zie CLAUDE.md § Hoofdstructuur */}
      <div style={{ display: 'flex', gap: 4, paddingBottom: 18, borderBottom: '1px solid #E6E9EC', overflowX: 'auto' }}>
        {STAPPEN.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.id < stap && setStap(s.id)}
            disabled={s.id > stap}
            style={{
              flex: '1 0 auto', padding: '6px 4px', borderRadius: 8, border: 'none', background: 'none', cursor: s.id < stap ? 'pointer' : 'default',
              borderBottom: `3px solid ${s.id === stap ? 'var(--merk,#1A6B45)' : s.id < stap ? 'var(--merk-rand,#C7E6D5)' : '#E6E9EC'}`,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: s.id === stap ? 'var(--merk,#1A6B45)' : s.id < stap ? '#5C6470' : '#98A0A6', whiteSpace: 'nowrap' }}>
              {s.id}. {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Stap 1 — Adres */}
      <div style={{ display: stap === 1 ? 'block' : 'none' }}>
        <label style={labelStyle}>
          {isEn ? 'Address' : 'Adres'} <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <AddressAutocomplete
          value={adresValue}
          onChange={v => setValue('adres', v, { shouldValidate: adresValue.length > 2 })}
          onSelect={handleAdresSelect}
          disabled={disabled}
          placeholder={isEn ? '1 Main Street, Amsterdam' : 'Herengracht 1, Amsterdam'}
        />
        <input type="hidden" {...register('adres')} />
        {errors.adres && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.adres.message}</p>}
        {duplicaat && !errors.adres && (
          <div style={{ marginTop: 8, borderRadius: 'var(--merk-radius-md, 10px)', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" style={{ flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p style={{ fontSize: 13, color: '#92400E' }}>
              {isEn ? 'This address was already generated on ' : 'Dit adres is al gegenereerd op '}
              {new Date(duplicaat.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}.{' '}
              <a href={`/object/${duplicaat.object_id}`} style={{ textDecoration: 'underline', fontWeight: 600 }}>
                {isEn ? 'View existing object →' : 'Bekijk bestaand object →'}
              </a>
            </p>
          </div>
        )}

        {/* Woningdata-paneel: verschijnt zodra adres is geselecteerd */}
        {(verrijkingBezig || verrijkingData) && (
          <div style={{ marginTop: 12 }}>
            <WoningdataPanel
              data={verrijkingData ?? { woz: null, cbs: null, voorzieningen: null, markt: null, gemeente: null, coord: null }}
              bezig={verrijkingBezig}
            />
          </div>
        )}
      </div>

      {/* Stap 2 — Woning */}
      <div style={{ display: stap === 2 ? 'grid' : 'none', gap: 24 }}>
      {/* Woningtype + Kamers */}
      <div className="form-grid-2">
        <div>
          <label style={labelStyle}>
            {isEn ? 'Property type' : 'Woningtype'} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            {...register('woningtype')}
            disabled={disabled}
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
            onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
          >
            <option value="">{isEn ? 'Choose type...' : 'Kies type...'}</option>
            {WONINGSTYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.woningtype && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.woningtype.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>
            {isEn ? 'Rooms' : 'Kamers'} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            {...register('kamers', { valueAsNumber: true })}
            type="number" min={1} max={20} disabled={disabled} placeholder="3"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
            onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
          />
          {errors.kamers && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.kamers.message}</p>}
        </div>
      </div>

      {/* Oppervlak + Bouwjaar */}
      <div className="form-grid-2">
        <div>
          <label style={labelStyle}>
            {isEn ? 'Floor area (m²)' : 'Woonoppervlak (m²)'} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            {...register('oppervlak_m2', { valueAsNumber: true })}
            type="number" min={1} disabled={disabled} placeholder="85"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
            onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
          />
          {errors.oppervlak_m2 && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.oppervlak_m2.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>
            {isEn ? 'Year built' : 'Bouwjaar'} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            {...register('bouwjaar', { valueAsNumber: true })}
            type="number" min={1800} max={2035} disabled={disabled} placeholder="1995"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
            onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
          />
          {errors.bouwjaar && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.bouwjaar.message}</p>}
        </div>
      </div>

      {/* Energielabel + geldig tot */}
      <div className="form-grid-2">
        <div>
          <label style={labelStyle}>Energielabel <span style={{ color: '#DC2626' }}>*</span></label>
          <select
            {...register('energielabel')}
            disabled={disabled}
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
            onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
          >
            <option value="">Kies label...</option>
            {ENERGIELABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.energielabel && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.energielabel.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>Geldig tot <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input
            {...register('energielabel_geldig_tot')}
            type="date" disabled={disabled}
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          />
        </div>
      </div>

      {/* Perceel + inhoud */}
      <div className="form-grid-2">
        <div>
          <label style={labelStyle}>Perceeloppervlak (m²) <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input
            {...register('perceel_m2', { valueAsNumber: true })}
            type="number" min={0} disabled={disabled} placeholder="250"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          />
        </div>
        <div>
          <label style={labelStyle}>Inhoud (m³) <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input
            {...register('inhoud_m3', { valueAsNumber: true })}
            type="number" min={0} disabled={disabled} placeholder="320"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          />
        </div>
      </div>

      {/* Slaapkamers, badkamers, woonlagen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <div>
          <label style={labelStyle}>Slaapkamers <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input {...register('slaapkamers', { valueAsNumber: true })} type="number" min={0} max={20} disabled={disabled} placeholder="3" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
        </div>
        <div>
          <label style={labelStyle}>Badkamers <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input {...register('badkamers', { valueAsNumber: true })} type="number" min={0} max={10} disabled={disabled} placeholder="1" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
        </div>
        <div>
          <label style={labelStyle}>Woonlagen <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input {...register('woonlagen', { valueAsNumber: true })} type="number" min={1} max={10} disabled={disabled} placeholder="2" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
        </div>
      </div>
      </div>

      {/* Stap 3 — Staat & afwerking */}
      <div style={{ display: stap === 3 ? 'flex' : 'none', flexDirection: 'column', gap: 24 }}>
        <div className="form-grid-2">
          <div>
            <label style={labelStyle}>Onderhoud binnen <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <select {...register('staat_afwerking.onderhoud_binnen')} disabled={disabled} style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}>
              <option value="">Kies...</option>
              {ONDERHOUD_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Onderhoud buiten <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <select {...register('staat_afwerking.onderhoud_buiten')} disabled={disabled} style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}>
              <option value="">Kies...</option>
              {ONDERHOUD_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div>
            <label style={labelStyle}>Keuken — bouwjaar <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <input {...register('staat_afwerking.keuken_jaar', { valueAsNumber: true })} type="number" min={1900} max={2035} disabled={disabled} placeholder="2018" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
          </div>
          <div>
            <label style={labelStyle}>Badkamer — bouwjaar <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <input {...register('staat_afwerking.badkamer_jaar', { valueAsNumber: true })} type="number" min={1900} max={2035} disabled={disabled} placeholder="2015" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Isolatie <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel — meerdere mogelijk)</span></label>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {ISOLATIE_OPTIES.map(optie => (
              <label key={optie} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
                <input type="checkbox" value={optie} disabled={disabled} {...register('staat_afwerking.isolatie')} />
                {optie}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="zonnepanelen" disabled={disabled} {...register('staat_afwerking.zonnepanelen')} />
          <label htmlFor="zonnepanelen" style={{ fontSize: 13.5, color: '#14181B' }}>Zonnepanelen aanwezig</label>
        </div>

        <div>
          <label style={labelStyle}>Recent verbouwd <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input
            {...register('staat_afwerking.recent_verbouwd')}
            disabled={disabled} placeholder="Bijv: nieuw dakkapel in 2023, uitbouw keuken 2021"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          />
        </div>
      </div>

      {/* Stap 4 — Ligging & buitenruimte */}
      <div style={{ display: stap === 4 ? 'flex' : 'none', flexDirection: 'column', gap: 24 }}>
        <div className="form-grid-2">
          <div>
            <label style={labelStyle}>Ligging <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <select {...register('ligging_buitenruimte.ligging')} disabled={disabled} style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}>
              <option value="">Kies...</option>
              {LIGGING_OPTIES.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Garage/parkeren <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <select {...register('ligging_buitenruimte.garage_parkeren')} disabled={disabled} style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}>
              <option value="">Kies...</option>
              {PARKEREN_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div>
            <label style={labelStyle}>Tuin (m²) <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <input {...register('ligging_buitenruimte.tuin_m2', { valueAsNumber: true })} type="number" min={0} disabled={disabled} placeholder="80" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
          </div>
          <div>
            <label style={labelStyle}>Tuin — oriëntatie <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <select {...register('ligging_buitenruimte.tuin_orientatie')} disabled={disabled} style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}>
              <option value="">Kies...</option>
              {ORIENTATIE_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
            <input type="checkbox" disabled={disabled} {...register('ligging_buitenruimte.achterom')} /> Achterom
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
            <input type="checkbox" disabled={disabled} {...register('ligging_buitenruimte.balkon_dakterras')} /> Balkon/dakterras
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
            <input type="checkbox" disabled={disabled} {...register('ligging_buitenruimte.berging')} /> Berging
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
            <input type="checkbox" disabled={disabled} {...register('ligging_buitenruimte.monument')} /> Monument
          </label>
        </div>

        <div>
          <label style={labelStyle}>Bijzondere ligging <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel — meerdere mogelijk)</span></label>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {BIJZONDERE_LIGGING_OPTIES.map(optie => (
              <label key={optie} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
                <input type="checkbox" value={optie} disabled={disabled} {...register('ligging_buitenruimte.bijzondere_ligging')} />
                {optie.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Uitzicht <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input {...register('ligging_buitenruimte.uitzicht')} disabled={disabled} placeholder="Bijv: vrij uitzicht over het park" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
        </div>

        <div className="form-grid-2">
          <div>
            <label style={labelStyle}>VvE-bijdrage per maand (€) <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
            <input {...register('ligging_buitenruimte.vve_bijdrage_per_maand', { valueAsNumber: true })} type="number" min={0} disabled={disabled} placeholder="120" style={{ ...inputStyle, opacity: disabled ? .5 : 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#14181B' }}>
              <input type="checkbox" disabled={disabled} {...register('ligging_buitenruimte.erfpacht.van_toepassing')} /> Erfpacht van toepassing
            </label>
          </div>
        </div>
      </div>

      {/* Stap 5 — Verhaal */}
      <div style={{ display: stap === 5 ? 'flex' : 'none', flexDirection: 'column', gap: 24 }}>
      {/* USP's */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            {isEn ? "USPs" : "USP's"} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <span style={{ fontSize: 12, color: uspsValue.length > MAX_USPS * 0.9 ? '#D97706' : '#98A0A6', fontVariantNumeric: 'tabular-nums' }}>
            {uspsValue.length}/{MAX_USPS}
          </span>
        </div>
        <textarea
          {...register('usps')}
          disabled={disabled}
          rows={3}
          maxLength={MAX_USPS}
          placeholder={isEn
            ? 'E.g. renovated kitchen, sunny terrace, unobstructed view, quiet street, new roof 2022'
            : 'Bijv: gerenoveerde keuken, zonnig terras, vrij uitzicht, rustige straat, recent dak'}
          style={{ ...inputStyle, resize: 'none', opacity: disabled ? .5 : 1 }}
          onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
          onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
        />
        {errors.usps
          ? <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.usps.message}</p>
          : <p style={{ marginTop: 6, fontSize: 12, color: '#98A0A6' }}>
            {isEn
              ? 'More unique features = stronger copy.'
              : 'Hoe meer unieke kenmerken, hoe sterker de tekst.'}
          </p>
        }
      </div>

      {/* Doelgroep */}
      <div>
        <label style={labelStyle}>
          {isEn ? 'Target audience' : 'Doelgroep'} <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <select
          value={doelgroepAnders ? 'Anders' : doelgroepValue ?? ''}
          onChange={e => {
            if (e.target.value === 'Anders') {
              setDoelgroepAnders(true)
              setValue('doelgroep', '', { shouldValidate: false })
            } else {
              setDoelgroepAnders(false)
              setValue('doelgroep', e.target.value, { shouldValidate: true })
            }
          }}
          disabled={disabled}
          style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
          onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
        >
          <option value="">{isEn ? 'Choose audience...' : 'Kies doelgroep...'}</option>
          {DOELGROEPEN.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="hidden" {...register('doelgroep')} />
        {doelgroepAnders && (
          <input
            disabled={disabled}
            placeholder={isEn ? 'Describe the target audience...' : 'Beschrijf de doelgroep...'}
            defaultValue={doelgroepValue ?? ''}
            onChange={e => setValue('doelgroep', e.target.value, { shouldValidate: true })}
            style={{ ...inputStyle, marginTop: 8, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
            onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
          />
        )}
        {errors.doelgroep
          ? <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.doelgroep.message}</p>
          : <p style={{ marginTop: 6, fontSize: 12, color: '#98A0A6' }}>
            {isEn
              ? 'Claude tailors tone, atmosphere and USP selection to this buyer profile.'
              : 'Claude schrijft de tekst gericht op deze koper — toon, sfeer en USP-keuze worden hierop afgestemd.'}
          </p>
        }
      </div>
      </div>

      {/* Stap 6 — Commercieel (acquisitiefase: prijsverwachting + courtagevoorstel, geen vaste vraagprijs) */}
      <div style={{ display: stap === 6 ? 'flex' : 'none', flexDirection: 'column', gap: 24 }}>
      <div className="form-grid-2">
        <div>
          <label style={labelStyle}>
            Prijsverwachting verkoper (€) <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            {...register('prijsverwachting_verkoper', { valueAsNumber: true })}
            type="number" min={1} disabled={disabled} placeholder="450000"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          />
          <p style={{ marginTop: 6, fontSize: 12, color: '#98A0A6' }}>Wat de verkoper zelf verwacht — de vraagprijs staat pas vast als de opdracht binnen is.</p>
        </div>
        <div>
          <label style={labelStyle}>Courtagevoorstel (%) <span style={{ color: '#98A0A6', fontWeight: 500 }}>(optioneel)</span></label>
          <input
            {...register('courtagevoorstel_percentage', { valueAsNumber: true })}
            type="number" step="0.01" min={0} max={10} disabled={disabled} placeholder="1.25"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
          />
        </div>
      </div>

      {/* Open huis */}
      <div style={{ border: '1px solid #E6E9EC', borderRadius: 'var(--merk-radius-lg, 14px)', padding: '16px 18px' }}>
        <button
          type="button"
          onClick={() => setOpenHuisActief(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#14181B' }}>
            {isEn ? 'Open house (optional)' : 'Open huis (optioneel)'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--merk-radius-card-xl, 20px)', background: openHuisActief ? 'var(--merk-zacht,#EAF5EE)' : '#F1F3F5', color: openHuisActief ? 'var(--merk,#1A6B45)' : '#98A0A6' }}>
            {openHuisActief ? (isEn ? 'On' : 'Aan') : (isEn ? 'Off' : 'Uit')}
          </span>
        </button>

        {openHuisActief && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 12, color: '#98A0A6' }}>
                {isEn ? 'Date' : 'Datum'}
              </label>
              <input
                {...register('open_huis_datum')}
                type="date"
                disabled={disabled}
                style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
                onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
                onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 12, color: '#98A0A6' }}>
                {isEn ? 'Time' : 'Tijdstip'}
              </label>
              <input
                {...register('open_huis_tijd')}
                type="time"
                disabled={disabled}
                style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
                onFocus={e => !disabled && (e.target.style.borderColor = 'var(--merk,#1A6B45)')}
                onBlur={e => (e.target.style.borderColor = '#E1E5E9')}
              />
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Navigatie tussen stappen */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {stap > 1 && (
          <button
            type="button"
            onClick={vorigeStap}
            disabled={disabled}
            style={{ borderRadius: 'var(--merk-radius-md, 12px)', background: '#fff', border: '1px solid #E1E5E9', padding: '15px 20px', fontSize: 14.5, fontWeight: 700, color: '#5C6470', cursor: 'pointer' }}
          >
            ← Vorige
          </button>
        )}
        {stap < 6 ? (
          <button
            type="button"
            onClick={volgendeStap}
            disabled={disabled}
            className="vui-btn vui-btn-primary"
            style={{ flex: 1, borderRadius: 'var(--merk-radius-md, 12px)', background: 'var(--merk,#1A6B45)', padding: '15px 0', fontSize: 15.5, fontWeight: 700, color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1, boxShadow: '0 6px 18px rgba(var(--merk-rgb,26,107,69),.24)' }}
          >
            Volgende →
          </button>
        ) : (
          <div style={{ flex: 1 }}>
            <button
              type="submit"
              disabled={disabled}
              className="vui-btn vui-btn-primary"
              style={{ width: '100%', borderRadius: 'var(--merk-radius-md, 12px)', background: 'var(--merk,#1A6B45)', padding: '15px 0', fontSize: 15.5, fontWeight: 700, color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1, boxShadow: '0 6px 18px rgba(var(--merk-rgb,26,107,69),.24)' }}
            >
              {disabled ? 'Bezig met opslaan...' : 'Woning aanmaken →'}
            </button>
            {!disabled && (
              <p style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#98A0A6' }}>
                of druk{' '}
                <kbd style={{ fontFamily: 'monospace', background: 'var(--merk-zacht, #F1F7F3)', padding: '2px 6px', borderRadius: 5, fontSize: 12, color: '#5C6470', border: '1px solid #E1E5E9' }}>⌘ Enter</kbd>
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
