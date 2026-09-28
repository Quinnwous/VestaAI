'use client'

/**
 * SegmentVergelijking — compacte kerncijfervergelijking segment A vs. B
 * (F1, docs/roadmap.md § 3.1/3.7). Zit onder de kerncijfer-tegels in
 * `MarktanalyseExplorer.tsx`, die de rijen bouwt met `lib/marktanalyse.ts`
 * `segmentVergelijking()` en de getallen formatteert (`lib/opmaak.ts`).
 * Puur presentatie: geen fetch, geen berekening.
 *
 * Kleur (CLAUDE.md § Conventies, docs/ontwerpprincipes.md § Kleur): A =
 * `var(--merk)`, B = `var(--merk-accent)` — het verschil zelf krijgt bewust
 * géén groen/rood, alleen een neutraal teken/pijltje (een ander segment is
 * geen "goed"/"fout", zie ook `DumbbellStat`'s `gunstig={0}`-geval).
 *
 * Layout: flex-wrap i.p.v. een grid met vaste kolombreedtes, zodat de rij op
 * 390 px vanzelf naar een tweede regel breekt — geen media query nodig en
 * (docs/ontwerpprincipes.md § Layout) geen horizontale scroll van de pagina.
 */

import { colors, radius, shadow, Skeleton, Legenda } from '@/components/ui'

export type SegmentVergelijkingWeergaveRij = {
  key: string
  label: string
  aTekst: string
  bTekst: string
  verschil: number | null
  verschilTekst: string
}

function Dot({ kleur }: { kleur: string }) {
  return <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: kleur, display: 'inline-block', flex: '0 0 auto' }} />
}

function Rij({ rij }: { rij: SegmentVergelijkingWeergaveRij }) {
  const pijl = rij.verschil == null ? '•' : rij.verschil > 0 ? '▲' : rij.verschil < 0 ? '▼' : '•'
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px 16px',
        padding: '10px 2px',
        borderBottom: `1px solid ${colors.borderSoft}`,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: colors.bodyStrong, flex: '1 1 150px', minWidth: 0 }}>{rij.label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        <Dot kleur="var(--merk)" />
        {rij.aTekst}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        <Dot kleur="var(--merk-accent)" />
        {rij.bTekst}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.bodyStrong, minWidth: 76, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {pijl} {rij.verschilTekst}
      </span>
    </div>
  )
}

export function SegmentVergelijking({
  rijen,
  nA,
  nB,
  waarschuwingA,
  waarschuwingB,
  laden,
  fout,
}: {
  rijen: SegmentVergelijkingWeergaveRij[]
  nA: number
  nB: number
  /** Waarschuwingstekst als segment A te weinig verkopen heeft — houdt de tegel-tekst aan. */
  waarschuwingA?: string
  /** Idem voor segment B. */
  waarschuwingB?: string
  /** Segment B wordt (opnieuw) opgehaald — toont een skeleton i.p.v. de rijen; segment A blijft zichtbaar in de tegels erboven. */
  laden?: boolean
  /** Segment B kon niet geladen worden (server action mislukt) — A blijft gewoon werken. */
  fout?: boolean
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.cardLg,
        boxShadow: shadow.card,
        padding: '14px 16px',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ fontSize: 14.5, fontWeight: 800, margin: 0, color: colors.text }}>Segment A vs. segment B</h2>
        <Legenda
          items={[
            { label: `A · n = ${nA}`, kleur: 'var(--merk)' },
            { label: `B · n = ${nB}`, kleur: 'var(--merk-accent)' },
          ]}
        />
      </div>

      {fout ? (
        <p style={{ fontSize: 12.5, color: colors.muted, margin: '8px 0 0', fontStyle: 'italic' }}>
          Kon segment B niet laden. Segment A blijft hierboven gewoon werken — probeer het later opnieuw.
        </p>
      ) : laden ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={30} />
          ))}
        </div>
      ) : (
        <>
          {(waarschuwingA || waarschuwingB) && (
            <p style={{ fontSize: 12.5, color: colors.muted, margin: '4px 0 6px' }}>
              {waarschuwingA ?? waarschuwingB}
            </p>
          )}
          <div style={{ marginTop: 4 }}>
            {rijen.map(rij => (
              <Rij key={rij.key} rij={rij} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
