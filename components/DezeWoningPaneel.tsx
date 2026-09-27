'use client'

import { useWatch, type Control } from 'react-hook-form'
import { woningtypeLabel, type PropertyInput } from '@/lib/schemas'
import { m2 } from '@/lib/opmaak'

interface Props {
  control: Control<PropertyInput>
}

const rijStijl: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
}

function Rij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div style={rijStijl}>
      <span style={{ fontSize: 12, color: '#5C6470', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#14181B', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {waarde || '—'}
      </span>
    </div>
  )
}

/**
 * Sticky rechterpaneel in de intake (item 10.5, roadmap § 5 fase 10) — een
 * compacte, read-only "Deze woning"-samenvatting die live meeloopt met de
 * wizard via react-hook-form's `useWatch` (geen submit, geen validatie: puur
 * weergave). Bewust een nieuw, klein component i.p.v. het bestaande
 * `WoningdataPanel` hergebruiken — dat toont externe verrijkingsdata (WOZ/CBS/
 * markt) bij een geselecteerd adres, dit paneel toont wat de makelaar zelf al
 * in de wizard heeft ingevuld (adres, type, m², bouwjaar, label), ook in
 * stappen waar `WoningdataPanel` niet zichtbaar is.
 */
export function DezeWoningPaneel({ control }: Props) {
  const adres = useWatch({ control, name: 'adres' }) || ''
  const woningtypeGroep = useWatch({ control, name: 'woningtype_groep' })
  const woningtypeSub = useWatch({ control, name: 'woningtype_sub' })
  const oppervlak = useWatch({ control, name: 'oppervlak_m2' })
  const bouwjaar = useWatch({ control, name: 'bouwjaar' })
  const energielabel = useWatch({ control, name: 'energielabel' })
  const kamers = useWatch({ control, name: 'kamers' })

  const type = woningtypeGroep
    ? woningtypeLabel({ woningtype_groep: woningtypeGroep, woningtype_sub: woningtypeSub })
    : ''

  const heeftIets = !!adres || !!type || !!oppervlak || !!bouwjaar || !!energielabel

  const STAPPEN_KLAAR = [
    !!adres,
    !!woningtypeGroep && !!kamers,
    !!oppervlak && !!bouwjaar,
    !!energielabel,
  ]
  const aantalKlaar = STAPPEN_KLAAR.filter(Boolean).length

  return (
    <div
      style={{
        borderRadius: 'var(--merk-radius-lg)',
        border: '1px solid #E6E9EC',
        background: '#fff',
        padding: '20px 20px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--merk)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 4px' }}>
          Deze woning
        </p>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#14181B', margin: 0, lineHeight: 1.4 }}>
          {adres || 'Nog geen adres ingevuld'}
        </p>
      </div>

      {!heeftIets ? (
        <p style={{ fontSize: 12.5, color: '#98A0A6', margin: 0, lineHeight: 1.5 }}>
          Vul de wizard links in — hier verschijnt meteen een overzicht van wat je al hebt ingevuld.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Rij label="Type" waarde={type} />
          <Rij label="Kamers" waarde={kamers ? String(kamers) : ''} />
          <Rij label="Woonoppervlak" waarde={oppervlak ? m2(oppervlak) : ''} />
          <Rij label="Bouwjaar" waarde={bouwjaar ? String(bouwjaar) : ''} />
          <Rij label="Energielabel" waarde={energielabel || ''} />
        </div>
      )}

      <div style={{ borderTop: '1px solid #E6E9EC', paddingTop: 12 }}>
        <p style={{ fontSize: 11.5, fontWeight: 600, color: '#5C6470', margin: 0 }}>
          {aantalKlaar} van de {STAPPEN_KLAAR.length} basisstappen ingevuld
        </p>
      </div>
    </div>
  )
}
