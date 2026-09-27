import { describe, it, expect } from 'vitest'
import { straalLabel, bepaalDossierKaartBounds, bepaalStandaardLaag } from './dossierKaart'

const SUBJECT = { lat: 52.1443, lng: 4.4025 } // Wassenaar

describe('straalLabel', () => {
  it('toont meters onder 1000', () => {
    expect(straalLabel(250)).toBe('250 m')
    expect(straalLabel(500)).toBe('500 m')
  })

  it('toont km vanaf 1000', () => {
    expect(straalLabel(1000)).toBe('1 km')
  })
})

describe('bepaalDossierKaartBounds', () => {
  it('gebruikt de referentie-straal op de laag "referenties" — breder kader bij een grotere straal', () => {
    const breed = bepaalDossierKaartBounds(SUBJECT, 'referenties', 3000, 500)
    const smal = bepaalDossierKaartBounds(SUBJECT, 'referenties', 500, 500)
    expect(breed[1][0] - breed[0][0]).toBeGreaterThan(smal[1][0] - smal[0][0])
  })

  it('valt terug op 750 m zonder referentie-straal (methode plaats)', () => {
    const zonderStraal = bepaalDossierKaartBounds(SUBJECT, 'referenties', null, 500)
    const met750 = bepaalDossierKaartBounds(SUBJECT, 'referenties', 750, 500)
    expect(zonderStraal).toEqual(met750)
  })

  it('gebruikt de gekozen verkoopstraal op de laag "verkopen", los van de referentie-straal', () => {
    const metGroteReferentieStraal = bepaalDossierKaartBounds(SUBJECT, 'verkopen', 5000, 250)
    const zonderReferentieStraal = bepaalDossierKaartBounds(SUBJECT, 'verkopen', null, 250)
    expect(metGroteReferentieStraal).toEqual(zonderReferentieStraal)
  })
})

describe('bepaalStandaardLaag', () => {
  it('opent op eigen verkopen als er geen referenties zijn maar wel eigen verkopen', () => {
    expect(bepaalStandaardLaag(0, 3)).toBe('verkopen')
  })

  it('blijft op referenties als die er zijn', () => {
    expect(bepaalStandaardLaag(4, 3)).toBe('referenties')
  })

  it('blijft op referenties als er ook geen eigen verkopen zijn', () => {
    expect(bepaalStandaardLaag(0, 0)).toBe('referenties')
  })
})
