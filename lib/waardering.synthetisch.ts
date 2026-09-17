/**
 * Synthetische regionale transactiedataset met bekende grondwaarheid, voor de
 * backtest van de waarderingskern (waardering.backtest.test.ts) en herbruikbaar
 * als basis voor de demo-fixture (roadmap item 2.3: zelfde generator, dan met
 * echte straatnamen/wijken en `eigen_verkoop` voor i4 Housing).
 *
 * prijs = basis(plaats) × ligging (afstand tot centrum) × typegroep × grootte
 * × bouwjaar × garage/tuin/energielabel × tijdindex(kwartaal) × lognormale
 * ruis (σ standaard 7 %). Deterministisch via seed (mulberry32).
 */
import type { Kandidaat, Typegroep } from './waardering'
import { kwartaalNummer, kwartaalUitNummer } from './prijsindex'

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-12)
  const v = rnd()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

type Plaats = { naam: string; lat: number; lng: number; basisM2: number; spreiding: number }
export const PLAATSEN: Plaats[] = [
  { naam: 'Wassenaar', lat: 52.1425, lng: 4.403, basisM2: 6100, spreiding: 0.008 },
  { naam: 'Voorschoten', lat: 52.128, lng: 4.45, basisM2: 5000, spreiding: 0.006 },
  { naam: 'Leidschendam', lat: 52.09, lng: 4.4, basisM2: 4600, spreiding: 0.007 },
  { naam: 'Den Haag', lat: 52.098, lng: 4.32, basisM2: 6800, spreiding: 0.007 },
  { naam: 'Oegstgeest', lat: 52.185, lng: 4.47, basisM2: 5300, spreiding: 0.006 },
]
export const TYPEN: { groep: Typegroep; kans: number; mult: number; oppGem: number; oppSd: number; bjMin: number; bjMax: number }[] = [
  { groep: 'appartement', kans: 0.3, mult: 0.95, oppGem: 85, oppSd: 22, bjMin: 1930, bjMax: 2022 },
  { groep: 'rijwoning', kans: 0.35, mult: 1.0, oppGem: 125, oppSd: 25, bjMin: 1920, bjMax: 2018 },
  { groep: 'halfvrijstaand', kans: 0.2, mult: 1.08, oppGem: 150, oppSd: 28, bjMin: 1930, bjMax: 2018 },
  { groep: 'vrijstaand', kans: 0.15, mult: 1.22, oppGem: 220, oppSd: 55, bjMin: 1900, bjMax: 2022 },
]
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const START = kwartaalNummer('2021-Q1')
const EIND = kwartaalNummer('2026-Q3')

/** Bekende tijdindex: +1,1 % per kwartaal met een dip rond 2023-Q2. */
export function tijdindex(kwartaalNr: number): number {
  const q = kwartaalNr - START
  return 100 * Math.pow(1.011, q) * (1 - 0.05 * Math.exp(-Math.pow((q - 9) / 2, 2)))
}

export type SynthetischeTransactie = Kandidaat & { lat: number; lng: number; verkoopprijs: number; woonoppervlak_m2: number; bouwjaar: number; verkoopdatum: string; kwartaalNr: number }

export function genereerSynthetisch(opties: { seed?: number; perKwartaal?: number; ruis?: number } = {}): SynthetischeTransactie[] {
  const rnd = mulberry32(opties.seed ?? 20260917)
  const perKwartaal = opties.perKwartaal ?? 90
  const ruis = opties.ruis ?? 0.07
  const uit: SynthetischeTransactie[] = []
  let id = 1
  for (let q = START; q <= EIND; q++) {
    const kw = kwartaalUitNummer(q)
    const jaar = Number(kw.slice(0, 4))
    const maand0 = (Number(kw.slice(-1)) - 1) * 3
    for (let i = 0; i < perKwartaal; i++) {
      const plaats = PLAATSEN[Math.floor(rnd() * PLAATSEN.length)]
      let r = rnd()
      let type = TYPEN[TYPEN.length - 1]
      for (const t of TYPEN) {
        if (r < t.kans) { type = t; break }
        r -= t.kans
      }
      const lat = plaats.lat + gauss(rnd) * plaats.spreiding
      const lng = plaats.lng + gauss(rnd) * plaats.spreiding * 1.6
      const afstandCentrum = Math.hypot((lat - plaats.lat) * 111000, (lng - plaats.lng) * 68000)
      const ligging = 1 + 0.06 * (1 - Math.min(afstandCentrum / 1500, 1))
      const opp = Math.max(40, Math.round(type.oppGem + gauss(rnd) * type.oppSd))
      const bouwjaar = Math.round(type.bjMin + rnd() * (type.bjMax - type.bjMin))
      const garage = rnd() < (type.groep === 'appartement' ? 0.1 : 0.45)
      const tuin = type.groep === 'appartement' ? rnd() < 0.3 : rnd() < 0.9
      const label = LABELS[Math.min(6, Math.floor(Math.abs(gauss(rnd)) * 1.6 + (bouwjaar > 2000 ? 0 : 1.5)))]
      const labelMult = label <= 'B' ? 1.05 : label <= 'D' ? 1 : 0.94
      const grootte = 1 - 0.0012 * (opp - type.oppGem)
      const leeftijd = 1 + 0.002 * Math.max(-40, Math.min(40, bouwjaar - 1980))
      const m2 =
        plaats.basisM2 * ligging * type.mult * grootte * leeftijd * (garage ? 1.04 : 1) * (tuin ? 1.03 : 1) * labelMult *
        (tijdindex(q) / 100) * Math.exp(gauss(rnd) * ruis)
      const dag = 1 + Math.floor(rnd() * 28)
      const maand = maand0 + Math.floor(rnd() * 3)
      const verkoopdatum = `${jaar}-${String(maand + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
      uit.push({
        id: `s${id++}`,
        adres: `${plaats.naam}straat ${id}`,
        plaats: plaats.naam,
        woningtype_groep: type.groep,
        verkoopprijs: Math.round((m2 * opp) / 1000) * 1000,
        woonoppervlak_m2: opp,
        bouwjaar,
        verkoopdatum,
        lat,
        lng,
        garage,
        tuin,
        energielabel: label,
        verkopend_kantoor: rnd() < 0.12 ? 'i4 Housing' : `Kantoor ${1 + Math.floor(rnd() * 12)}`,
        kwartaalNr: q,
      })
    }
  }
  return uit
}
