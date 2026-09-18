// ===========================================================================
// v2 — rekenkern § 3.3 (Fable, 17 sep 2026; v1 verwijderd item 4.3, 18 sep
// 2026). Het rekenvoorbeeld hieronder is hetzelfde als in
// docs/waardering-methode.md; wijzigt de uitkomst, werk dan beide bij.
// ===========================================================================

import { describe, it, expect } from 'vitest'
import {
  berekenWaarderingV2,
  correctiesVoorReferentie,
  gewichtV2,
  gewogenPercentiel,
  grootteEffect,
  kenmerkEffectenV2,
  kiesReferenties,
  migreerWaarderingJson,
  minimaleBand,
  type Kandidaat,
  type SubjectV2,
} from './waardering'
import { glad } from './prijsindex'
import { WaarderingOpslagSchema, WaarderingUitkomstSchema } from './schemas'

const INDEX = {
  minN: 30,
  venster: 3,
  punten: glad(
    (
      [
        ['2024-Q3', 5300], ['2024-Q4', 5350], ['2025-Q1', 5450], ['2025-Q2', 5550], ['2025-Q3', 5650],
        ['2025-Q4', 5750], ['2026-Q1', 5850], ['2026-Q2', 5950], ['2026-Q3', 6000],
      ] as [string, number][]
    ).map(([kwartaal, mediaanM2]) => ({ kwartaal, n: 40, mediaanM2 })),
  ),
}

const SUBJECT_V2: SubjectV2 = {
  woningtype_groep: 'rijwoning', oppervlak_m2: 120, bouwjaar: 1965, lat: 52.1425, lng: 4.403, plaats: 'Wassenaar',
  garage: true, tuin: true, energielabel: 'C',
}

const ref = (
  id: string, adres: string, m2: number, bouwjaar: number, verkoopdatum: string, verkoopprijs: number, afstand_m: number,
  extra: Partial<Kandidaat> = {},
): Kandidaat => ({ id, adres, plaats: 'Wassenaar', woningtype_groep: 'rijwoning', woonoppervlak_m2: m2, bouwjaar, verkoopdatum, verkoopprijs, afstand_m, ...extra })

const VOORBEELD: Kandidaat[] = [
  ref('r1', 'Kerkstraat 12', 115, 1962, '2026-05-14', 715000, 180),
  ref('r2', 'Molenweg 3', 128, 1970, '2026-02-02', 760000, 420),
  ref('r3', 'Lindelaan 8', 110, 1958, '2025-11-20', 640000, 650),
  ref('r4', 'Dorpsstraat 41', 122, 1966, '2025-08-08', 705000, 300),
  ref('r5', 'Beukenhof 5', 135, 1975, '2025-04-15', 790000, 700),
  ref('r6', 'Vijverweg 22', 118, 1961, '2024-12-10', 660000, 520),
  ref('r7', 'Parklaan 14', 125, 1968, '2024-10-01', 700000, 240),
  ref('r8', 'Zandpad 7', 105, 1955, '2024-07-20', 600000, 610),
  // vallen af: andere typegroep, > 35 % groter, ná de peildatum, óp de peildatum, bouwjaar > 25 jaar verschil
  ref('x1', 'Villapark 1', 210, 1965, '2026-03-03', 1500000, 150, { woningtype_groep: 'vrijstaand' }),
  ref('x2', 'Kerkstraat 30', 200, 1965, '2026-03-03', 1100000, 150),
  ref('x3', 'Kerkstraat 31', 120, 1965, '2026-09-15', 730000, 150),
  ref('x4', 'Kerkstraat 33', 120, 1965, '2026-09-01', 730000, 150),
  ref('x5', 'Kerkstraat 32', 120, 1930, '2026-03-03', 730000, 150),
]
const PEILDATUM = '2026-09-01'

