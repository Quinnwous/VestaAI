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
import { adresSleutel, woningtypeGroep, woningtypeSub } from './transactieNormalisatie'

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

// ── Demo-fixture uitbreiding (item 2.3, docs/roadmap.md § Fase 2) ──────────
// Zelfde rekenhart als hierboven (mulberry32/gauss/prijsmodel-opbouw), nu met
// echte buurten/straten in het i4housing-werkgebied, fictieve concurrerende
// kantoren en `eigen_verkoop` — bewust geen tweede generator, alleen meer
// data en een aparte tijdreeks (2019-Q1 t/m nu i.p.v. de backtest-reeks
// hierboven, die START/EIND en TYPEN blijft gebruiken en dus ongewijzigd
// blijft — `lib/waardering.backtest.test.ts` roept `genereerSynthetisch()`
// zonder opties aan). Gebruikt `lib/transactieNormalisatie.ts`
// (`adresSleutel`/`woningtypeGroep`/`woningtypeSub`) zodat de fixture exact
// dezelfde waarden produceert als een echte CSV-import.

export type DemoRegio = 'wassenaar' | 'den_haag' | 'overig'

export type DemoBuurt = {
  naam: string
  plaats: string
  regio: DemoRegio
  /** Buurtcentroïde — echte coördinaten (geen verzonnen punten buiten het werkgebied). */
  lat: number
  lng: number
  /** Kans binnen de volledige fixture-verdeling; som van alle buurten = 1. */
  kans: number
  basisM2: number
  spreiding: number
  straten: string[]
}

/**
 * 12 buurtcentroïden, verdeling Wassenaar 35 % · Den Haag (Benoordenhout,
 * Statenkwartier, Archipelbuurt, Mariahoeve) 40 % · Voorschoten/Leidschendam/
 * Rijswijk 25 % (roadmap-spec). `basisM2` ligt lager in de meer stedelijke,
 * appartement-rijke buurten (Mariahoeve, Rijswijk) en hoger in de villawijken
 * (Wassenaar-duinzone) — getuned zodat de dry-run-medianen realistisch uitkomen
 * (Wassenaar vrijstaand € 1,2-3,5 mln; Den Haag appartement € 300-700 k).
 */
export const DEMO_BUURTEN: DemoBuurt[] = [
  // Wassenaar — 35 %
  { naam: 'Kerkehout', plaats: 'Wassenaar', regio: 'wassenaar', lat: 52.1462, lng: 4.4045, kans: 0.09, basisM2: 6200, spreiding: 0.005, straten: ['Kerkehoutlaan', 'Rust en Vreugdlaan', 'Van Zuylen van Nijeveltstraat'] },
  { naam: 'Deijlerweg', plaats: 'Wassenaar', regio: 'wassenaar', lat: 52.1360, lng: 4.3850, kans: 0.09, basisM2: 6600, spreiding: 0.005, straten: ['Deijlerweg', 'Groot Haesebroekseweg', 'Katwijkseweg'] },
  { naam: 'Duinzoom', plaats: 'Wassenaar', regio: 'wassenaar', lat: 52.1530, lng: 4.3720, kans: 0.09, basisM2: 7100, spreiding: 0.004, straten: ["Storm van 's-Gravesandeweg", 'Wassenaarseslag', 'Duinweg'] },
  { naam: 'Centrum', plaats: 'Wassenaar', regio: 'wassenaar', lat: 52.1417, lng: 4.4020, kans: 0.08, basisM2: 5800, spreiding: 0.004, straten: ['Langstraat', 'Hofcamplaan', 'Stoeplaan'] },
  // Den Haag — 40 %
  { naam: 'Benoordenhout', plaats: "'s-Gravenhage", regio: 'den_haag', lat: 52.0989, lng: 4.3242, kans: 0.11, basisM2: 6100, spreiding: 0.005, straten: ['Van Alkemadelaan', 'Benoordenhoutseweg', 'Reigersbergenweg'] },
  { naam: 'Statenkwartier', plaats: "'s-Gravenhage", regio: 'den_haag', lat: 52.0980, lng: 4.2870, kans: 0.11, basisM2: 5600, spreiding: 0.004, straten: ['Statenlaan', 'Nassaulaan', 'Anna Paulownastraat'] },
  { naam: 'Archipelbuurt', plaats: "'s-Gravenhage", regio: 'den_haag', lat: 52.0868, lng: 4.3010, kans: 0.09, basisM2: 5900, spreiding: 0.003, straten: ['Bankastraat', 'Sumatrastraat', 'Timorstraat'] },
  { naam: 'Mariahoeve', plaats: "'s-Gravenhage", regio: 'den_haag', lat: 52.0891, lng: 4.3480, kans: 0.09, basisM2: 3500, spreiding: 0.005, straten: ['Beresteinlaan', 'Melis Stokelaan', 'Erasmusweg'] },
  // Voorschoten / Leidschendam / Rijswijk — 25 %
  { naam: 'Adegeest', plaats: 'Voorschoten', regio: 'overig', lat: 52.1247, lng: 4.4476, kans: 0.09, basisM2: 4700, spreiding: 0.005, straten: ['Leidseweg', 'Veurseweg', 'Rembrandtlaan'] },
  { naam: 'Leidschendam Centrum', plaats: 'Leidschendam', regio: 'overig', lat: 52.0844, lng: 4.4005, kans: 0.08, basisM2: 4100, spreiding: 0.005, straten: ['Damlaan', 'Sluiskant', 'Prins Bernhardlaan'] },
  { naam: 'Duivenvoorde', plaats: 'Leidschendam', regio: 'overig', lat: 52.0960, lng: 4.3980, kans: 0.04, basisM2: 4400, spreiding: 0.004, straten: ['Vlietweg', 'Overgoo', 'Klein Amerika'] },
  { naam: 'Te Werve', plaats: 'Rijswijk', regio: 'overig', lat: 52.0392, lng: 4.3378, kans: 0.04, basisM2: 3700, spreiding: 0.005, straten: ['Haagweg', 'Van Vredenburchweg', 'Generaal Spoorlaan'] },
]

