import { describe, it, expect } from 'vitest'
import { naarVerrijkingOpslag, verwerkOpgeslagenVerrijking, voegVerrijkingSamen } from './verrijkingOpslag'
import type { VerrijkingData } from './verrijking'
import type { MarktEigenData, VerrijkingOpslag } from './schemas'

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
    nabijheid: {
      supermarkt_km: { waarde: 1.3, niveau: 'buurt' },
      huisarts_km: { waarde: 2, niveau: 'buurt' },
      school_km: { waarde: 0.7, niveau: 'buurt' },
      kinderdagverblijf_km: null,
    },
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

  it('geeft null bij een querfout (bv. undefined_column of een RLS-blokkade)', () => {
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

// Item 12.9 (1 okt 2026, "Verversen zonder dataverlies"): "Ververs" overschreef
// `verrijking_json` altijd in zijn geheel. Faalde Overpass op dat moment (dag-op-
// dag overbelast, HTTP 504), dan was goede data domweg weg — gebeurde op 1 okt bij
// Haagweg 102 en Rembrandtlaan 14. `voegVerrijkingSamen()` moet dat voorkomen.
describe('voegVerrijkingSamen', () => {
  const VORIGE = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-10-01T08:00:00.000Z', MARKT_EIGEN)

  it('houdt de vorige data van een bron aan zodra die mislukt terwijl de vorige ok was', () => {
    const nieuwData: VerrijkingData = {
      ...VOLLEDIGE_DATA,
      voorzieningen: null,
      bronnen: { woz: 'ok', cbs: 'ok', voorzieningen: 'mislukt' },
    }
    const nieuw = naarVerrijkingOpslag(nieuwData, '2026-10-01T09:00:00.000Z', MARKT_EIGEN)

    const samengevoegd = voegVerrijkingSamen(VORIGE, nieuw)

    // Data blijft staan — nooit stil "mislukt" tonen als er goede data was.
    expect(samengevoegd.voorzieningen).toEqual(VOLLEDIGE_DATA.voorzieningen)
    expect(samengevoegd.bronnen?.voorzieningen).toBe('ok')
    // Maar de UI moet kunnen zien dat dit oude data is en dat de laatste poging mislukte.
    expect(samengevoegd.bronMeta?.voorzieningen?.opgehaald_op).toBe('2026-10-01T08:00:00.000Z')
    expect(samengevoegd.bronMeta?.voorzieningen?.laatste_versing_mislukt).toBe(true)
  })

  it('neemt de nieuwe data over zodra een bron wél slaagt', () => {
    const nieuw = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-10-01T09:00:00.000Z', MARKT_EIGEN)

    const samengevoegd = voegVerrijkingSamen(VORIGE, nieuw)

    expect(samengevoegd.bronnen?.voorzieningen).toBe('ok')
    expect(samengevoegd.bronMeta?.voorzieningen?.opgehaald_op).toBe('2026-10-01T09:00:00.000Z')
    expect(samengevoegd.bronMeta?.voorzieningen?.laatste_versing_mislukt).toBeFalsy()
  })

  it('bewaart geen stale data als er nooit goede data was (mislukt blijft mislukt)', () => {
    const vorigeLeeg = naarVerrijkingOpslag(
      { ...VOLLEDIGE_DATA, voorzieningen: null, bronnen: { woz: 'ok', cbs: 'ok', voorzieningen: 'mislukt' } },
      '2026-10-01T08:00:00.000Z',
      MARKT_EIGEN,
    )
    const nieuw = naarVerrijkingOpslag(
      { ...VOLLEDIGE_DATA, voorzieningen: null, bronnen: { woz: 'ok', cbs: 'ok', voorzieningen: 'mislukt' } },
      '2026-10-01T09:00:00.000Z',
      MARKT_EIGEN,
    )

    const samengevoegd = voegVerrijkingSamen(vorigeLeeg, nieuw)

    expect(samengevoegd.voorzieningen).toBeNull()
    expect(samengevoegd.bronnen?.voorzieningen).toBe('mislukt')
  })

  it('geeft gewoon de nieuwe opslag terug als er geen vorige is (nieuw dossier)', () => {
    const nieuw = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-10-01T09:00:00.000Z', MARKT_EIGEN)
    expect(voegVerrijkingSamen(null, nieuw)).toEqual(nieuw)
  })

  it('valt terug op het top-level opgehaald_op als de vorige opslag nog geen bronMeta heeft (oude vorm)', () => {
    // Oude rij: wél `bronnen` (12.7-vorm), geen `bronMeta` (12.9 is nieuw).
    const vorigeOudeVorm: VerrijkingOpslag = {
      versie: 1,
      woz: VOLLEDIGE_DATA.woz,
      cbs: VOLLEDIGE_DATA.cbs,
      voorzieningen: VOLLEDIGE_DATA.voorzieningen,
      marktEigen: MARKT_EIGEN,
      gemeente: 'Wassenaar',
      coord: { lat: 52.14, lon: 4.4 },
      bronnen: { woz: 'ok', cbs: 'ok', voorzieningen: 'ok' },
      opgehaald_op: '2026-09-25T08:00:00.000Z',
      // bronMeta ontbreekt bewust — dat is precies het geval dat we testen.
    }
    const nieuwData: VerrijkingData = {
      ...VOLLEDIGE_DATA,
      voorzieningen: null,
      bronnen: { woz: 'ok', cbs: 'ok', voorzieningen: 'mislukt' },
    }
    const nieuw = naarVerrijkingOpslag(nieuwData, '2026-10-01T09:00:00.000Z', MARKT_EIGEN)

    const samengevoegd = voegVerrijkingSamen(vorigeOudeVorm, nieuw)

    expect(samengevoegd.voorzieningen).toEqual(VOLLEDIGE_DATA.voorzieningen)
    expect(samengevoegd.bronMeta?.voorzieningen?.opgehaald_op).toBe('2026-09-25T08:00:00.000Z')
  })

  it('laat woz met rust zolang die alleen "niet_gekoppeld" is (geen echte mislukking)', () => {
    // WOZ is structureel 'niet_gekoppeld' (lib/verrijking.ts WOZ_GEKOPPELD=false) —
    // dat is geen "verversing mislukt", dus geen vorige-ok-status om te bewaren.
    const nieuw = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-10-01T09:00:00.000Z', MARKT_EIGEN)
    const samengevoegd = voegVerrijkingSamen(VORIGE, nieuw)
    expect(samengevoegd.bronnen?.woz).toBe('ok')
  })

  it('valideert het resultaat alsnog via het schema (regressiebescherming)', () => {
    const nieuw = naarVerrijkingOpslag(VOLLEDIGE_DATA, '2026-10-01T09:00:00.000Z', MARKT_EIGEN)
    expect(() => voegVerrijkingSamen(VORIGE, nieuw)).not.toThrow()
  })
})
