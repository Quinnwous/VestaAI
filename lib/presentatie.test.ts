import { describe, it, expect } from 'vitest'
import {
  bepaalPresentatieStappen,
  presentatieKaartBounds,
  referentiesOnderschrift,
  top6Referenties,
} from './presentatie'
import type { WaarderingReferentie } from './schemas'

const SUBJECT = { lat: 52.1443, lng: 4.4025 } // Wassenaar

function ref(id: string, gewicht: number): WaarderingReferentie {
  return {
    id,
    adres: `Straat ${id}`,
    afstand_m: 120,
    verkoopdatum: '2026-01-01',
    prijs: 500_000,
    m2: 120,
    prijs_m2: 4166,
    index_factor: 1,
    index_basis: 'cbs',
    correcties: {},
    correctie_factor: 1,
    gewicht,
    gelijkenis: 0.8,
    maanden: 3,
    waarde_geimpliceerd: 500_000,
    handmatig: false,
  }
}

describe('top6Referenties', () => {
  it('sorteert op gewicht (hoog naar laag) en neemt de top 6', () => {
    const referenties = [ref('a', 0.2), ref('b', 0.9), ref('c', 0.5), ref('d', 0.1), ref('e', 0.7), ref('f', 0.6), ref('g', 0.4)]
    const top6 = top6Referenties(referenties)
    expect(top6).toHaveLength(6)
    expect(top6.map((r) => r.id)).toEqual(['b', 'e', 'f', 'c', 'g', 'a'])
  })

  it('laat een kortere lijst intact (geen opvulling)', () => {
    const referenties = [ref('a', 0.2), ref('b', 0.9)]
    expect(top6Referenties(referenties).map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('muteert de invoerlijst niet', () => {
    const referenties = [ref('a', 0.2), ref('b', 0.9)]
    top6Referenties(referenties)
    expect(referenties.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('geeft een lege lijst terug bij geen referenties', () => {
    expect(top6Referenties([])).toEqual([])
  })
})

describe('bepaalPresentatieStappen', () => {
  it('toont alle stappen als alles beschikbaar is', () => {
    expect(bepaalPresentatieStappen({ heeftGeo: true, aantalReferenties: 6, heeftWoz: true })).toEqual([
      'woning',
      'waarde',
      'kaart',
      'referenties',
      'woz',
      'toelichting',
    ])
  })

  it('laat de WOZ-stap weg zonder ingevulde WOZ-waarde', () => {
    const stappen = bepaalPresentatieStappen({ heeftGeo: true, aantalReferenties: 6, heeftWoz: false })
    expect(stappen).not.toContain('woz')
    expect(stappen).toEqual(['woning', 'waarde', 'kaart', 'referenties', 'toelichting'])
  })

  it('toont de toelichting altijd, ook zonder makelaarscorrectie (die is content ín de stap, geen stap-voorwaarde)', () => {
    const stappen = bepaalPresentatieStappen({ heeftGeo: false, aantalReferenties: 0, heeftWoz: false })
    expect(stappen[stappen.length - 1]).toBe('toelichting')
  })

  it('toont de referentiestap bij weinig referenties (n > 0)', () => {
    const stappen = bepaalPresentatieStappen({ heeftGeo: true, aantalReferenties: 1, heeftWoz: false })
    expect(stappen).toContain('referenties')
  })

  it('laat de referentiestap weg bij een lege waardering (n = 0)', () => {
    const stappen = bepaalPresentatieStappen({ heeftGeo: true, aantalReferenties: 0, heeftWoz: false })
    expect(stappen).not.toContain('referenties')
  })

  it('laat de kaartstap weg zonder coördinaat op het dossier', () => {
    const stappen = bepaalPresentatieStappen({ heeftGeo: false, aantalReferenties: 6, heeftWoz: true })
    expect(stappen).not.toContain('kaart')
    expect(stappen).toEqual(['woning', 'waarde', 'referenties', 'woz', 'toelichting'])
  })

  it('houdt bij een volledig lege waardering alleen woning/waarde/toelichting over', () => {
    expect(bepaalPresentatieStappen({ heeftGeo: false, aantalReferenties: 0, heeftWoz: false })).toEqual([
      'woning',
      'waarde',
      'toelichting',
    ])
  })
})

describe('referentiesOnderschrift', () => {
  it('gebruikt het enkelvoud bij precies 1 referentie', () => {
    expect(referentiesOnderschrift(1)).toBe('Gebaseerd op 1 vergelijkbare verkoop')
  })

  it('gebruikt het meervoud vanaf 2', () => {
    expect(referentiesOnderschrift(6)).toBe('Gebaseerd op 6 vergelijkbare verkopen')
  })

  it('heeft een eerlijke tekst bij nul referenties', () => {
    expect(referentiesOnderschrift(0)).toBe('Nog geen vergelijkbare verkopen gevonden')
  })
})

describe('presentatieKaartBounds', () => {
  it('geeft een kader terug dat het subject bevat, ook zonder referenties', () => {
    const [[west, zuid], [oost, noord]] = presentatieKaartBounds(SUBJECT, [])
    expect(west).toBeLessThan(SUBJECT.lng)
    expect(oost).toBeGreaterThan(SUBJECT.lng)
    expect(zuid).toBeLessThan(SUBJECT.lat)
    expect(noord).toBeGreaterThan(SUBJECT.lat)
  })

  it('verbreedt het kader zodra een referentie verder weg ligt', () => {
    const dichtbij = presentatieKaartBounds(SUBJECT, [{ lat: SUBJECT.lat + 0.001, lng: SUBJECT.lng }])
    const veraf = presentatieKaartBounds(SUBJECT, [{ lat: SUBJECT.lat + 0.05, lng: SUBJECT.lng }])
    const spanDichtbij = dichtbij[1][1] - dichtbij[0][1]
    const spanVeraf = veraf[1][1] - veraf[0][1]
    expect(spanVeraf).toBeGreaterThan(spanDichtbij)
  })
})
