'use client'

import { useState, useTransition, type CSSProperties, type ReactNode } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { setObjectFase } from '@/app/(app)/object/[id]/actions'
import { StatusToggle } from '@/app/(app)/object/[id]/StatusToggle'
import { colors, radius, shadow, Eyebrow, SerifTitle, StatTile } from '@/components/ui'
import { WaardebepalingPdfButton } from '@/components/WaardebepalingPdfButton'
import { formatDatum, formatM2 } from '@/lib/utils'
import { euro } from '@/lib/opmaak'
import { woningtypeLabel, type ObjectContentStatus, type ObjectFase, type PropertyInput } from '@/lib/schemas'

const FASE_ORDE: ObjectFase[] = ['verkoopadvies', 'in_verkoop', 'verkocht']
const FASE_LABEL: Record<ObjectFase, string> = {
  verkoopadvies: 'Verkoopadvies',
  in_verkoop: 'In verkoop',
  verkocht: 'Verkocht',
}
const CONTENT_STATUS_LABEL: Record<ObjectContentStatus, string> = {
  geen: 'Nog geen content',
  bezig: 'Content wordt gemaakt…',
  klaar: 'Content klaar',
  fout: 'Content mislukt',
}
type ObjectStatus = 'draft' | 'published' | 'onder_bod' | 'verkocht'

/**
 * Dossierheader v2 (item 10.2, docs/roadmap.md § Fase 10) — poort van
 * `docs/ontwerp/startpagina.html` deel B (`.dossier-hero`): witte kaart met
 * foto links (eerste uit `FotoBibliotheek`, anders een merkverloop — zo
 * gevraagd in de item-spec; de oudere "zonder-foto"-staat uit item 3.4 wordt
 * hierdoor vervangen), adres/kenmerken/fasestepper ernaast, en rechts drie
 * `StatTile`s (waarde/vraagprijs/dagen-in-fase) + een knoppenrij (pdf,
 * content, bestaande dossieracties).
 *
 * "Dagen in fase" komt als kant-en-klaar getal binnen (`dagenInFaseAantal`,
 * uitgerekend in `page.tsx` met de servertijd) — nooit `new Date()` hier:
 * dit is een client component en dat gaf eerder een hydratiemismatch (zie
 * CLAUDE.md). Na een fase-wissel wordt dat getal lokaal op 0 gezet (de
 * overgang is "vandaag"), zonder opnieuw een datum te hoeven berekenen.
 */
