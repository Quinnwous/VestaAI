'use client'

import { useEffect, useRef, useState } from 'react'
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
 * Teksten-tab van het woningdossier (item 3.1, docs/roadmap.md § 3.2 "Dossier
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
  const [now, setNow] = useState(() => Date.now())
  const pollingSindsRef = useRef(contentBezigSinds)

  useEffect(() => {
    setStatus(initieleStatus)
    pollingSindsRef.current = contentBezigSinds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initieleStatus, contentBezigSinds])

  // Timer (tick elke seconde) + polling (elke 3s) zolang de generatie bezig is.
  useEffect(() => {
    if (status !== 'bezig') return

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
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [status, objectId, router])

  const startGeneratie = async () => {
    setStarting(true)
    pollingSindsRef.current = new Date().toISOString()
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
    const sinds = pollingSindsRef.current
    const verstreken = sinds ? now - new Date(sinds).getTime() : 0
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 14, height: 14, border: '2px solid var(--merk-zacht)', borderTopColor: 'var(--merk)', borderRadius: '50%', animation: 'ctt-spin .8s linear infinite' }} />
          <style>{'@keyframes ctt-spin { to { transform: rotate(360deg); } }'}</style>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--merk)' }}>Content genereren (NL + EN)…</span>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#98A0A6' }}>{formatMmSs(verstreken)}</span>
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
