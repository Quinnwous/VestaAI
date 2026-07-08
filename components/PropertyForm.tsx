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
  borderRadius: 12,
  border: '1px solid #E4EAE6',
  padding: '12px 14px',
  fontSize: 14,
  color: '#0E1A13',
  background: '#FBFCFB',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#0E1A13',
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

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PropertyInput>({
    resolver: zodResolver(PropertyInputSchema),
    defaultValues: { taal: 'nl', ...draft },
  })

  const adresValue = useWatch({ control, name: 'adres' }) ?? ''
  const doelgroepValue = useWatch({ control, name: 'doelgroep' })
  const taalValue = useWatch({ control, name: 'taal' }) ?? 'nl'
  const [duplicaat, setDuplicaat] = useState<{ object_id: string; created_at: string } | null>(null)
  const duplicaatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [doelgroepAnders, setDoelgroepAnders] = useState(
    () => !DOELGROEPEN.slice(0, -1).includes(draft.doelgroep as typeof DOELGROEPEN[number])
      && !!draft.doelgroep
  )
  const uspsValue = useWatch({ control, name: 'usps' }) ?? ''
  const allValues = useWatch({ control })
  const MAX_USPS = 500

  const isEn = taalValue === 'en'

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
        handleSubmit(onSubmit)()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [disabled, handleSubmit, onSubmit])

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

      {/* Taal toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '1px solid #E9EFEB' }}>
        <p style={{ fontSize: 13, color: '#9AA6A0' }}>{isEn ? 'Generate content in:' : 'Genereer content in:'}</p>
        <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #E4EAE6', overflow: 'hidden', fontSize: 13, fontWeight: 600 }}>
          {(['nl', 'en'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('taal', t)}
              style={{ padding: '7px 14px', cursor: 'pointer', border: 'none', transition: 'all .15s', background: taalValue === t ? '#1A6B45' : '#fff', color: taalValue === t ? '#fff' : '#5A6B61' }}
            >
              {t === 'nl' ? '🇳🇱 Nederlands' : '🇬🇧 English'}
            </button>
          ))}
        </div>
        <input type="hidden" {...register('taal')} />
      </div>

      {/* Adres */}
      <div>
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
          <div style={{ marginTop: 8, borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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
              data={verrijkingData ?? { woz: null, cbs: null, voorzieningen: null, markt: null, gemeente: null }}
              bezig={verrijkingBezig}
            />
          </div>
        )}
      </div>

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
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
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
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
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
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
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
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
          />
          {errors.bouwjaar && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.bouwjaar.message}</p>}
        </div>
      </div>

      {/* Energielabel + Vraagprijs */}
      <div className="form-grid-2">
        <div>
          <label style={labelStyle}>
            {isEn ? 'Energy label' : 'Energielabel'} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            {...register('energielabel')}
            disabled={disabled}
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
          >
            <option value="">{isEn ? 'Choose label...' : 'Kies label...'}</option>
            {ENERGIELABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.energielabel && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.energielabel.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>
            {isEn ? 'Asking price (€)' : 'Vraagprijs (€)'} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            {...register('vraagprijs', { valueAsNumber: true })}
            type="number" min={1} disabled={disabled} placeholder="450000"
            style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
          />
          {errors.vraagprijs && <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.vraagprijs.message}</p>}
        </div>
      </div>

      {/* USP's */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            {isEn ? "USPs" : "USP's"} <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <span style={{ fontSize: 12, color: uspsValue.length > MAX_USPS * 0.9 ? '#D97706' : '#9AA6A0', fontVariantNumeric: 'tabular-nums' }}>
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
          onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
          onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
        />
        {errors.usps
          ? <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.usps.message}</p>
          : <p style={{ marginTop: 6, fontSize: 12, color: '#9AA6A0' }}>
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
          onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
          onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
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
            onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
            onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
          />
        )}
        {errors.doelgroep
          ? <p style={{ marginTop: 5, fontSize: 12, color: '#DC2626' }}>{errors.doelgroep.message}</p>
          : <p style={{ marginTop: 6, fontSize: 12, color: '#9AA6A0' }}>
            {isEn
              ? 'Claude tailors tone, atmosphere and USP selection to this buyer profile.'
              : 'Claude schrijft de tekst gericht op deze koper — toon, sfeer en USP-keuze worden hierop afgestemd.'}
          </p>
        }
      </div>

      {/* Open huis */}
      <div style={{ border: '1px solid #E9EFEB', borderRadius: 14, padding: '16px 18px' }}>
        <button
          type="button"
          onClick={() => setOpenHuisActief(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0E1A13' }}>
            {isEn ? 'Open house (optional)' : 'Open huis (optioneel)'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: openHuisActief ? '#EAF5EE' : '#F1F7F3', color: openHuisActief ? '#1A6B45' : '#9AA6A0' }}>
            {openHuisActief ? (isEn ? 'On' : 'Aan') : (isEn ? 'Off' : 'Uit')}
          </span>
        </button>

        {openHuisActief && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 12, color: '#9AA6A0' }}>
                {isEn ? 'Date' : 'Datum'}
              </label>
              <input
                {...register('open_huis_datum')}
                type="date"
                disabled={disabled}
                style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
                onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
                onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 12, color: '#9AA6A0' }}>
                {isEn ? 'Time' : 'Tijdstip'}
              </label>
              <input
                {...register('open_huis_tijd')}
                type="time"
                disabled={disabled}
                style={{ ...inputStyle, opacity: disabled ? .5 : 1 }}
                onFocus={e => !disabled && (e.target.style.borderColor = '#1A6B45')}
                onBlur={e => (e.target.style.borderColor = '#E4EAE6')}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={disabled}
          className="vui-btn vui-btn-primary"
          style={{ width: '100%', borderRadius: 12, background: '#1A6B45', padding: '15px 0', fontSize: 15.5, fontWeight: 700, color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1, boxShadow: '0 6px 18px rgba(26,107,69,.24)' }}
        >
          {disabled
            ? (isEn ? 'Generating...' : 'Bezig met genereren...')
            : (isEn ? 'Generate content →' : 'Genereer content →')}
        </button>
        {!disabled && (
          <p style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#9AA6A0' }}>
            {isEn ? 'or press' : 'of druk'}{' '}
            <kbd style={{ fontFamily: 'monospace', background: '#F1F7F3', padding: '2px 6px', borderRadius: 5, fontSize: 12, color: '#5A6B61', border: '1px solid #E4EAE6' }}>⌘ Enter</kbd>
          </p>
        )}
      </div>
    </form>
  )
}
