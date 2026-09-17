'use client'

import { useState, useTransition, type CSSProperties, type ReactNode } from 'react'
import { setObjectFase } from '@/app/(app)/object/[id]/actions'
import { StatusToggle } from '@/app/(app)/object/[id]/StatusToggle'
import { colors, Eyebrow, SerifTitle } from '@/components/ui'
import { dagenInFase, formatDatum, formatM2 } from '@/lib/utils'
import { woningtypeLabel, type ObjectFase, type PropertyInput } from '@/lib/schemas'

const FASE_ORDE: ObjectFase[] = ['verkoopadvies', 'in_verkoop', 'verkocht']
const FASE_LABEL: Record<ObjectFase, string> = {
  verkoopadvies: 'Verkoopadvies',
  in_verkoop: 'In verkoop',
  verkocht: 'Verkocht',
}
type ObjectStatus = 'draft' | 'published' | 'onder_bod' | 'verkocht'

/**
 * Dossierheader (item 3.4, docs/roadmap.md § Fase 3): adres + plaats,
 * kenmerkenregel, fasestepper in de stijl van docs/ontwerp/waardebepaling.html
 * (pillen met een pijl ertussen, actieve fase in de merkkleur — zie
 * `.fasestap`/`.fasepijl` daar) en "X dagen in <fase>". Vervangt de oude
 * FaseToggle.tsx volledig: dezelfde server action + dezelfde fire-and-forget
 * generatietrigger naar `/api/generate` bij de overgang naar In verkoop,
 * alleen nu vanuit klikbare fasestepper-pillen i.p.v. één knop.
 *
 * Puur weergave op de kenmerken/adres na — de fasestepper is de enige
 * interactieve state hier (client component vanwege de server-action-call).
 * De volledige v2-hero (foto, waarde/content-statusblok, acties) is item
 * 10.2 en zit bewust niet in dit component.
 */
export function DossierHeader({
  objectId,
  address,
  fase: initieleFase,
  faseSinds: initieleFaseSinds,
  invoer,
  status,
  aangemaaktOp,
  acties,
}: {
  objectId: string
  address: string
  fase: ObjectFase
  /** ISO-tijdstip van de laatste faseovergang (kolom objecten.fase_sinds, item 3.4). */
  faseSinds: string
  invoer: PropertyInput
  status: ObjectStatus
  /** Aanmaakdatum, alleen ter info naast de stepper — niet verplicht. */
  aangemaaktOp?: string
  /** Actieknoppen rechtsboven (Regenereer/Verwijderen) — dit component regelt zelf geen dossieracties buiten de fase. */
  acties?: ReactNode
}) {
  const [fase, setFase] = useState(initieleFase)
  const [faseSinds, setFaseSinds] = useState(initieleFaseSinds)
  const [isPending, startTransition] = useTransition()

  const komma = address.lastIndexOf(',')
  const straat = komma > -1 ? address.slice(0, komma) : address
  const stad = komma > -1 ? address.slice(komma + 1).trim() : undefined

  const kenmerken = [
    woningtypeLabel(invoer),
    invoer.oppervlak_m2 ? formatM2(invoer.oppervlak_m2) : '',
    invoer.bouwjaar ? `Bouwjaar ${invoer.bouwjaar}` : '',
  ].filter(Boolean).join(' · ')

  const huidigeIndex = FASE_ORDE.indexOf(fase)

  const klikFase = (doel: ObjectFase, richting: 'vooruit' | 'terug') => {
    if (isPending) return
    if (richting === 'terug') {
      const vraag = doel === 'verkoopadvies'
        ? 'Dossier terugzetten naar Verkoopadvies? Content en waardering blijven gewoon bewaard.'
        : 'Dossier terugzetten naar In verkoop?'
      if (!window.confirm(vraag)) return
    }
    startTransition(async () => {
      const result = await setObjectFase(objectId, doel)
      if (!result.ok) {
        window.alert(result.error ?? 'Kon de fase niet wijzigen.')
        return
      }
      setFase(doel)
      if (result.faseSinds) setFaseSinds(result.faseSinds)
      // Content-generatie start automatisch bij de overgang naar In verkoop,
      // als er nog niets staat (item 3.1, docs/roadmap.md § 3.2) —
      // fire-and-forget, niet awaiten: de makelaar hoeft niet te wachten, de
      // Teksten-tab (ContentTekstenTab) pollt zelf op de status. Via de
      // normale /api/generate-route (niet rechtstreeks lib/contentGeneratie.ts)
      // zodat CONTENT_VERGRENDELD en de lock hetzelfde blijven werken als bij
      // de oude handmatige knop in FaseToggle.tsx.
      if (doel === 'in_verkoop' && result.contentStatus === 'geen') {
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectId }),
        }).catch(() => { /* de Teksten-tab ontdekt het resultaat via polling */ })
      }
    })
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <Eyebrow>Woning</Eyebrow>
          <SerifTitle size={32} accent={stad} style={{ marginBottom: 8 }}>{stad ? `${straat},` : straat}</SerifTitle>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: colors.body, margin: '0 0 14px' }}>{kenmerken}</p>
        </div>
        {acties && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{acties}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <FaseStepper huidigeIndex={huidigeIndex} isPending={isPending} onKlik={klikFase} />
        <span style={{ fontSize: 12.5, color: colors.muted }}>
          {dagenInFase(faseSinds)} in {FASE_LABEL[fase]}
        </span>
        {fase !== 'verkoopadvies' && <StatusToggle objectId={objectId} initialStatus={status} />}
        {aangemaaktOp && (
          <span style={{ fontSize: 12.5, color: colors.muted }}>Aangemaakt {formatDatum(aangemaaktOp)}</span>
        )}
      </div>
    </div>
  )
}

function FaseStepper({
  huidigeIndex,
  isPending,
  onKlik,
}: {
  huidigeIndex: number
  isPending: boolean
  onKlik: (doel: ObjectFase, richting: 'vooruit' | 'terug') => void
}) {
  const basisPil: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 13px',
    borderRadius: 'var(--merk-radius-pill, 9999px)',
    fontSize: 12.5,
    fontWeight: 700,
    background: colors.surfaceAlt,
    color: colors.body,
    border: 'none',
  }
  const actiefPil: CSSProperties = {
    ...basisPil,
    background: 'var(--merk-zacht)',
    color: 'var(--merk-diep)',
    boxShadow: '0 0 0 1px var(--merk-rand) inset',
  }
  const klikbaarPil: CSSProperties = {
    ...basisPil,
    cursor: isPending ? 'default' : 'pointer',
    opacity: isPending ? .6 : 1,
  }

  return (
    <div role="group" aria-label="Fase van dit dossier" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {FASE_ORDE.map((f, i) => {
        const isActief = i === huidigeIndex
        const isAfgerond = i < huidigeIndex
        const klikbaar = !isActief && Math.abs(i - huidigeIndex) === 1
        const label = `${isAfgerond ? '✓ ' : ''}${FASE_LABEL[f]}`

        return (
          <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {klikbaar ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onKlik(f, i > huidigeIndex ? 'vooruit' : 'terug')}
                style={klikbaarPil}
              >
                {label}
              </button>
            ) : (
              <span style={isActief ? actiefPil : basisPil}>{label}</span>
            )}
            {i < FASE_ORDE.length - 1 && (
              <span style={{ color: colors.muted, fontSize: 12 }} aria-hidden="true">›</span>
            )}
          </span>
        )
      })}
    </div>
  )
}
