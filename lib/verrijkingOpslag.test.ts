import { describe, it, expect } from 'vitest'
import { naarVerrijkingOpslag, verwerkOpgeslagenVerrijking } from './verrijkingOpslag'
import type { VerrijkingData } from './verrijking'
import type { MarktEigenData } from './schemas'

const VOLLEDIGE_DATA: VerrijkingData = {
  woz: {
    object_id: '123',
    waarden: [{ peildatum: '2024-01-01', waarde: 500000, belastingjaar: 2025 }],
    stijging_pct: '10.0% over 1 jaar',
    per_m2: 5000,
  },
  cbs: {
    gemeente: 'Wassenaar',
    buurtnaam: 'Kerkstraat-buurt',
    wijknaam: 'Centrum',
    bron: 'CBS Kerncijfers wijken en buurten 2024',
    fijnste_niveau: 'buurt',
    inkomen: { waarde: 55000, niveau: 'buurt' },
    pct_koop: { waarde: 80, niveau: 'buurt' },
    woz_gem: { waarde: 600000, niveau: 'buurt' },
    pct_hoog_opgeleid: { waarde: 60, niveau: 'wijk' },
    dichtheid_per_km2: { waarde: 2000, niveau: 'gemeente' },
    pct_eengezins: { waarde: 70, niveau: 'buurt' },
    huishoudensgrootte: { waarde: 2.3, niveau: 'buurt' },
    pct_65plus: { waarde: 20, niveau: 'buurt' },
    pct_met_kinderen: { waarde: 30, niveau: 'buurt' },
    dichtheid: 'hoog',
    buurtprofiel: 'Premium',
    nl: { inkomen: 32000, pct_koop: 60, woz_gem: 350000, pct_hoog_opgeleid: 35 },
    gemeente_niveau: { woz_gem: 600000, dichtheid_per_km2: 2000 },
  },
  voorzieningen: {
    supermarkt: [{ naam: 'Albert Heijn', afstand_m: 450, looptijd_min: 5.5 }],
    apotheek: [],
    huisarts: [],
    scholen: [],
    ov_haltes: [],
    treinstation: [],
    groen: [],
    nabijheid_beoordeling: 'Goed',
  },
  markt: {
    label: 'Premiumgemeente',
    verkooptijd_weken: '4–8 weken',
    overbiedingskans_pct: '30–50%',
    overbod_pct: '5–15% boven vraagprijs',
    voorraad_maanden: '2–4 maanden',
    marktomstandigheid: 'Verkopersmarkt',
    strategie: 'Biedingsprocedure effectief',
    seizoen_advies: 'Best: april–juni',
    woz_trend_2019_2024: '+43–45%',
    gemeente_type: 'premium',
    herkomst: 'lijst',
  },
  gemeente: 'Wassenaar',
  coord: { lat: 52.14, lon: 4.4 },
  bronnen: { woz: 'ok', cbs: 'ok', voorzieningen: 'ok' },
}

const MARKT_EIGEN: MarktEigenData = {
  plaats: 'Wassenaar',
  periodeVan: '2025-09-24',
  periodeTot: '2026-09-24',
  n: 12,
  mediaanPrijs: 850000,
  mediaanM2: 5200,
  mediaanLooptijd: 45,
  pctTovVraag: -1.0,
}