describe('berekenWaarderingV2 — rekenvoorbeeld uit docs/waardering-methode.md', () => {
  const u = berekenWaarderingV2(SUBJECT_V2, VOORBEELD, { peildatum: PEILDATUM, index: INDEX })

  it('kiest precies de 8 passende referenties binnen 750 m, gesorteerd op gewicht', () => {
    expect(u.n).toBe(8)
    expect(u.straal_m).toBe(750)
    expect(u.methode).toBe('straal')
    expect(u.referenties.map(r => r.id)).toEqual(['r1', 'r2', 'r4', 'r3', 'r7', 'r6', 'r5', 'r8'])
    expect(u.waarschuwingen).toEqual([])
  })
  it('rekent per referentie € per m² × indexfactor × oppervlak subject', () => {
    const r1 = u.referenties[0]
    expect(r1.prijs_m2).toBe(6217)
    expect(r1.index_factor).toBe(1.007)
    expect(r1.index_basis).toBe('eigen')
    expect(r1.waarde_geimpliceerd).toBe(751326)
    expect(r1.gewicht).toBe(0.5012)
    expect(r1.maanden).toBe(3)
  })
  it('komt op € 748.000 met band 710.000–785.000 (minimale marge 5 % omdat de referenties dicht bij elkaar liggen)', () => {
    expect(u.waarde).toBe(748000)
    expect(u.laag).toBe(710000)
    expect(u.hoog).toBe(785000)
    expect(u.weinigData).toBe(false)
    expect(u.index_basis).toBe('eigen')
    expect(u.index_tm).toBe('2026-Q3')
  })
  it('voldoet aan het datacontract WaarderingUitkomstSchema', () => {
    expect(() => WaarderingUitkomstSchema.parse(u)).not.toThrow()
  })
})

describe('kiesReferenties — verbredingsladder en terugval', () => {
  const basis = (id: string, afstand_m: number, verkoopdatum = '2026-03-01', extra: Partial<Kandidaat> = {}) =>
    ref(id, `Straat ${id}`, 120, 1965, verkoopdatum, 700000, afstand_m, extra)

  it('verbreedt de straal tot er ≥ 8 referenties zijn en meldt de gebruikte straal', () => {
    const kandidaten = [
      basis('a', 200), basis('b', 500), basis('c', 700),
      basis('d', 900), basis('e', 950),
      basis('f', 1500), basis('g', 1600), basis('h', 1700), basis('i', 1900),
    ]
    const s = kiesReferenties(SUBJECT_V2, kandidaten, { peildatum: PEILDATUM })
    expect(s.straal_m).toBe(2000)
    expect(s.referenties).toHaveLength(9)
    expect(s.waarschuwingen).toEqual([])
  })
  it('gaat na 5 km naar 60 maanden terugkijken', () => {
    const kandidaten = [
      basis('a', 300), basis('b', 300), basis('c', 300),
      ...['d', 'e', 'f', 'g', 'h', 'i'].map(id => basis(id, 300, '2023-01-15')), // 43 maanden oud
    ]
    const s = kiesReferenties(SUBJECT_V2, kandidaten, { peildatum: PEILDATUM })
    expect(s.straal_m).toBe(5000)
    expect(s.maanden).toBe(60)
    expect(s.referenties).toHaveLength(9)
  })
  it('waarschuwt als het ook op de laatste trede niet lukt', () => {
    const s = kiesReferenties(SUBJECT_V2, [basis('a', 300), basis('b', 400)], { peildatum: PEILDATUM })
    expect(s.referenties).toHaveLength(2)
    expect(s.waarschuwingen[0]).toMatch(/minder dan 8/)
  })
  it('valt zonder locatie terug op plaats + woningtype met waarschuwing', () => {
    const kandidaten = [
      ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => basis(id, 0, '2026-03-01', { afstand_m: null })),
      basis('elders', 0, '2026-03-01', { afstand_m: null, plaats: 'Leiden' }),
    ]
    const s = kiesReferenties({ ...SUBJECT_V2, lat: null, lng: null }, kandidaten, { peildatum: PEILDATUM })
    expect(s.methode).toBe('plaats')
    expect(s.straal_m).toBeNull()
    expect(s.referenties.map(r => r.id)).not.toContain('elders')
    expect(s.referenties).toHaveLength(8)
    expect(s.waarschuwingen[0]).toMatch(/Zonder locatie/)
  })
  it('laat uitgesloten referenties weg', () => {
    const s = kiesReferenties(SUBJECT_V2, VOORBEELD, { peildatum: PEILDATUM, uitgesloten: ['r1', 'r2'] })
    expect(s.referenties.map(r => r.id)).not.toContain('r1')
    expect(s.referenties).toHaveLength(6)
  })
})