export function DossierHeader({
  objectId,
  address,
  fase: initieleFase,
  dagenInFaseAantal: initieelDagenInFase,
  invoer,
  status,
  aangemaaktOp,
  acties,
  fotoUrl,
  waarde,
  waardeWeinigData = false,
  vraagprijs,
  contentStatus,
}: {
  objectId: string
  address: string
  fase: ObjectFase
  /** Server-berekend aantal kalenderdagen sinds de laatste faseovergang (item 10.2). */
  dagenInFaseAantal: number
  invoer: PropertyInput
  status: ObjectStatus
  /** Aanmaakdatum, alleen ter info naast de stepper — niet verplicht. */
  aangemaaktOp?: string
  /** Actieknoppen (Regenereer/Verwijderen) — dit component regelt zelf geen dossieracties buiten de fase. */
  acties?: ReactNode
  /** URL van de eerste foto uit `object_fotos` (oudste eerst), of `null` zonder foto's. */
  fotoUrl: string | null
  /** Te tonen waarde (makelaarscorrectie wint van de systeemwaardering, zie lib/dossierHeader.ts), of `null` zonder waardering. */
  waarde: number | null
  /** Bij weinig referenties: toont de waarde nog steeds, maar met een voorzichtiger bijschrift i.p.v. hem te verbergen. */
  waardeWeinigData?: boolean
  vraagprijs: number | null
  contentStatus: ObjectContentStatus
}) {
  const [fase, setFase] = useState(initieleFase)
  const [dagenInFase, setDagenInFase] = useState(initieelDagenInFase)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const komma = address.lastIndexOf(',')
  const straat = komma > -1 ? address.slice(0, komma) : address
  const stad = komma > -1 ? address.slice(komma + 1).trim() : undefined

  const kenmerken = [
    woningtypeLabel(invoer),
    invoer.oppervlak_m2 ? formatM2(invoer.oppervlak_m2) : '',
    invoer.bouwjaar ? `Bouwjaar ${invoer.bouwjaar}` : '',
    invoer.ligging_buitenruimte?.garage_parkeren === 'garage' ? 'Garage' : '',
    invoer.ligging_buitenruimte?.tuin_m2 ? 'Tuin' : '',
    invoer.energielabel ? `Label ${invoer.energielabel}` : '',
  ].filter(Boolean)

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
      // De overgang is "vandaag" — geen datum nodig om dat te weten.
      setDagenInFase(0)
      // Content-generatie start automatisch bij de overgang naar In verkoop,
      // als er nog niets staat (item 3.1, docs/roadmap.md § 3.2) —
      // fire-and-forget, niet awaiten: de makelaar hoeft niet te wachten, de
      // Teksten-tab (ContentTekstenTab) pollt zelf op de status.
      if (doel === 'in_verkoop' && result.contentStatus === 'geen') {
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectId }),
        }).catch(() => { /* de Teksten-tab ontdekt het resultaat via polling */ })
      }
    })
  }

  const naarContent = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'content')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const magNaarContent = fase !== 'verkoopadvies'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 24,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.cardLg,
        padding: 24,
        boxShadow: shadow.card,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', minWidth: 0 }}>
        <DossierFoto url={fotoUrl} />
        <div style={{ minWidth: 0 }}>
          <Eyebrow>Woning</Eyebrow>
          <SerifTitle size={28} accent={stad} style={{ marginBottom: 4 }}>{stad ? `${straat},` : straat}</SerifTitle>
          {kenmerken.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 14px' }}>
              {kenmerken.map((k) => (
                <span
                  key={k}
                  style={{
                    display: 'inline-flex', alignItems: 'center', height: 25, padding: '0 11px',
                    background: colors.surfaceAlt, borderRadius: radius.pill, fontSize: 12, fontWeight: 600, color: colors.bodyStrong,
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FaseStepper huidigeIndex={huidigeIndex} isPending={isPending} onKlik={klikFase} />
            {fase !== 'verkoopadvies' && <StatusToggle objectId={objectId} initialStatus={status} />}
            {aangemaaktOp && (
              <span style={{ fontSize: 12.5, color: colors.muted }}>Aangemaakt {formatDatum(aangemaaktOp)}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end', flex: '1 1 340px', maxWidth: 460 }}>
        {acties && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{acties}</div>}
        {/* auto-fit i.p.v. een vaste 3-koloms grid: op 390 px klapt "€ 733.000"
            anders af tegen de tegelrand (DoD: "op 390 px breekt niets"). */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, width: '100%' }}>
          <StatTile
            label="Waarde"
            waarde={waarde ?? undefined}
            opmaak={euro}
            waarschuwing={waarde == null ? 'Nog geen waardering' : undefined}
            bijschrift={waarde != null && waardeWeinigData ? 'Indicatief — beperkte data' : undefined}
          />
          <StatTile
            label="Vraagprijs"
            waarde={vraagprijs ?? undefined}
            opmaak={euro}
            waarschuwing={
              vraagprijs == null
                ? (fase === 'verkoopadvies' ? 'Nog niet vastgesteld' : 'Nog geen vraagprijs')
                : undefined
            }
          />
          <StatTile
            label="Dagen in fase"
            waarde={dagenInFase}
            opmaak={(n) => n === 0 ? 'Vandaag' : n === 1 ? '1 dag' : `${n} dagen`}
            bijschrift={FASE_LABEL[fase]}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <WaardebepalingPdfButton objectId={objectId} />
          <button
            type="button"
            onClick={naarContent}
            disabled={!magNaarContent}
            title={magNaarContent ? undefined : "Beschikbaar vanaf 'In verkoop'"}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px',
              fontWeight: 700, fontSize: 13, borderRadius: radius.md, border: `1px solid ${colors.borderStrong}`,
              background: colors.surface, color: colors.bodyStrong,
              cursor: magNaarContent ? 'pointer' : 'not-allowed', opacity: magNaarContent ? 1 : 0.45,
            }}
          >
            {CONTENT_STATUS_LABEL[contentStatus]}
          </button>
        </div>
      </div>
    </div>
  )
}

function DossierFoto({ url }: { url: string | null }) {
  if (url) {
    return (
      <div style={{ width: 104, height: 96, borderRadius: radius.lg, flex: 'none', overflow: 'hidden', background: colors.surfaceAlt }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  // Zonder foto: merkverloop (item 10.2) i.p.v. een lege/gestippelde placeholder.
  return (
    <div
      style={{
        width: 104, height: 96, borderRadius: radius.lg, flex: 'none',
        background: 'linear-gradient(135deg, var(--merk) 0%, var(--merk-diep) 100%)',
        display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.85)',
      }}
      aria-hidden="true"
    >
      <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
      </svg>
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
    borderRadius: radius.pill,
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