/** Typeverdeling per regio (Wassenaar: 55 % vrijstaand/halfvrijstaand, spec-eis). */
const DEMO_TYPEMIX: Record<DemoRegio, { groep: Typegroep; kans: number }[]> = {
  wassenaar: [
    { groep: 'vrijstaand', kans: 0.3 },
    { groep: 'halfvrijstaand', kans: 0.25 },
    { groep: 'rijwoning', kans: 0.3 },
    { groep: 'appartement', kans: 0.15 },
  ],
  den_haag: [
    { groep: 'appartement', kans: 0.45 },
    { groep: 'rijwoning', kans: 0.35 },
    { groep: 'halfvrijstaand', kans: 0.12 },
    { groep: 'vrijstaand', kans: 0.08 },
  ],
  overig: [
    { groep: 'rijwoning', kans: 0.4 },
    { groep: 'halfvrijstaand', kans: 0.25 },
    { groep: 'appartement', kans: 0.2 },
    { groep: 'vrijstaand', kans: 0.15 },
  ],
}

/**
 * Ruwe brontaal-labels per groep, exact zoals `MAPPING` in
 * lib/transactieNormalisatie.ts ze kent — een willekeurige keuze hieruit gaat
 * door `woningtypeGroep()`/`woningtypeSub()` zodat groep én subtype altijd
 * exact overeenkomen met wat een echte import zou opleveren.
 */
const RUWE_WAARDEN: Record<Typegroep, string[]> = {
  appartement: ['appartement', 'bovenwoning', 'benedenwoning', 'maisonnette', 'portiekflat', 'galerijflat', 'penthouse', 'studio'],
  rijwoning: ['tussenwoning', 'hoekwoning', 'eindwoning', 'geschakelde woning', 'herenhuis', 'eengezinswoning'],
  halfvrijstaand: ['twee onder een kap', 'geschakelde twee onder een kap', 'halfvrijstaande woning'],
  vrijstaand: ['vrijstaande woning', 'villa', 'landhuis', 'bungalow'],
}

const LABELS_DEMO = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

/** 10 fictieve kantoren, marktaandeel 3-18 % (som = 100 %). "Demo Makelaardij"
 * is het kantoor van de fixture zelf: elke rij die het "wint" krijgt
 * `eigen_verkoop = true` (± 12 %, ≈150/jaar — komt zo op hetzelfde uit als
 * het aandeel van 12 % hieronder). */
