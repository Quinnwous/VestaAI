'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState, Skeleton } from '@/components/ui'
import { ResultTabs } from '@/components/ResultTabs'
import type { ContentOutput, ObjectContentStatus } from '@/lib/schemas'

const POLL_MS = 3000

function formatMmSs(ms: number): string {
  const totaal = Math.max(0, Math.floor(ms / 1000))
  const mm = Math.floor(totaal / 60).toString().padStart(2, '0')
  const ss = (totaal % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

const knopStijl: React.CSSProperties = {
  borderRadius: 'var(--merk-radius-md, 11px)',
  background: 'var(--merk)',
  color: 'var(--merk-op)',
  border: 'none',
  padding: '11px 22px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

/**
 * Teksten-tab van het woningdossier (item 3.1, docs/architectuur.md § 2 "Dossier
 * los van content"): content komt niet meer synchroon bij het aanmaken, maar
 * op knopdruk of bij de fase-overgang naar In verkoop. Toont de vier standen
 * van `objecten.content_status` — pollt elke 3s op `/api/object/[id]/status`
 * zolang er een generatie loopt, en doet dan `router.refresh()` zodat de
 * server-component (`app/(app)/object/[id]/page.tsx`) de verse
 * `outputs_json`/`outputs_json_en` ophaalt.
 */
export function ContentTekstenTab({
  objectId,
  outputs,
  outputsEn,
  contentStatus: initieleStatus,
  contentBezigSinds,
}: {
  objectId: string
  outputs: ContentOutput
  outputsEn: ContentOutput | null
  contentStatus: ObjectContentStatus
  contentBezigSinds: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ObjectContentStatus>(initieleStatus)
  const [starting, setStarting] = useState(false)
  // null tot de eerste tik in de browser: Date.now() tijdens de server-render
  // gaf een andere tijd dan bij de hydratie (valkuil 19 sep, CLAUDE.md).
  const [now, setNow] = useState<number | null>(null)
  // Was een ref, maar wordt tijdens render gelezen (hieronder, voor de
  // verstreken tijd) — dat mag niet meer (react-hooks/refs), dus gewoon state.
  const [pollingSinds, setPollingSinds] = useState(contentBezigSinds)

  // `status`/`pollingSinds` volgen de server-props zodra die veranderen (na
  // een router.refresh()) — state aanpassen tijdens render i.p.v. een effect
  // (React-docs "Adjusting some state when a prop changes"): vergelijk met de
  // vorige render en zet dan in dezelfde render terug.
  const [prevInitieleStatus, setPrevInitieleStatus] = useState(initieleStatus)
  const [prevContentBezigSinds, setPrevContentBezigSinds] = useState(contentBezigSinds)
  if (initieleStatus !== prevInitieleStatus || contentBezigSinds !== prevContentBezigSinds) {
    setPrevInitieleStatus(initieleStatus)
    setPrevContentBezigSinds(contentBezigSinds)
    setStatus(initieleStatus)
    setPollingSinds(contentBezigSinds)
  }

  // Timer (tick elke seconde) + polling (elke 3s) zolang de generatie bezig is.
  useEffect(() => {
    if (status !== 'bezig') return

    const eerste = requestAnimationFrame(() => setNow(Date.now()))
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const poll = setInterval(() => {
      fetch(`/api/object/${objectId}/status`)
        .then(res => (res.ok ? res.json() : null))
        .then((data: { content_status?: ObjectContentStatus } | null) => {
          if (!data?.content_status || data.content_status === 'bezig') return
          setStatus(data.content_status)
          router.refresh()
        })
        .catch(() => { /* volgende poll probeert het opnieuw */ })
    }, POLL_MS)

    return () => {
      cancelAnimationFrame(eerste)
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [status, objectId, router])

  const startGeneratie = async () => {
    setStarting(true)
    setPollingSinds(new Date().toISOString())
    setStatus('bezig')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId }),
      })
      // Een 409 (al bezig) is geen fout hier — de poller die zojuist startte
      // ontdekt vanzelf de echte status van de lopende generatie.
      if (!res.ok && res.status !== 409) {
        setStatus('fout')
      }
    } catch {
      setStatus('fout')
    } finally {
      setStarting(false)
    }
  }

  if (status === 'geen') {
    return (
      <EmptyState
        illustratie="woning"
        titel="Nog geen content gegenereerd"
        beschrijving="Genereer de volledige tekstsuite (Funda, brochure, social, e-mail, buurt) in het Nederlands én Engels."
        actie={
          <button type="button" onClick={startGeneratie} disabled={starting} style={{ ...knopStijl, opacity: starting ? .6 : 1, cursor: starting ? 'not-allowed' : 'pointer' }}>
            Genereer content (NL + EN)
          </button>
        }
      />
    )
  }

  if (status === 'bezig') {
    const verstreken = pollingSinds && now != null ? Math.max(0, now - new Date(pollingSinds).getTime()) : 0
    // Tijdgebaseerde voortgang (geen echte meting): NL + EN duurt op Vercel
    // ± 100 s (gemeten 1 okt, CLAUDE.md). De balk loopt daar zacht naartoe en
    // blijft onder 92 % hangen tot de status echt "klaar" is — nooit een
    // schijnbaar volle balk die nog op zich laat wachten.
    const voortgang = Math.min(0.92, 1 - Math.exp(-verstreken / 55000))
    return (
      <div className="vui-binnen-zacht" style={{ display: 'grid', gap: 16 }}>
        <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid var(--merk-rand)', background: 'linear-gradient(180deg, var(--merk-zacht), #fff 80%)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span aria-hidden className="vui-fase-puls" style={{ margin: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--merk-tekst)' }}>Content wordt geschreven (NL + EN)</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13, color: '#5C6470' }} aria-label="Verstreken tijd">{formatMmSs(verstreken)}</span>
          </div>
          <div role="progressbar" aria-label="Geschatte voortgang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(voortgang * 100)} style={{ position: 'relative', height: 6, borderRadius: 'var(--merk-radius-pill, 9999px)', background: 'rgba(var(--merk-rgb), .14)', overflow: 'hidden', margin: '14px 0 10px' }}>
            <div className="vui-voortgang" style={{ position: 'absolute', inset: 0, right: 'auto', width: `${(voortgang * 100).toFixed(1)}%`, borderRadius: 'var(--merk-radius-pill, 9999px)', background: 'linear-gradient(90deg, var(--merk-licht), var(--merk))', transition: 'width 1s linear' }} />
          </div>
          <p style={{ fontSize: 12.5, color: '#5C6470', margin: 0 }}>
            Duurt meestal ± 1½ minuut. Je kunt intussen gewoon verder werken; de teksten verschijnen hier vanzelf.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {['Funda-tekst', 'Brochure', 'Instagram', 'LinkedIn', 'Koper-e-mail', 'Buurtomschrijving', 'Engelse versie'].map((t, i) => (
              <span key={t} className="vui-skeleton vui-binnen" style={{ ['--i' as string]: i, display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: 'var(--merk-radius-pill, 9999px)', background: '#fff', border: '1px solid var(--merk-rand)', fontSize: 12.5, fontWeight: 600, color: '#2C3238' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <Skeleton height={22} width="35%" />
          <Skeleton height={130} rounded={14} />
          <Skeleton height={130} rounded={14} />
        </div>
      </div>
    )
  }

  if (status === 'fout') {
    return (
      <EmptyState
        titel="Genereren is mislukt"
        beschrijving="Er ging iets mis bij het genereren van de content. Probeer het opnieuw."
        actie={
          <button type="button" onClick={startGeneratie} disabled={starting} style={{ ...knopStijl, opacity: starting ? .6 : 1, cursor: starting ? 'not-allowed' : 'pointer' }}>
            Opnieuw
          </button>
        }
      />
    )
  }

  return <ResultTabs data={outputs} dataEn={outputsEn} objectId={objectId} onResetHref="/woningen" />
}
