'use client'

import { useState } from 'react'
import type { CbsMetriek, CbsNiveau, VerrijkingData } from '@/lib/verrijking'

interface Props {
  data: VerrijkingData
  bezig?: boolean
}

const PROFIEL_KLEUR: Record<string, string> = {
  Premium: '#1A6B45',
  Bovengemiddeld: '#2E7D5E',
  Gemiddeld: '#5A6B61',
  Ondergemiddeld: '#9AA6A0',
}

function Chip({ label, kleur }: { label: string; kleur?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 700,
      background: kleur ? `${kleur}18` : '#F0F6F2',
      color: kleur ?? '#1A6B45',
      letterSpacing: 0.2,
    }}>
      {label}
    </span>
  )
}

function Rij({ label, waarde }: { label: string; waarde: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#7A8A80', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0E1A13', fontWeight: 600, textAlign: 'right' }}>{waarde}</span>
    </div>
  )
}

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#1A6B45', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>{titel}</p>
      {children}
    </div>
  )
}

function Toelichting({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, color: '#9AA6A0', lineHeight: 1.4, margin: 0 }}>{children}</p>
  )
}

const NIVEAU_LABEL: Record<CbsNiveau, string> = {
  buurt: 'buurt',
  wijk: 'wijk',
  gemeente: 'gemeente',
  nederland: 'landelijk',
}

/** Toont een CBS-cijfer met het gebiedsniveau waar het vandaan komt. */
function CbsWaarde({ m, toon }: { m: CbsMetriek; toon: (w: number) => string }) {
  return (
    <>
      {toon(m.waarde)}
      <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 500, color: '#9AA6A0' }}>{NIVEAU_LABEL[m.niveau]}</span>
    </>
  )
}

export function WoningdataPanel({ data, bezig }: Props) {
  const [open, setOpen] = useState(true)

  const heeftData = data.woz || data.cbs || data.markt || data.voorzieningen

  if (!heeftData && !bezig) return null

  const meestRecenteWoz = data.woz?.waarden?.[0]

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid #DCE5DF',
      background: '#F8FBF9',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1A6B45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1A13' }}>Woningdata</span>
          {bezig && <span style={{ fontSize: 12, color: '#9AA6A0' }}>Ophalen…</span>}
          {data.gemeente && !bezig && (
            <span style={{ fontSize: 12, color: '#7A8A80' }}>{data.gemeente}</span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9AA6A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && heeftData && (
        <div style={{
          padding: '0 16px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          borderTop: '1px solid #E9EFEB',
          paddingTop: 16,
        }}>

          {/* WOZ */}
          {data.woz && meestRecenteWoz && (
            <Sectie titel="WOZ-waarde">
              <Rij
                label={`Peildatum ${meestRecenteWoz.peildatum.substring(0, 4)}`}
                waarde={`€ ${meestRecenteWoz.waarde.toLocaleString('nl-NL')}`}
              />
              {data.woz.stijging_pct && (
                <Rij label="Stijging" waarde={data.woz.stijging_pct} />
              )}
              {data.woz.per_m2 && (
                <Rij label="Per m²" waarde={`€ ${data.woz.per_m2.toLocaleString('nl-NL')}`} />
              )}
            </Sectie>
          )}

          {/* CBS */}
          {data.cbs && (
            <Sectie titel={data.cbs.buurtnaam ? `Buurtprofiel · ${data.cbs.buurtnaam}` : 'Buurtprofiel'}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip label={data.cbs.buurtprofiel} kleur={PROFIEL_KLEUR[data.cbs.buurtprofiel]} />
                {data.cbs.pct_koop && <Chip label={`${data.cbs.pct_koop.waarde}% koop`} />}
              </div>
              {data.cbs.woz_gem && (
                <Rij label="Gem. WOZ" waarde={<CbsWaarde m={data.cbs.woz_gem} toon={w => `€ ${w.toLocaleString('nl-NL')}`} />} />
              )}
              {data.cbs.inkomen && (
                <Rij label="Gem. inkomen" waarde={<CbsWaarde m={data.cbs.inkomen} toon={w => `€ ${w.toLocaleString('nl-NL')}/inw.`} />} />
              )}
              {data.cbs.pct_hoog_opgeleid && (
                <Rij label="Hbo/wo-opgeleid" waarde={<CbsWaarde m={data.cbs.pct_hoog_opgeleid} toon={w => `${w}%`} />} />
              )}
              {data.cbs.pct_eengezins && (
                <Rij label="Eengezinswoningen" waarde={<CbsWaarde m={data.cbs.pct_eengezins} toon={w => `${w}%`} />} />
              )}
              {data.cbs.pct_met_kinderen && (
                <Rij label="Huish. met kinderen" waarde={<CbsWaarde m={data.cbs.pct_met_kinderen} toon={w => `${w}%`} />} />
              )}
              <Toelichting>
                {data.cbs.bron}. Het label achter een cijfer geeft aan op welk gebiedsniveau CBS het publiceert —
                voor kleine buurten worden cijfers onderdrukt, dan tonen we het wijk- of gemeentecijfer.
              </Toelichting>
            </Sectie>
          )}

          {/* Markt */}
          {data.markt && (
            <Sectie titel="Marktdynamiek">
              <Chip label={data.markt.label} kleur="#1A6B45" />
              <Rij label="Verkooptijd" waarde={data.markt.verkooptijd_weken} />
              <Rij label="Overbiedingskans" waarde={data.markt.overbiedingskans_pct} />
              <Rij label="Gem. overbod" waarde={data.markt.overbod_pct} />
              <Toelichting>Regionale typering op basis van gemeentecategorie, geen actuele meting voor dit object.</Toelichting>
            </Sectie>
          )}

          {/* Voorzieningen */}
          {data.voorzieningen && (
            <Sectie titel="Nabijheid">
              <Chip label={`Bereikbaarheid: ${data.voorzieningen.nabijheid_beoordeling}`} kleur="#1A6B45" />
              {data.voorzieningen.supermarkt[0] && (
                <Rij
                  label={data.voorzieningen.supermarkt[0].naam}
                  waarde={`${data.voorzieningen.supermarkt[0].looptijd_min} min`}
                />
              )}
              {data.voorzieningen.ov_haltes[0] && (
                <Rij
                  label="OV-halte"
                  waarde={`${data.voorzieningen.ov_haltes[0].looptijd_min} min`}
                />
              )}
              {data.voorzieningen.treinstation[0] && (
                <Rij
                  label={`Station ${data.voorzieningen.treinstation[0].naam}`}
                  waarde={`${data.voorzieningen.treinstation[0].looptijd_min} min`}
                />
              )}
              {data.voorzieningen.scholen[0] && (
                <Rij
                  label="School"
                  waarde={`${data.voorzieningen.scholen[0].looptijd_min} min`}
                />
              )}
            </Sectie>
          )}
        </div>
      )}
    </div>
  )
}
