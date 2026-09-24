'use client'

/**
 * Kwartaalbericht-modal (item 6.4, docs/roadmap.md § 5 Fase 6 — poort van
 * `docs/ontwerp/marktanalyse.html` § "Kwartaalbericht"). Schrijft op
 * knopdruk een AI-kwartaalbericht op basis van de actieve marktanalyse-
 * selectie (`POST /api/kwartaalbericht`): een feitenblad uit
 * `marktanalyseSamenvatting` + het eigen aandeel, gecontroleerd op verzonnen
 * cijfers vóór hij hier verschijnt. Geen opslag — kopiëren of downloaden als
 * `.md`, dat is alles.
 */

import { useEffect, useRef, useState } from 'react'
import { Button, Modal, SegmentedToggle, Skeleton } from '@/components/ui'
import { colors, radius } from '@/components/ui/tokens'
import type { MarktanalyseFilterState } from '@/lib/marktanalyse'

type Taal = 'nl' | 'en'

type Resultaat = {
  tekst: string
  periodeLabel: string | null
  contextLabel: string
  dataTotEnMet: string | null
}

export function KwartaalberichtModal({
  filter,
  onClose,
}: {
  filter: MarktanalyseFilterState
  onClose: () => void
}) {
  const [taal, setTaal] = useState<Taal>('nl')
  const [resultaten, setResultaten] = useState<Partial<Record<Taal, Resultaat>>>({})
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [gekopieerd, setGekopieerd] = useState(false)
  const geannuleerd = useRef(false)

  useEffect(() => {
    geannuleerd.current = false
    return () => { geannuleerd.current = true }
  }, [])

  // `components/ui/Modal.tsx` sluit zelf al bij een klik buiten het paneel,
  // maar heeft (nog) geen Escape-listener — die vult deze modal lokaal aan,
  // conform docs/ontwerpprincipes.md § Interactie ("elk paneel/elke modal
  // sluit met Escape"). Zie het eindrapport: dit is een gat in de gedeelde
  // primitive, hier bewust lokaal opgelost i.p.v. in components/ui/ zelf.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Losse functie i.p.v. alles in de effect-body: "Opnieuw proberen" moet
  // dezelfde aanroep opnieuw kunnen doen zonder dat `taal` verandert (een
  // effect met `[taal]` als dependency vuurt anders niet opnieuw).
  const haalOp = (t: Taal) => {
    setLaden(true)
    setFout(null)
    fetch('/api/kwartaalbericht', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter, taal: t }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Het kwartaalbericht kon niet worden geschreven.')
        return data as Resultaat
      })
      .then(data => {
        if (geannuleerd.current) return
        setResultaten(prev => ({ ...prev, [t]: data }))
      })
      .catch((err: Error) => {
        if (!geannuleerd.current) setFout(err.message || 'Het kwartaalbericht kon niet worden geschreven.')
      })
      .finally(() => {
        if (!geannuleerd.current) setLaden(false)
      })
  }

  useEffect(() => {
    if (!resultaten[taal]) haalOp(taal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taal])

  const actief = resultaten[taal]

  const kopieer = async () => {
    if (!actief) return
    try {
      await navigator.clipboard.writeText(actief.tekst)
      setGekopieerd(true)
      setTimeout(() => setGekopieerd(false), 2000)
    } catch {
      setFout('Kopiëren is niet gelukt in deze browser — selecteer en kopieer de tekst handmatig.')
    }
  }

  const download = () => {
    if (!actief) return
    const blob = new Blob([actief.tekst], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kwartaalbericht-${taal}-${(actief.dataTotEnMet ?? 'concept').slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const opnieuwProberen = () => {
    setResultaten(prev => {
      const kopie = { ...prev }
      delete kopie[taal]
      return kopie
    })
    haalOp(taal)
  }

  // Rood accentstreepje vóór de titel zodra het bericht klaar is om te
  // controleren (poort van `.modal.klaar h2::before` in docs/ontwerp/marktanalyse.html).
  const titel = actief ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 3, height: 20, borderRadius: 2, background: 'var(--merk-accent)', flexShrink: 0 }} />
      Kwartaalbericht
    </span>
  ) : 'Kwartaalbericht'

  return (
    <Modal onClose={onClose} title={titel} maxWidth={640}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>
          {actief
            ? <>Elk getal in de tekst komt uit het feitenblad van de huidige selectie · {actief.contextLabel}</>
            : <>Wordt geschreven op basis van de huidige selectie…</>}
        </p>
        <SegmentedToggle
          size="sm"
          options={[{ value: 'nl', label: 'NL' }, { value: 'en', label: 'EN' }]}
          value={taal}
          onChange={v => setTaal(v as Taal)}
        />
      </div>

      {fout ? (
        <div style={{ padding: '14px 16px', borderRadius: radius.md, background: '#FFFBEE', border: '1px solid #F1DFA6', color: '#7A5A00', fontSize: 13.5 }}>
          <p style={{ margin: '0 0 10px' }}>{fout}</p>
          <Button variant="secondary" size="sm" onClick={opnieuwProberen}>Opnieuw proberen</Button>
        </div>
      ) : laden || !actief ? (
        <div>
          <Skeleton height={12} width="90%" />
          <Skeleton height={12} width="100%" style={{ marginTop: 10 }} />
          <Skeleton height={12} width="96%" style={{ marginTop: 10 }} />
          <Skeleton height={12} width="70%" style={{ marginTop: 10 }} />
          <Skeleton height={12} width="94%" style={{ marginTop: 10 }} />
          <Skeleton height={12} width="60%" style={{ marginTop: 10 }} />
        </div>
      ) : (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: 14,
            color: colors.bodyStrong,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: '16px 18px',
            background: colors.surfaceAlt,
            maxHeight: '48vh',
            overflowY: 'auto',
          }}
        >
          {actief.tekst}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Sluiten</Button>
        <Button variant="secondary" size="sm" onClick={download} disabled={!actief}>Download .md</Button>
        <Button variant="primary" size="sm" onClick={kopieer} disabled={!actief}>
          {gekopieerd ? 'Gekopieerd' : 'Kopiëren'}
        </Button>
      </div>
    </Modal>
  )
}
