import { describe, it, expect, vi } from 'vitest'
import { naarVerrijkingOpslag, haalOpgeslagenVerrijking, formatEuro, formatGetal, formatAfstand, formatOpgehaaldOp } from './verrijkingOpslag'
import type { VerrijkingData } from './verrijking'

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
}

describe('naarVerrijkingOpslag', () => {
  it('bouwt een geldige opslagvorm met versie en tijdstempel', () => {
    const opslag = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-09-23T10:00:00.000Z')
    expect(opslag.versie).toBe(1)
    expect(opslag.opgehaald_op).toBe('2026-09-23T10:00:00.000Z')
    expect(opslag.woz?.waarden[0].waarde).toBe(500000)
    expect(opslag.cbs?.buurtprofiel).toBe('Premium')
  })

  it('accepteert volledig lege verrijking (adres niet gevonden)', () => {
    const leeg: VerrijkingData = { woz: null, cbs: null, voorzieningen: null, markt: null, gemeente: null, coord: null }
    const opslag = naarVerrijkingOpslag(leeg, '2026-09-23T10:00:00.000Z')
    expect(opslag.woz).toBeNull()
    expect(opslag.cbs).toBeNull()
  })

  it('gooit een fout bij een onverwachte vorm', () => {
    const kapot = { woz: { onverwacht: true } } as unknown as VerrijkingData
    expect(() => naarVerrijkingOpslag(kapot, '2026-09-23T10:00:00.000Z')).toThrow()
  })
})

describe('haalOpgeslagenVerrijking', () => {
  function maakClient(result: { data: unknown; error: unknown }) {
    return {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
      })),
    }
  }

  it('geeft de gevalideerde opslag terug als de kolom bestaat en gevuld is', async () => {
    const opslag = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-09-23T10:00:00.000Z')
    const client = maakClient({ data: { verrijking_json: opslag }, error: null })
    const resultaat = await haalOpgeslagenVerrijking(client, 'obj-1')
    expect(resultaat?.opgehaald_op).toBe('2026-09-23T10:00:00.000Z')
  })

  it('geeft null als de kolom nog niet bestaat (undefined_column)', async () => {
    const client = maakClient({ data: null, error: { code: '42703', message: 'column objecten.verrijking_json does not exist' } })
    const resultaat = await haalOpgeslagenVerrijking(client, 'obj-1')
    expect(resultaat).toBeNull()
  })

  it('geeft null als verrijking_json nog leeg is', async () => {
    const client = maakClient({ data: { verrijking_json: null }, error: null })
    const resultaat = await haalOpgeslagenVerrijking(client, 'obj-1')
    expect(resultaat).toBeNull()
  })

  it('geeft null bij een onverwachte/kapotte vorm i.p.v. te crashen', async () => {
    const client = maakClient({ data: { verrijking_json: { iets: 'onverwachts' } }, error: null })
    const resultaat = await haalOpgeslagenVerrijking(client, 'obj-1')
    expect(resultaat).toBeNull()
  })

  it('geeft null als de query zelf gooit', async () => {
    const client = { from: vi.fn(() => { throw new Error('boom') }) }
    const resultaat = await haalOpgeslagenVerrijking(client, 'obj-1')
    expect(resultaat).toBeNull()
  })
})

describe('nl-NL formattering', () => {
  it('formatEuro gebruikt euro-opmaak zonder decimalen', () => {
    expect(formatEuro(500000)).toMatch(/€\s?500\.000/)
  })

  it('formatGetal gebruikt duizendtalpunten', () => {
    expect(formatGetal(2000)).toBe('2.000')
  })

  it('formatAfstand toont meters onder de kilometer', () => {
    expect(formatAfstand(450)).toBe('450 m')
  })

  it('formatAfstand toont kilometers met komma vanaf 1000m', () => {
    expect(formatAfstand(1200)).toBe('1,2 km')
  })

  it('formatOpgehaaldOp geeft een leesbare nl-NL datum/tijd', () => {
    const resultaat = formatOpgehaaldOp('2026-09-23T10:00:00.000Z')
    expect(resultaat).toContain('2026')
    expect(resultaat).toContain('september')
  })

  it('formatOpgehaaldOp valt terug op "onbekend" bij een ongeldige tijdstempel', () => {
    expect(formatOpgehaaldOp('niet-een-datum')).toBe('onbekend')
  })
})