describe('berekenWaarderingV2 — randen en handmatig', () => {
  it('verbreedt de band tot ± 15 % bij 3 referenties en meldt weinig data', () => {
    const drie = ['a', 'b', 'c'].map(id => ref(id, `Straat ${id}`, 120, 1965, '2026-03-01', 600000, 300))
    const u = berekenWaarderingV2(SUBJECT_V2, drie, { peildatum: PEILDATUM })
    expect(u.n).toBe(3)
    expect(u.weinigData).toBe(true)
    expect(u.waarde).toBe(600000)
    expect(u.laag).toBe(510000)
    expect(u.hoog).toBe(690000)
    expect(u.index_basis).toBe('geen')
    expect(u.waarschuwingen.some(w => w.includes('Weinig data'))).toBe(true)
    expect(u.waarschuwingen.some(w => w.includes('Geen betrouwbare prijsindex'))).toBe(true)
  })
  it('geeft zonder referenties geen waarde maar wel een uitleg', () => {
    const u = berekenWaarderingV2(SUBJECT_V2, [], { peildatum: PEILDATUM })
    expect(u.waarde).toBeNull()
    expect(u.n).toBe(0)
    expect(u.waarschuwingen.some(w => w.includes('Geen vergelijkbare verkopen'))).toBe(true)
    expect(() => WaarderingUitkomstSchema.parse(u)).not.toThrow()
  })
  it('neemt een handmatig toegevoegde referentie mee (ook buiten de filters) en markeert haar', () => {
    const groot = VOORBEELD.find(k => k.id === 'x2')!
    const u = berekenWaarderingV2(SUBJECT_V2, VOORBEELD, { peildatum: PEILDATUM, index: INDEX, handmatig: { uitgesloten: ['r8'], toegevoegd: [groot] } })
    expect(u.referenties.map(r => r.id)).not.toContain('r8')
    const h = u.referenties.find(r => r.id === 'x2')!
    expect(h.handmatig).toBe(true)
    expect(u.n).toBe(8)
    expect(u.referenties.filter(r => !r.handmatig).every(r => r.handmatig === false)).toBe(true)
  })
})

describe('gewichten en percentielen', () => {
  it('gewicht = gelijkenis × afstand × tijd × plaats', () => {
    expect(gewichtV2(1, 500, 12)).toBe(0.25)
    expect(gewichtV2(1, null, 0)).toBe(1)
    expect(gewichtV2(1, 500, 12, 0.5)).toBe(0.125)
  })
  it('gewogen percentiel is bij gelijke gewichten het gewone percentiel en interpoleert bij ongelijke', () => {
    expect(gewogenPercentiel([1, 2, 3, 4], [1, 1, 1, 1], 0.5)).toBe(2.5)
    expect(gewogenPercentiel([4, 1, 3, 2], [1, 1, 1, 1], 0.25)).toBe(1.5)
    expect(gewogenPercentiel([100, 200], [3, 1], 0.5)).toBe(125)
    expect(gewogenPercentiel([], [], 0.5)).toBeNull()
  })
  it('minimale band: 5 % vanaf 6, 10 % onder 6, 15 % onder 4 referenties', () => {
    expect(minimaleBand(8)).toBe(0.05)
    expect(minimaleBand(5)).toBe(0.1)
    expect(minimaleBand(3)).toBe(0.15)
  })
})

