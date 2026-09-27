import { describe, it, expect } from 'vitest'
import { renderTekstsjabloonPrompt, valideerTekstsjabloon, bouwSjabloonCorrectie } from './tekstsjabloon'
import type { TekstsjabloonConfig } from './schemas'

const SJABLOON: TekstsjabloonConfig = {
  opening_label: '4SALE!',
  secties: [
    { kop: 'WOONCOMFORT', instructie: 'Beschrijf de indeling en de keuken.' },
    { kop: 'BUITENLEVEN', instructie: 'Beschrijf tuin en buitenruimte.' },
    { kop: 'LOCATIE', instructie: 'Beschrijf de buurt en bereikbaarheid.' },
    { kop: 'GOED OM TE WETEN', instructie: 'Korte bulletpoints die beginnen met "- " (bouwjaar, oppervlakte, energielabel).' },
  ],
  slotzin: 'Enthousiast over deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak met je in.',
  doel_woorden: 480,
  engels: {
    opening_label: '4SALE!',
    koppen: ['LIVING COMFORT', 'OUTDOOR LIVING', 'LOCATION', 'GOOD TO KNOW'],
  },
}

function bouwGeldigeTekst(koppen: string[], opening: string, slotzin: string): string {
  return `${opening}\nEen heerlijke woning met alles erop en eraan.\n\n${koppen[0]}\nRuime living met open keuken.\n\n${koppen[1]}\nZonnige tuin op het zuiden.\n\n${koppen[2]}\nVlakbij het centrum en het strand.\n\n${koppen[3]}\n- Bouwjaar 1990\n- Energielabel A\n\n${slotzin}`
}

describe('renderTekstsjabloonPrompt', () => {
  it('rendert de NL-koppen, opening-label en slotzin in de juiste volgorde', () => {
    const prompt = renderTekstsjabloonPrompt(SJABLOON, 'nl')
    expect(prompt).toContain('4SALE!')
    expect(prompt).toContain('WOONCOMFORT, BUITENLEVEN, LOCATIE, GOED OM TE WETEN')
    expect(prompt).toContain(SJABLOON.slotzin)
    expect(prompt).toContain('480 woorden')
    // Sectie-instructies moeten er letterlijk in staan.
    expect(prompt).toContain('Korte bulletpoints die beginnen met "- "')
  })

  it('rendert de EN-koppen en EN opening-label voor taal en', () => {
    const prompt = renderTekstsjabloonPrompt(SJABLOON, 'en')
    expect(prompt).toContain('LIVING COMFORT, OUTDOOR LIVING, LOCATION, GOOD TO KNOW')
    expect(prompt).not.toContain('WOONCOMFORT, BUITENLEVEN')
    // Zonder engels.slotzin: de Nederlandse slotzin laten vertalen, niet letterlijk overnemen.
    expect(prompt).toContain('translation')
  })

  it('gebruikt de Engelse slotzin letterlijk als die is ingesteld', () => {
    const metEn: TekstsjabloonConfig = { ...SJABLOON, engels: { ...SJABLOON.engels!, slotzin: 'Excited about this home? Call us.' } }
    const prompt = renderTekstsjabloonPrompt(metEn, 'en')
    expect(prompt).toContain('LITERALLY and unchanged: "Excited about this home? Call us."')
  })

  it('valt terug op de NL-koppen voor taal en als engels ontbreekt', () => {
    const zonderEngels: TekstsjabloonConfig = { ...SJABLOON, engels: undefined }
    const prompt = renderTekstsjabloonPrompt(zonderEngels, 'en')
    expect(prompt).toContain('WOONCOMFORT, BUITENLEVEN, LOCATIE, GOED OM TE WETEN')
  })

  it('vervangt expliciet de generieke lengte-eis, niet alleen aanvullend', () => {
    const prompt = renderTekstsjabloonPrompt(SJABLOON, 'nl')
    expect(prompt.toLowerCase()).toContain('vervangt')
  })
})

