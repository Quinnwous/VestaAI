'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PropertyInput, ContentOutput } from '@/lib/schemas'
import { PropertyForm, clearDraft } from '@/components/PropertyForm'
import { LoadingProgress } from '@/components/LoadingProgress'
import { Eyebrow, SerifTitle } from '@/components/ui'

const RATE_LIMIT_SECONDS = 90

const DRAFT_KEY = 'vestaai_form_draft'

const DEMO_DATA: PropertyInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype: 'Appartement',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1890,
  energielabel: 'D',
  prijsverwachting_verkoper: 595000,
  usps: 'Authentieke gevelwoning op de Herengracht · originele details bewaard · lichte woonkamer met grachtzicht · moderne open keuken · gerenoveerde badkamer · loopafstand van Jordaan en centrum',
  doelgroep: 'Jonge gezinnen',
  taal: 'nl',
}

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string; isRateLimit?: boolean }

const card: React.CSSProperties = {
  borderRadius: 'var(--merk-radius-card-xl, 20px)',
  background: '#fff',
  border: '1px solid #E6E9EC',
  padding: '32px 28px',
  boxShadow: '0 2px 16px rgba(20,24,27,.05)',
}

/**
 * Woning toevoegen — start altijd in de Verkoopadvies-fase (interne waarde
 * `verkoopadvies`, hernoemd van `acquisitie` in item 2.1; besluit 16 sep 2026,
 * zie CLAUDE.md § Hoofdstructuur). Content
 * wordt in de achtergrond al gegenereerd (dezelfde /api/generate-pijplijn als
 * voorheen — dat blijft waardevol: de tekst staat al klaar zodra de opdracht
 * binnen is), maar wordt pas zichtbaar zodra de fase naar "In verkoop" gaat.
 * Na aanmaken gaat de makelaar daarom direct naar het nieuwe dossier, niet
 * naar een resultatenscherm.
 */
type Props = {
  /** true buiten productie, of als het kantoor van de ingelogde makelaar
   * instellingen_json.demo === true heeft (item 2.3, zie app/(app)/object/new/page.tsx). */
  toonDemoKnop: boolean
}

export function NewObjectForm({ toonDemoKnop }: Props) {
  const router = useRouter()
  const [state, setState] = useState<PageState>({ status: 'idle' })
  const [countdown, setCountdown] = useState(0)
  const [formKey, setFormKey] = useState(0)
  const isLoading = state.status === 'loading'

  function fillDemo() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(DEMO_DATA)) } catch { /* ignore */ }
    setFormKey(k => k + 1)
  }

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isLoading])

  useEffect(() => {
    if (state.status !== 'error' || !state.isRateLimit) return
    setCountdown(RATE_LIMIT_SECONDS)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setState({ status: 'idle' })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [state])

  const handleSubmit = async (invoer: PropertyInput) => {
    setState({ status: 'loading' })
    try {
      // Verkoopadvies-fase heeft nog geen vaste vraagprijs — de
      // content-generatie vraagt wel om een prijs, dus die valt terug op de
      // prijsverwachting.
      const input: PropertyInput = { ...invoer, vraagprijs: invoer.vraagprijs ?? invoer.prijsverwachting_verkoper }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      // Bij een time-out (Vercel 504) komt HTML terug i.p.v. JSON — veilig parsen zodat
      // de gebruiker geen rauwe parse-fout ("The string did not match...") ziet.
      let json: { error?: string; output?: ContentOutput; object_id?: string | null } | null = null
      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok || !json) {
        const timeout = [408, 502, 503, 504, 524].includes(res.status)
        setState({
          status: 'error',
          message: json?.error ?? (timeout
            ? 'Het genereren duurde te lang en is afgebroken. Dit gebeurt soms bij drukte — probeer het over een halve minuut opnieuw.'
            : 'Aanmaken mislukt. Probeer het opnieuw.'),
          isRateLimit: res.status === 429,
        })
        return
      }
      clearDraft()

      if (json.object_id) {
        router.push(`/object/${json.object_id}`)
      } else {
        // Geen Supabase geconfigureerd (lokale fallback) — er is geen dossier om naartoe te gaan.
        setState({ status: 'idle' })
      }
    } catch {
      // Netwerkfout of afgebroken verbinding — geen technische boodschap tonen.
      setState({
        status: 'error',
        message: 'Er ging iets mis met de verbinding. Controleer je internet en probeer het opnieuw.',
      })
    }
  }

  const handleReset = () => setState({ status: 'idle' })

  return (
    <>
      {state.status === 'idle' && (
        <div>
          <Link
            href="/woningen"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#98A0A6', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}
          >
            ← Terug naar woningen
          </Link>
          <Eyebrow>Nieuwe woning</Eyebrow>
          <SerifTitle accent="een dossier" size={34} style={{ marginBottom: 8 }}>Start</SerifTitle>
          <p style={{ fontSize: 14.5, color: '#5C6470', margin: '0 0 30px', lineHeight: 1.55 }}>
            Eén intake in zes stappen — voedt zowel de waardebepaling als straks de content. Je start in Verkoopadvies; content wordt zichtbaar zodra je de fase naar In verkoop zet.
          </p>

          <div style={card}>
            {/* Zichtbaar buiten productie, of als het kantoor van de ingelogde
                makelaar instellingen_json.demo === true heeft (item 2.3 —
                `toonDemoKnop` wordt server-side bepaald in page.tsx). Vult
                echte Herengracht-demodata in, niets voor een live kantoor. */}
            {toonDemoKnop && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={fillDemo}
                  style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', whiteSpace: 'nowrap' }}
                >
                  Vul een voorbeeld in
                </button>
              </div>
            )}
            <PropertyForm key={formKey} onSubmit={handleSubmit} disabled={isLoading} />
          </div>
        </div>
      )}

      {state.status === 'loading' && <LoadingProgress />}

      {state.status === 'error' && (
        <div style={{ ...card, textAlign: 'center' }}>
          {state.isRateLimit ? (
            <>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--merk-zacht)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--merk)">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#14181B', marginBottom: 6 }}>Vorige generatie nog bezig</p>
              <p style={{ fontSize: 14, color: '#5C6470', marginBottom: 20 }}>
                Automatisch opnieuw beschikbaar over{' '}
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--merk)' }}>{countdown}s</span>
              </p>
              <div style={{ width: '100%', maxWidth: 280, margin: '0 auto', background: 'var(--merk-zacht)', borderRadius: 'var(--merk-radius-pill, 9999px)', height: 6 }}>
                <div
                  style={{ background: 'var(--merk)', height: 6, borderRadius: 'var(--merk-radius-pill, 9999px)', transition: 'width 1s', width: `${((RATE_LIMIT_SECONDS - countdown) / RATE_LIMIT_SECONDS) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 20 }}>{state.message}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleReset}
                  style={{ borderRadius: 'var(--merk-radius-md, 11px)', background: 'var(--merk)', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--merk-rgb),.22)' }}
                >
                  Probeer opnieuw
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
