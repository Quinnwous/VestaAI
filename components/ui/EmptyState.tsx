import type { ReactNode } from 'react'
import { colors, radius } from './tokens'

/**
 * Gedeelde lege staat: elke lege staat wijst naar een volgende actie
 * (docs/ontwerpprincipes.md § Data) i.p.v. alleen "geen resultaten" te
 * melden. Vervangt de losse, net-iets-andere lege-staat-blokken die eerder
 * per explorer apart geschreven werden (marktanalyse/transacties/
 * concurrentie/kaart).
 */
export function EmptyState({
  titel,
  beschrijving,
  actie,
  icoon,
}: {
  titel: ReactNode
  beschrijving?: ReactNode
  /** Bv. een knop of link naar de volgende logische stap. */
  actie?: ReactNode
  icoon?: ReactNode
}) {
  return (
    <div
      style={{
        border: `2px dashed ${colors.borderStrong}`,
        borderRadius: radius.cardLg,
        background: colors.surfaceAlt,
        padding: '48px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icoon && <div style={{ marginBottom: 4 }}>{icoon}</div>}
      <p style={{ fontSize: 15, fontWeight: 650, color: colors.text, margin: 0 }}>{titel}</p>
      {beschrijving && (
        <p style={{ fontSize: 13.5, color: colors.body, margin: 0, maxWidth: 420, lineHeight: 1.55 }}>
          {beschrijving}
        </p>
      )}
      {actie && <div style={{ marginTop: 10 }}>{actie}</div>}
    </div>
  )
}