describe('correcties per referentie (kenmerkniveaus en grootte)', () => {
  const regionaal: Kandidaat[] = [
    ...Array.from({ length: 40 }, (_, i) => ref(`m${i}`, 'Met', 100, 1980, '2026-01-01', 624000, 100, { garage: true, energielabel: 'A' })),
    ...Array.from({ length: 40 }, (_, i) => ref(`z${i}`, 'Zonder', 100, 1980, '2026-01-01', 600000, 100, { garage: false, energielabel: 'C' })),
  ]
  const subject: SubjectV2 = { ...SUBJECT_V2, garage: true, energielabel: 'C' }
  const effecten = kenmerkEffectenV2(regionaal, subject)

  it('leidt prijsniveaus per klasse af (mediaan € per m², n) en het verschil t.o.v. de referentieklasse', () => {
    expect(effecten.garage?.niveaus).toEqual({ met: { mediaanM2: 6240, n: 40 }, zonder: { mediaanM2: 6000, n: 40 } })
    expect(effecten.garage?.verschilPct).toBe(4)
    expect(effecten.garage?.betrouwbaar).toBe(true)
    expect(effecten.bouwperiode).toBeNull() // maar één klasse → niets te vergelijken
  })
  it('corrigeert een referentie alleen voor kenmerken waarin zij van het subject verschilt', () => {
    const zonderGarageLabelA = ref('q', 'Q', 110, 1980, '2026-01-01', 700000, 100, { garage: false, energielabel: 'A' })
    const c = correctiesVoorReferentie(subject, zonderGarageLabelA, effecten, null, { garage: true, tuin: true, energielabel: true, bouwperiode: true, grootte: true })
    expect(c.garage).toBe(1.04) // subject mét, referentie zonder → 6240/6000
    expect(c.energielabel).toBe(0.962) // subject C-D, referentie A-B → 6000/6240
    expect(c.tuin).toBeUndefined()
    const metGarage = ref('p', 'P', 110, 1980, '2026-01-01', 700000, 100, { garage: true, energielabel: 'C' })
    expect(correctiesVoorReferentie(subject, metGarage, effecten, null, { garage: true, tuin: true, energielabel: true, bouwperiode: true, grootte: true })).toEqual({})
  })
  it('laat een uitgezette correctie weg', () => {
    const zonderGarage = ref('q', 'Q', 110, 1980, '2026-01-01', 700000, 100, { garage: false, energielabel: 'C' })
    expect(correctiesVoorReferentie(subject, zonderGarage, effecten, null, { garage: false, tuin: true, energielabel: true, bouwperiode: true, grootte: true })).toEqual({})
  })
  it('schat het grootte-effect als robuuste helling van ln(€ per m²) op oppervlak', () => {
    const rijen = Array.from({ length: 31 }, (_, i) => {
      const opp = 80 + i * 4
      return ref(`g${i}`, 'G', opp, 1980, '2026-01-01', Math.round(6000 * Math.exp(-0.001 * (opp - 120)) * opp), 100)
    })
    const g = grootteEffect(rijen)!
    expect(g.betrouwbaar).toBe(true)
    expect(g.perM2Pct).toBeCloseTo(-0.1, 1)
    // subject 120 m², referentie 160 m² → factor exp(-0.001 × -40) ≈ 1,041
    const c = correctiesVoorReferentie({ ...SUBJECT_V2, garage: null, tuin: null, energielabel: null }, rijen[20], kenmerkEffectenV2([], SUBJECT_V2), g, { garage: true, tuin: true, energielabel: true, bouwperiode: true, grootte: true })
    expect(c.grootte).toBeCloseTo(1.041, 2)
  })
})

describe('migreerWaarderingJson', () => {
  it('maakt van niets een lege v2-opslag', () => {
    const o = migreerWaarderingJson(null)
    expect(o).toEqual({ versie: 2, uitkomst: null, correctie: null, handmatig: { uitgesloten: [], toegevoegd: [] } })
    expect(() => WaarderingOpslagSchema.parse(o)).not.toThrow()
  })
  it('behoudt de v1-correctie', () => {
    const o = migreerWaarderingJson({ correctie: { waarde: 750000, motivatie: 'dakkapel', datum: '2026-09-01T00:00:00Z' } })
    expect(o.versie).toBe(2)
    expect(o.correctie?.waarde).toBe(750000)
    expect(o.uitkomst).toBeNull()
  })
  it('laat v2 ongemoeid en negeert rommel', () => {
    const v2 = { versie: 2, uitkomst: null, correctie: null, handmatig: { uitgesloten: ['r1'], toegevoegd: [] } }
    expect(migreerWaarderingJson(v2)).toEqual(v2)
    expect(migreerWaarderingJson('rommel').correctie).toBeNull()
    expect(migreerWaarderingJson({ versie: 2, handmatig: { uitgesloten: [1, 'ok'] } }).handmatig.uitgesloten).toEqual(['ok'])
  })
})