export const DEMO_KANTOREN: { naam: string; kans: number }[] = [
  { naam: 'Demo Makelaardij', kans: 0.145 },
  { naam: 'Wassenaar Makelaars', kans: 0.175 },
  { naam: 'Haags Makelaarshuis', kans: 0.145 },
  { naam: 'Voorschoten Wonen', kans: 0.125 },
  { naam: 'Rijswijk Vastgoed', kans: 0.105 },
  { naam: 'Leidschendam Makelaardij', kans: 0.085 },
  { naam: 'Benoordenhout Makelaars', kans: 0.075 },
  { naam: 'Statenkwartier Woningen', kans: 0.06 },
  { naam: 'Residentie Makelaars', kans: 0.05 },
  { naam: 'Duinstreek Makelaardij', kans: 0.035 },
]
export const DEMO_KANTOOR_NAAM = 'Demo Makelaardij'

const UITSLUITINGSREDENEN = [
  'familietransactie — prijs niet marktconform',
  'dubbele registratie in bronbestand',
  'verkoop onder voorbehoud alsnog ontbonden',
  'woning verhuurd opgeleverd, geen vrije verkoop',
]

/** Lowercase, diakrietloos, enkele spaties — zelfde stijl als `normaliseerDeel` in transactieNormalisatie.ts. */
export function normaliseerKantoornaam(naam: string): string {
  return naam
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function kiesGewogen<T extends { kans: number }>(rnd: () => number, lijst: T[]): T {
  let r = rnd()
  for (const item of lijst) {
    if (r < item.kans) return item
    r -= item.kans
  }
  return lijst[lijst.length - 1]
}

const DEMO_START = kwartaalNummer('2019-Q1')

/** Bekende tijdindex voor de demo-fixture: +4 %/jaar samengesteld, met een dip
 * rond 2022-Q4–2023-Q2 (spec). Losse functie van `tijdindex()` hierboven,
 * die zijn eigen START/reeks behoudt voor de backtest. */
export function tijdindexDemo(kwartaalNr: number): number {
  const q = kwartaalNr - DEMO_START
  const groeiPerKwartaal = Math.pow(1.04, 0.25)
  return 100 * Math.pow(groeiPerKwartaal, q) * (1 - 0.06 * Math.exp(-Math.pow((q - 16) / 2, 2)))
}

export type DemoTransactie = {
  straat: string
  huisnummer: number
  toevoeging: string | null
  plaats: string
  wijk: string | null
  buurt: string | null
  lat: number
  lng: number
  adres_sleutel: string | null
  woningtype_groep: Typegroep
  woningtype_sub: string | null
  verkoopprijs: number
  vraagprijs: number
  woonoppervlak_m2: number
  bouwjaar: number
  garage: boolean
  tuin: boolean
  energielabel: string
  verkoopdatum: string
  looptijd_dagen: number
  verkopend_kantoor: string
  verkopend_kantoor_norm: string
  eigen_verkoop: boolean
  geocode_status: 'exact'
  uitgesloten_reden: string | null
  bron: 'fixture'
  kwartaalNr: number
}

/**
 * De demo-fixture-dataset (item 2.3): ~8.000 transacties 2019-Q1 t/m
 * `opties.totKwartaal` (standaard 2026-Q3 = "nu"). Deterministisch via seed.
 */
export function genereerDemoTransacties(opties: { seed?: number; totaal?: number; totKwartaal?: string; totDatum?: string } = {}): DemoTransactie[] {
  const rnd = mulberry32(opties.seed ?? 20260917)
  // Vaste peildatum (niet "vandaag") houdt de fixture deterministisch; nooit verkopen in de toekomst.
  const totDatum = opties.totDatum ?? '2026-09-17'
  const eindKwartaal = kwartaalNummer(opties.totKwartaal ?? '2026-Q3')
  const aantalKwartalen = eindKwartaal - DEMO_START + 1
  const totaal = opties.totaal ?? 8000
  const perKwartaal = Math.max(1, Math.round(totaal / aantalKwartalen))
  const uit: DemoTransactie[] = []

  for (let q = DEMO_START; q <= eindKwartaal; q++) {
    const kw = kwartaalUitNummer(q)
    const jaar = Number(kw.slice(0, 4))
    const maand0 = (Number(kw.slice(-1)) - 1) * 3

    for (let i = 0; i < perKwartaal; i++) {
      const buurt = kiesGewogen(rnd, DEMO_BUURTEN)
      const gekozenType = kiesGewogen(rnd, DEMO_TYPEMIX[buurt.regio])
      const ruweWaarden = RUWE_WAARDEN[gekozenType.groep]
      const ruw = ruweWaarden[Math.floor(rnd() * ruweWaarden.length)]
      const groep = woningtypeGroep(ruw) ?? gekozenType.groep
      const sub = woningtypeSub(ruw)
      const type = TYPEN.find(t => t.groep === groep) ?? TYPEN[0]

      const lat = buurt.lat + gauss(rnd) * buurt.spreiding
      const lng = buurt.lng + gauss(rnd) * buurt.spreiding * 1.5
      const afstandCentrum = Math.hypot((lat - buurt.lat) * 111000, (lng - buurt.lng) * 68000)
      const ligging = 1 + 0.05 * (1 - Math.min(afstandCentrum / 1200, 1))

      const opp = Math.max(35, Math.round(type.oppGem + gauss(rnd) * type.oppSd))
      const bouwjaar = Math.round(type.bjMin + rnd() * (type.bjMax - type.bjMin))
      const garage = rnd() < (groep === 'appartement' ? 0.12 : 0.5)
      const tuin = groep === 'appartement' ? rnd() < 0.25 : rnd() < 0.88
      const label = LABELS_DEMO[Math.min(6, Math.floor(Math.abs(gauss(rnd)) * 1.6 + (bouwjaar > 2000 ? 0 : 1.5)))]
      const labelMult = label <= 'B' ? 1.05 : label <= 'D' ? 1 : 0.94
      const grootte = 1 - 0.0012 * (opp - type.oppGem)
      const leeftijd = 1 + 0.002 * Math.max(-40, Math.min(40, bouwjaar - 1980))
      const m2prijs =
        buurt.basisM2 * ligging * type.mult * grootte * leeftijd * (garage ? 1.04 : 1) * (tuin ? 1.03 : 1) * labelMult *
        (tijdindexDemo(q) / 100) * Math.exp(gauss(rnd) * 0.07)
      const verkoopprijs = Math.max(75000, Math.round((m2prijs * opp) / 1000) * 1000)
      const vraagprijsFactor = 1 + (rnd() - 0.3) * 0.06
      const vraagprijs = Math.max(75000, Math.round((verkoopprijs * vraagprijsFactor) / 1000) * 1000)

      const dag = 1 + Math.floor(rnd() * 28)
      const maand = maand0 + Math.floor(rnd() * 3)
      let verkoopdatum = `${jaar}-${String(maand + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
      if (verkoopdatum > totDatum) {
        // Geen extra rnd()-aanroep: de rest van de reeks blijft identiek.
        verkoopdatum = `${totDatum.slice(0, 8)}${String(1 + ((dag - 1) % Number(totDatum.slice(8)))).padStart(2, '0')}`
      }
      const looptijd_dagen = 20 + Math.floor(rnd() * 71)

      const straat = buurt.straten[Math.floor(rnd() * buurt.straten.length)]
      const huisnummer = 1 + Math.floor(rnd() * 180)

      const kantoor = kiesGewogen(rnd, DEMO_KANTOREN)
      const eigen_verkoop = kantoor.naam === DEMO_KANTOOR_NAAM

      const uitgesloten = rnd() < 0.02
      const uitgesloten_reden = uitgesloten ? UITSLUITINGSREDENEN[Math.floor(rnd() * UITSLUITINGSREDENEN.length)] : null

      uit.push({
        straat,
        huisnummer,
        toevoeging: null,
        plaats: buurt.plaats,
        wijk: buurt.naam,
        buurt: null,
        lat,
        lng,
        adres_sleutel: adresSleutel({ straat, huisnummer, plaats: buurt.plaats }),
        woningtype_groep: groep,
        woningtype_sub: sub,
        verkoopprijs,
        vraagprijs,
        woonoppervlak_m2: opp,
        bouwjaar,
        garage,
        tuin,
        energielabel: label,
        verkoopdatum,
        looptijd_dagen,
        verkopend_kantoor: kantoor.naam,
        verkopend_kantoor_norm: normaliseerKantoornaam(kantoor.naam),
        eigen_verkoop,
        geocode_status: 'exact',
        uitgesloten_reden,
        bron: 'fixture',
        kwartaalNr: q,
      })
    }
  }
  return uit
}
