import { describe, it, expect } from 'vitest'
import { begroetingVoor, datumVoor, uurInNederland, contextregel } from './begroeting'

describe('uurInNederland', () => {
  it('rekent UTC om naar Nederlandse zomertijd (+2)', () => {
    // 10:30 UTC in september = 12:30 in Amsterdam.
    expect(uurInNederland(new Date('2026-09-19T10:30:00Z'))).toBe(12)
  })

  it('rekent UTC om naar Nederlandse wintertijd (+1)', () => {
    expect(uurInNederland(new Date('2026-01-15T10:30:00Z'))).toBe(11)
  })

  it('geeft 0 voor middernacht, niet 24', () => {
    // 22:00 UTC in de zomer = 00:00 in Amsterdam.
    expect(uurInNederland(new Date('2026-07-01T22:00:00Z'))).toBe(0)
  })
})

describe('begroetingVoor', () => {
  it('kiest de begroeting op de Nederlandse klok, niet op die van de server', () => {
    // Dit is precies de fout die /dashboard sloopte: op een UTC-server is het
    // 11 uur ("Goedemorgen"), in Nederland 13 uur ("Goedemiddag").
    expect(begroetingVoor(new Date('2026-09-19T11:00:00Z'))).toBe('Goedemiddag')
  })

  it('dekt alle vier de dagdelen af', () => {
    expect(begroetingVoor(new Date('2026-09-19T01:00:00Z'))).toBe('Goedenacht') // 03:00 NL
    expect(begroetingVoor(new Date('2026-09-19T06:00:00Z'))).toBe('Goedemorgen') // 08:00 NL
    expect(begroetingVoor(new Date('2026-09-19T13:00:00Z'))).toBe('Goedemiddag') // 15:00 NL
    expect(begroetingVoor(new Date('2026-09-19T19:00:00Z'))).toBe('Goedenavond') // 21:00 NL
  })

  it('zet de grenzen op 6, 12 en 18 uur Nederlandse tijd', () => {
    expect(begroetingVoor(new Date('2026-09-19T03:59:00Z'))).toBe('Goedenacht') // 05:59 NL
    expect(begroetingVoor(new Date('2026-09-19T04:00:00Z'))).toBe('Goedemorgen') // 06:00 NL
    expect(begroetingVoor(new Date('2026-09-19T10:00:00Z'))).toBe('Goedemiddag') // 12:00 NL
    expect(begroetingVoor(new Date('2026-09-19T16:00:00Z'))).toBe('Goedenavond') // 18:00 NL
  })
})

describe('datumVoor', () => {
  it('schrijft de dag voluit met een hoofdletter', () => {
    expect(datumVoor(new Date('2026-09-19T10:00:00Z'))).toBe('Zaterdag 19 september')
  })

  it('gebruikt de Nederlandse dag, ook als het in UTC nog gisteren is', () => {
    // 23:30 UTC op 18 sep = 01:30 NL op 19 sep.
    expect(datumVoor(new Date('2026-09-18T23:30:00Z'))).toBe('Zaterdag 19 september')
  })
})

describe('contextregel', () => {
  it('noemt eerst wat aandacht vraagt', () => {
    expect(contextregel({ wachtOpContent: 2, inVerkoop: 5, verkoopadviezen: 3 })).toBe('2 dossiers wachten op content')
  })

  it('vervoegt enkelvoud correct', () => {
    expect(contextregel({ wachtOpContent: 1, inVerkoop: 0, verkoopadviezen: 0 })).toBe('1 dossier wacht op content')
    expect(contextregel({ wachtOpContent: 0, inVerkoop: 1, verkoopadviezen: 0 })).toBe('1 woning in verkoop')
    expect(contextregel({ wachtOpContent: 0, inVerkoop: 0, verkoopadviezen: 1 })).toBe('1 lopend verkoopadvies')
  })

  it('valt terug op de volgende laag als er niets wacht', () => {
    expect(contextregel({ wachtOpContent: 0, inVerkoop: 4, verkoopadviezen: 2 })).toBe('4 woningen in verkoop')
    expect(contextregel({ wachtOpContent: 0, inVerkoop: 0, verkoopadviezen: 2 })).toBe('2 lopende verkoopadviezen')
  })

  it('zegt eerlijk dat er niets loopt in plaats van een lege regel', () => {
    expect(contextregel({ wachtOpContent: 0, inVerkoop: 0, verkoopadviezen: 0 })).toBe('Nog geen lopende dossiers')
  })
})
