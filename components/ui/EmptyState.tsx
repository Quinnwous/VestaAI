import type { ReactNode } from 'react'
import { colors, radius } from './tokens'
import { HuisIllustratie, DataIllustratie } from './HuisIllustratie'

/**
 * Gedeelde lege staat: elke lege staat wijst naar een volgende actie
 * (docs/ontwerp/principes.md § Data) i.p.v. alleen "geen resultaten" te
 * melden. Vervangt de losse, net-iets-andere lege-staat-blokken die eerder
 * per explorer apart geschreven werden (marktanalyse/transacties/
 * concurrentie/kaart).
 */
export function EmptyState({
  titel,
  beschrijving,
  actie,
  icoon,
  illustratie,
}: {
  titel: ReactNode
  beschrijving?: ReactNode
  /** Bv. een knop of link naar de volgende logische stap. */
  actie?: ReactNode
  icoon?: ReactNode
  /** Isometrische 3D-illustratie boven de titel: een woning of een grafiek. */
  illustratie?: 'woning' | 'data'
}) {
  return (
    <div
      className="vui-binnen-zacht"
      style={{
        border: `1.5px dashed ${colors.borderStrong}`,
        borderRadius: radius.cardLg,
        // Zachte gloed in de merktint achter de illustratie, zodat een lege
        // staat een bewust beeld is en geen grijs gat.
        background: illustratie
          ? `radial-gradient(ellipse 60% 70% at 50% 0%, var(--merk-zacht) 0%, transparent 70%), ${colors.surfaceAlt}`
          : colors.surfaceAlt,
        padding: illustratie ? '36px 32px 44px' : '48px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {illustratie && (
        <div style={{ marginBottom: 14 }}>
          {illustratie === 'woning' ? <HuisIllustratie breedte={150} /> : <DataIllustratie breedte={150} />}
        </div>
      )}
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