describe('naarVerrijkingOpslag', () => {
  it('bouwt een geldige opslagvorm met versie, tijdstempel, bronnen en eigen marktdata', () => {
    const opslag = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-09-23T10:00:00.000Z', MARKT_EIGEN)
    expect(opslag.versie).toBe(1)
    expect(opslag.opgehaald_op).toBe('2026-09-23T10:00:00.000Z')
    expect(opslag.woz?.waarden[0].waarde).toBe(500000)
    expect(opslag.cbs?.buurtprofiel).toBe('Premium')
    expect(opslag.bronnen).toEqual({ woz: 'ok', cbs: 'ok', voorzieningen: 'ok' })
    expect(opslag.marktEigen?.plaats).toBe('Wassenaar')
    expect(opslag.marktEigen?.n).toBe(12)
  })

  it('accepteert volledig lege verrijking (adres niet gevonden) en geen eigen marktdata', () => {
    const leeg: VerrijkingData = {
      woz: null, cbs: null, voorzieningen: null, markt: null, gemeente: null, coord: null,
      bronnen: { woz: 'leeg', cbs: 'leeg', voorzieningen: 'leeg' },
    }
    const opslag = naarVerrijkingOpslag(leeg, '2026-09-23T10:00:00.000Z', null)
    expect(opslag.woz).toBeNull()
    expect(opslag.cbs).toBeNull()
    expect(opslag.marktEigen).toBeNull()
  })

  it('bewaart het onderscheid mislukt vs. leeg per bron', () => {
    const mislukt: VerrijkingData = {
      ...VOLLEDIGE_DATA,
      woz: null,
      voorzieningen: null,
      bronnen: { woz: 'mislukt', cbs: 'ok', voorzieningen: 'mislukt' },
    }
    const opslag = naarVerrijkingOpslag(mislukt, '2026-09-23T10:00:00.000Z', null)
    expect(opslag.bronnen).toEqual({ woz: 'mislukt', cbs: 'ok', voorzieningen: 'mislukt' })
  })

  it('gooit een fout bij een onverwachte vorm', () => {
    const kapot = { woz: { onverwacht: true } } as unknown as VerrijkingData
    expect(() => naarVerrijkingOpslag(kapot, '2026-09-23T10:00:00.000Z', null)).toThrow()
  })
})

describe('verwerkOpgeslagenVerrijking', () => {
  it('geeft de gevalideerde opslag terug als de kolom bestaat en gevuld is', () => {
    const opslag = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-09-23T10:00:00.000Z', MARKT_EIGEN)
    const resultaat = verwerkOpgeslagenVerrijking({ data: { verrijking_json: opslag }, error: null })
    expect(resultaat?.opgehaald_op).toBe('2026-09-23T10:00:00.000Z')
  })

  it('blijft geldig voor een oudere rij zonder bronnen/marktEigen (vóór deze fix)', () => {
    const oud = {
      versie: 1,
      woz: null,
      cbs: null,
      voorzieningen: null,
      gemeente: 'Wassenaar',
      coord: null,
      opgehaald_op: '2026-09-23T08:00:00.000Z',
      // oude vorm had hier nog `markt`, geen `bronnen`/`marktEigen` — Zod
      // negeert de onbekende `markt`-sleutel stilzwijgend.
      markt: { label: 'Premiumgemeente' },
    }
    const resultaat = verwerkOpgeslagenVerrijking({ data: { verrijking_json: oud }, error: null })
    expect(resultaat).not.toBeNull()
    expect(resultaat?.bronnen).toBeUndefined()
    expect(resultaat?.marktEigen).toBeUndefined()
  })

  it('geeft null als de kolom nog niet bestaat (undefined_column)', () => {
    const resultaat = verwerkOpgeslagenVerrijking({
      data: null,
      error: { code: '42703', message: 'column objecten.verrijking_json does not exist' },
    })
    expect(resultaat).toBeNull()
  })

  it('geeft null als verrijking_json nog leeg is', () => {
    const resultaat = verwerkOpgeslagenVerrijking({ data: { verrijking_json: null }, error: null })
    expect(resultaat).toBeNull()
  })

  it('geeft null bij een onverwachte/kapotte vorm i.p.v. te crashen', () => {
    const resultaat = verwerkOpgeslagenVerrijking({ data: { verrijking_json: { iets: 'onverwachts' } }, error: null })
    expect(resultaat).toBeNull()
  })

  it('geeft null bij een ontbrekend of leeg resultaat', () => {
    expect(verwerkOpgeslagenVerrijking(null)).toBeNull()
    expect(verwerkOpgeslagenVerrijking(undefined)).toBeNull()
  })
})
