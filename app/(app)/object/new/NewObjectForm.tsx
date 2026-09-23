'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PropertyInput } from '@/lib/schemas'
import { PropertyForm, clearDraft } from '@/components/PropertyForm'
import { Eyebrow, SerifTitle } from '@/components/ui'

const DRAFT_KEY = 'vestaai_form_draft'

const DEMO_DATA: PropertyInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype_groep: 'appartement',
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
  | { status: 'error'; message: string }

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
 * zie CLAUDE.md § Hoofdstructuur). Sinds item 3.1 (docs/roadmap.md § 3.2)
 * slaat dit formulier alleen de intake op via `POST /api/object` — geen
 * Claude-call, dus geen 1-2 minuten wachten. Content komt pas op knopdruk of
 * automatisch bij de fase-overgang naar In verkoop (zie
 * components/ObjectWorkspace.tsx `ContentTekstenTab`). Na aanmaken gaat de
 * makelaar direct naar het nieuwe dossier.
 */
type Props = {
  /** true buiten productie, of als het kantoor van de ingelogde makelaar
   * instellingen_json.demo === true heeft (item 2.3, zie app/(app)/object/new/page.tsx). */
  toonDemoKnop: boolean
}

export function NewObjectForm({ toonDemoKnop }: Props) {
  const router = useRouter()
  const [state, setState] = useState<PageState>({ status: 'idle' })
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

  const handleSubmit = async (invoer: PropertyInput) => {
    setState({ status: 'loading' })
    try {
      // Verkoopadvies-fase heeft nog geen vaste vraagprijs — content-generatie
      // (later, op knopdruk) vraagt wel om een prijs, dus die valt terug op de
      // prijsverwachting.
      const input: PropertyInput = { ...invoer, vraagprijs: invoer.vraagprijs ?? invoer.prijsverwachting_verkoper }

      const res = await fetch('/api/object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      // Bij een time-out (Vercel 504) komt HTML terug i.p.v. JSON — veilig parsen zodat
      // de gebruiker geen rauwe parse-fout ("The string did not match...") ziet.
      let json: { error?: string; id?: string } | null = null
      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok || !json || !json.id) {
        const timeout = [408, 502, 503, 504, 524].includes(res.status)
        setState({
          status: 'error',
          message: json?.error ?? (timeout
            ? 'Het aanmaken duurde te lang en is afgebroken. Dit gebeurt soms bij drukte — probeer het over een halve minuut opnieuw.'
            : 'Aanmaken mislukt. Probeer het opnieuw.'),
        })
        return
      }
      clearDraft()
      // Buurtdata ophalen en opslaan (item 10.3) gebeurt los van deze
      // aanmaakflow: niet awaiten, zodat de <5s-belofte van dossier aanmaken
      // (item 3.1) intact blijft — `fetchVerrijking` doet drie parallelle
      // externe calls met oplopend tot 10s timeout. `keepalive` laat het
      // verzoek doorlopen ook al navigeert de browser meteen door naar het
      // dossier; de tab "Buurt & data" probeert daar zelf nog een keer te
      // verversen als dit nog niet klaar is.
      fetch(`/api/object/${json.id}/verrijking`, { method: 'POST', keepalive: true }).catch(() => {})
      router.push(`/object/${json.id}`)
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

      {state.status === 'loading' && (
        <div style={{ ...card, textAlign: 'center', padding: '60px 28px' }}>
          <div style={{ width: 40, height: 40, margin: '0 auto 18px', border: '3px solid var(--merk-zacht)', borderTopColor: 'var(--merk)', borderRadius: '50%', animation: 'nof-spin .8s linear infinite' }} />
          <style>{'@keyframes nof-spin { to { transform: rotate(360deg); } }'}</style>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: '#14181B', margin: '0 0 4px' }}>Dossier aanmaken…</p>
          <p style={{ fontSize: 13, color: '#98A0A6', margin: 0 }}>Dit duurt een paar seconden — content genereer je zo dadelijk vanuit het dossier.</p>
        </div>
      )}

      {state.status === 'error' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 20 }}>{state.message}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleReset}
              style={{ borderRadius: 'var(--merk-radius-md, 11px)', background: 'var(--merk)', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--merk-rgb),.22)' }}
            >
              Probeer opnieuw
            </button>
          </div>
        </div>
      )}
    </>
  )
}
