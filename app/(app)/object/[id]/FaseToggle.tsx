'use client'

import { useState, useTransition } from 'react'
import type { ObjectFase } from '@/lib/schemas'
import { colors } from '@/components/ui'
import { setObjectFase } from './actions'

const FASE_LABEL: Record<ObjectFase, string> = {
  verkoopadvies: 'Verkoopadvies',
  in_verkoop: 'In verkoop',
  verkocht: 'Verkocht',
}

/**
 * Fasebediening bovenaan het woningdossier (besluit 16 sep 2026, zie
 * CLAUDE.md § Hoofdstructuur). Geen pitch-concept meer (item 1.9c, besluit
 * Quinn 17 sep 2026): er bestaat geen "gewonnen/verloren" meer — de opdracht
 * is zo goed als binnen zodra het verkoopadvies op papier staat. De makelaar
 * zet de fase handmatig door: Verkoopadvies → In verkoop → Verkocht.
 */
export function FaseToggle({
  objectId,
  fase: initieleFase,
}: {
  objectId: string
  fase: ObjectFase
}) {
  const [fase, setFase] = useState(initieleFase)
  const [isPending, startTransition] = useTransition()

  const naarInVerkoop = () => {
    startTransition(async () => {
      const result = await setObjectFase(objectId, 'in_verkoop')
      if (result.ok) {
        setFase('in_verkoop')
        // Content-generatie start automatisch bij de fase-overgang, als er
        // nog niets staat (item 3.1, docs/roadmap.md § 3.2) — fire-and-
        // forget, niet awaiten: de makelaar hoeft niet te wachten, de
        // Teksten-tab (ContentTekstenTab) pollt zelf op de status. Via de
        // normale /api/generate-route (niet rechtstreeks lib/contentGeneratie.ts)
        // zodat CONTENT_VERGRENDELD en de lock hetzelfde blijven werken als
        // bij de handmatige knop.
        if (result.contentStatus === 'geen') {
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objectId }),
          }).catch(() => { /* de Teksten-tab ontdekt het resultaat via polling */ })
        }
      }
    })
  }

  const markeerVerkocht = () => {
    startTransition(async () => {
      const result = await setObjectFase(objectId, 'verkocht')
      if (result.ok) setFase('verkocht')
    })
  }

  if (fase === 'verkoopadvies') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--merk-radius-pill, 9999px)', padding: '4px 12px', fontSize: 12.5, fontWeight: 600, background: 'var(--merk-zacht)', color: 'var(--merk-hover)' }}>
          {FASE_LABEL.verkoopadvies}
        </span>
        <button
          type="button"
          onClick={naarInVerkoop}
          disabled={isPending}
          style={{ fontSize: 12.5, fontWeight: 600, color: colors.body, background: 'none', border: 'none', cursor: 'pointer', opacity: isPending ? .6 : 1 }}
        >
          Naar In verkoop
        </button>
      </div>
    )
  }

  if (fase === 'in_verkoop') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--merk-radius-pill, 9999px)', padding: '4px 12px', fontSize: 12.5, fontWeight: 600, background: 'var(--merk-zacht)', color: 'var(--merk-hover)' }}>
          {FASE_LABEL.in_verkoop}
        </span>
        <button
          type="button"
          onClick={markeerVerkocht}
          disabled={isPending}
          style={{ fontSize: 12.5, fontWeight: 600, color: colors.body, background: 'none', border: 'none', cursor: 'pointer', opacity: isPending ? .6 : 1 }}
        >
          Markeer als verkocht
        </button>
      </div>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--merk-radius-pill, 9999px)', padding: '4px 12px', fontSize: 12.5, fontWeight: 600, background: '#F5F6F8', color: colors.body }}>
      {FASE_LABEL.verkocht}
    </span>
  )
}