describe('valideerTekstsjabloon', () => {
  it('keurt een correcte tekst goed (NL)', () => {
    const tekst = bouwGeldigeTekst(['WOONCOMFORT', 'BUITENLEVEN', 'LOCATIE', 'GOED OM TE WETEN'], '4SALE!', SJABLOON.slotzin)
    const controle = valideerTekstsjabloon(tekst, SJABLOON, 'nl')
    expect(controle.ok).toBe(true)
    expect(controle.fouten).toHaveLength(0)
  })

  it('keurt een correcte tekst goed (EN)', () => {
    const tekst = bouwGeldigeTekst(['LIVING COMFORT', 'OUTDOOR LIVING', 'LOCATION', 'GOOD TO KNOW'], '4SALE!', SJABLOON.slotzin)
    const controle = valideerTekstsjabloon(tekst, SJABLOON, 'en')
    expect(controle.ok).toBe(true)
  })

  it('signaleert een verkeerde volgorde van koppen', () => {
    // BUITENLEVEN en WOONCOMFORT omgedraaid: de validator zoekt koppen sequentieel
    // (elke volgende kop moet ná de vorige gevonden worden), dus BUITENLEVEN — dat
    // nu vóór WOONCOMFORT staat — wordt niet meer ná WOONCOMFORT gevonden.
    const tekst = bouwGeldigeTekst(['BUITENLEVEN', 'WOONCOMFORT', 'LOCATIE', 'GOED OM TE WETEN'], '4SALE!', SJABLOON.slotzin)
    const controle = valideerTekstsjabloon(tekst, SJABLOON, 'nl')
    expect(controle.ok).toBe(false)
    expect(controle.fouten.some((f) => f.includes('BUITENLEVEN'))).toBe(true)
  })

  it('signaleert een ontbrekende kop', () => {
    const tekst = `4SALE!\nIntro.\n\nWOONCOMFORT\nTekst.\n\nLOCATIE\nTekst.\n\nGOED OM TE WETEN\n- Feit\n\n${SJABLOON.slotzin}`
    const controle = valideerTekstsjabloon(tekst, SJABLOON, 'nl')
    expect(controle.ok).toBe(false)
    expect(controle.fouten.some((f) => f.includes('BUITENLEVEN'))).toBe(true)
  })

  it('signaleert een ontbrekende slotzin', () => {
    const tekst = bouwGeldigeTekst(['WOONCOMFORT', 'BUITENLEVEN', 'LOCATIE', 'GOED OM TE WETEN'], '4SALE!', 'Tot ziens!')
    const controle = valideerTekstsjabloon(tekst, SJABLOON, 'nl')
    expect(controle.ok).toBe(false)
    expect(controle.fouten.some((f) => f.toLowerCase().includes('slotzin'))).toBe(true)
  })

  it('signaleert een ontbrekend opening-label', () => {
    const tekst = `Introzin zonder label.\n\nWOONCOMFORT\nTekst.\n\nBUITENLEVEN\nTekst.\n\nLOCATIE\nTekst.\n\nGOED OM TE WETEN\n- Feit\n\n${SJABLOON.slotzin}`
    const controle = valideerTekstsjabloon(tekst, SJABLOON, 'nl')
    expect(controle.ok).toBe(false)
    expect(controle.fouten.some((f) => f.includes('4SALE!'))).toBe(true)
  })
})

describe('valideerTekstsjabloon — Engelse slotzin', () => {
  const koppenEn = ['LIVING COMFORT', 'OUTDOOR LIVING', 'LOCATION', 'GOOD TO KNOW']
  it('eist geen Nederlandse slotzin in een Engelse tekst zonder engels.slotzin', () => {
    const tekst = bouwGeldigeTekst(koppenEn, '4SALE!', 'Excited about this home? Get in touch.')
    expect(valideerTekstsjabloon(tekst, SJABLOON, 'en').ok).toBe(true)
  })
  it('eist de ingestelde Engelse slotzin letterlijk', () => {
    const metEn: TekstsjabloonConfig = { ...SJABLOON, engels: { ...SJABLOON.engels!, slotzin: 'Call us today.' } }
    expect(valideerTekstsjabloon(bouwGeldigeTekst(koppenEn, '4SALE!', 'Call us today.'), metEn, 'en').ok).toBe(true)
    expect(valideerTekstsjabloon(bouwGeldigeTekst(koppenEn, '4SALE!', 'Bel ons.'), metEn, 'en').ok).toBe(false)
  })
})

describe('bouwSjabloonCorrectie', () => {
  it('bouwt een Nederlandse correctie-instructie met alle fouten', () => {
    const correctie = bouwSjabloonCorrectie(['Kopje "LOCATIE" ontbreekt'], 'nl')
    expect(correctie).toContain('LOCATIE')
    expect(correctie).toContain('Belangrijk')
  })

  it('bouwt een Engelse correctie-instructie', () => {
    const correctie = bouwSjabloonCorrectie(['Heading "LOCATION" is missing'], 'en')
    expect(correctie).toContain('IMPORTANT')
    expect(correctie).toContain('LOCATION')
  })
})
