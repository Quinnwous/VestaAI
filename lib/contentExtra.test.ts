import { describe, it, expect } from 'vitest'
import { EXTRA_TYPES, isExtraType, bouwExtraPrompt, schrijftoonLabel, EXTRA_MAX_TOKENS, type ExtraType, behoudExtras } from './contentExtra'
import type { PropertyInput } from './schemas'

const inputBasis: PropertyInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype_groep: 'appartement',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C',
  vraagprijs: 450000,
  usps: 'Prachtig uitzicht, gerenoveerde keuken',
  doelgroep: 'Jonge gezinnen',
}

describe('isExtraType', () => {
  it('herkent elk type uit EXTRA_TYPES', () => {
    for (const type of EXTRA_TYPES) {
      expect(isExtraType(type)).toBe(true)
    }
  })

  it('wijst onbekende of kern-veldnamen af', () => {
    expect(isExtraType('funda_tekst')).toBe(false)
    expect(isExtraType('marktanalyse')).toBe(false)
    expect(isExtraType('')).toBe(false)
    expect(isExtraType('open-huis')).toBe(false) // koppelteken i.p.v. underscore
  })
})

describe('bouwExtraPrompt', () => {
  it('bevat de woninggegevens en geen JSON-instructie', () => {
    const prompt = bouwExtraPrompt('open_huis', inputBasis)
    expect(prompt).toContain(inputBasis.adres)
    expect(prompt).toContain('85 m²')
    expect(prompt).toContain('1920')
    expect(prompt).toContain('C')
    expect(prompt.toLowerCase()).toContain('geen json')
  })

  it('neemt de open-huis-datum mee als die is opgegeven', () => {
    const metOpenHuis: PropertyInput = { ...inputBasis, open_huis_datum: '2026-10-04', open_huis_tijd: '14:00' }
    const prompt = bouwExtraPrompt('open_huis', metOpenHuis)
    expect(prompt).toContain('2026-10-04')
    expect(prompt).toContain('14:00')
  })

  it('laat de open-huis-regel weg zonder datum', () => {
    const prompt = bouwExtraPrompt('open_huis', inputBasis)
    expect(prompt).not.toContain('Open huis:')
  })

  it('geeft elk extra-type een eigen, herkenbare instructie', () => {
    const prompts = Object.fromEntries(EXTRA_TYPES.map(t => [t, bouwExtraPrompt(t, inputBasis)])) as Record<ExtraType, string>
    expect(prompts.followup_positief).toContain('geïnteresseerde koper')
    expect(prompts.followup_negatief).toContain('niet-geïnteresseerde koper')
    expect(prompts.kopersvragen_faq).toContain('V: [vraag]')
    expect(prompts.energie_advies).toContain('subsidies')
    expect(prompts.video_script).toContain('60 seconden')
    expect(prompts.open_huis).toContain('open huis-aankondiging')
  })

  it('voegt de schrijftoon toe als die is meegegeven', () => {
    const prompt = bouwExtraPrompt('video_script', inputBasis, 'Enthousiast en uitnodigend')
    expect(prompt).toContain('Schrijftoon van het kantoor: Enthousiast en uitnodigend')
  })

  it('laat de toonregel weg zonder huisstijl', () => {
    const prompt = bouwExtraPrompt('video_script', inputBasis)
    expect(prompt).not.toContain('Schrijftoon van het kantoor')
  })
})

describe('schrijftoonLabel', () => {
  it('vertaalt elke schrijftoon naar een leesbaar label', () => {
    expect(schrijftoonLabel('formeel')).toBe('Formeel en professioneel')
    expect(schrijftoonLabel('informeel')).toBe('Informeel en toegankelijk')
    expect(schrijftoonLabel('enthousiast')).toBe('Enthousiast en uitnodigend')
  })

  it('geeft undefined terug zonder schrijftoon', () => {
    expect(schrijftoonLabel(undefined)).toBeUndefined()
  })
})

describe('EXTRA_MAX_TOKENS', () => {
  it('heeft voor elk extra-type een positief max_tokens', () => {
    for (const type of EXTRA_TYPES) {
      expect(EXTRA_MAX_TOKENS[type]).toBeGreaterThan(0)
    }
  })
})

describe('behoudExtras', () => {
  it('houdt eerder gegenereerde extra\'s bij een nieuwe kern', () => {
    const r = behoudExtras({ funda_tekst: 'oud', open_huis: 'Open huis zaterdag' }, { funda_tekst: 'nieuw', open_huis: '' })
    expect(r).toEqual({ funda_tekst: 'nieuw', open_huis: 'Open huis zaterdag' })
  })
  it('overschrijft een extra niet als de nieuwe output er zelf een heeft', () => {
    expect(behoudExtras({ open_huis: 'oud' }, { open_huis: 'nieuw' }).open_huis).toBe('nieuw')
  })
  it('laat kernvelden en lege oude waarden met rust', () => {
    expect(behoudExtras({ funda_tekst: 'oud', video_script: '' }, { funda_tekst: 'nieuw' })).toEqual({ funda_tekst: 'nieuw' })
    expect(behoudExtras(null, { funda_tekst: 'x' })).toEqual({ funda_tekst: 'x' })
  })
})
