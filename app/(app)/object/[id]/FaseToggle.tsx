'use client'

import { useState, useTransition } from 'react'
import type { ObjectFase, PitchUitslag } from '@/lib/schemas'
import { setObjectFase, setPitchUitslag } from './actions'

const FASE_LABEL: Record<ObjectFase, string> = {
  acquisitie: 'Acquisitie',
  in_verkoop: 'In verkoop',
  verkocht: 'Verkocht',
}

const UITSLAG_CONFIG: Record<PitchUitslag, { label: string; kleur: string }> = {
  open: { label: 'Open', kleur: 'bg-amber-100 text-amber-700' },
  gewonnen: { label: 'Gewonnen', kleur: 'bg-green-100 text-[var(--merk-hover,#114230)]' },
  verloren: { label: 'Verloren', kleur: 'bg-red-100 text-red-700' },
}

/**
 * Fasebediening bovenaan het woningdossier (besluit 16 sep 2026, zie
 * CLAUDE.md § Hoofdstructuur). In de acquisitiefase kies je de pitch-uitslag
 * — "Gewonnen" schuift het dossier automatisch door naar In verkoop. Vanaf
 * In verkoop kun je de woning als verkocht markeren; alles blijft daarna
 * gewoon bereikbaar, alleen archief-gelabeld.
 */
export function FaseToggle({
  objectId,
  fase: initieleFase,
  pitchUitslag: initieleUitslag,
}: {
  objectId: string
  fase: ObjectFase
  pitchUitslag: PitchUitslag | null
}) {
  const [fase, setFase] = useState(initieleFase)
  const [uitslag, setUitslag] = useState<PitchUitslag>(initieleUitslag ?? 'open')
  const [isPending, startTransition] = useTransition()

  const kiesUitslag = (nieuw: PitchUitslag) => {
    if (nieuw === uitslag) return
    startTransition(async () => {
      const result = await setPitchUitslag(objectId, nieuw)
      if (result.ok) {
        setUitslag(nieuw)
        if (result.fase) setFase(result.fase)
      }
    })
  }

  const markeerVerkocht = () => {
    startTransition(async () => {
      const result = await setObjectFase(objectId, 'verkocht')
      if (result.ok) setFase('verkocht')
    })
  }

  if (fase === 'acquisitie') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12.5, color: '#98A0A6', fontWeight: 600 }}>Acquisitie —</span>
        <div style={{ display: 'inline-flex', borderRadius: 10, overflow: 'hidden', border: '1px solid #E1E5E9' }}>
          {(Object.keys(UITSLAG_CONFIG) as PitchUitslag[]).map(key => (
            <button
              key={key}
              type="button"
              disabled={isPending}
              onClick={() => kiesUitslag(key)}
              className={`text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60 ${uitslag === key ? UITSLAG_CONFIG[key].kleur : 'bg-white text-gray-400 hover:bg-gray-50'}`}
            >
              {UITSLAG_CONFIG[key].label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (fase === 'in_verkoop') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-[var(--merk-hover,#114230)]">
          In verkoop
        </span>
        <button
          type="button"
          onClick={markeerVerkocht}
          disabled={isPending}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-60"
        >
          Markeer als verkocht
        </button>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600">
      {FASE_LABEL.verkocht}
    </span>
  )
}
